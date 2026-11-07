import { ProjectActionComponentProps } from '@ds-wizard/plugin-sdk/elements'
import { Alert } from '@ds-wizard/plugin-sdk/ui/Alert'
import { AsyncBlock } from '@ds-wizard/plugin-sdk/ui/AsyncBlock'
import { DescriptionList } from '@ds-wizard/plugin-sdk/ui/DescriptionList'
import { FieldGroup, TextField } from '@ds-wizard/plugin-sdk/ui/Field'
import { Inline, Stack } from '@ds-wizard/plugin-sdk/ui/Layout'
import { ActionLink, Link } from '@ds-wizard/plugin-sdk/ui/Link'
import { List, ListItem } from '@ds-wizard/plugin-sdk/ui/ListItem'
import { Body, Code, Muted } from '@ds-wizard/plugin-sdk/ui/Text'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import type { ModalAction } from '@/components/ProjectActionModal'
import { ProjectActionModal } from '@/components/ProjectActionModal'
import { SettingsData } from '@/data/settings-data'

import { PrepareResponse, SubmittedVersion } from './fip-version-project-action/data'
import {
    prepareProjectAction,
    saveVersion,
    submitVersion,
} from './fip-version-project-action/requests'

type View = 'preparing' | 'ready' | 'saving' | 'submitting' | 'done' | 'error'
type VersionParts = { major: string; minor: string; patch: string }
type VersionPartName = keyof VersionParts

const DEFAULT_FORM_VERSION: [number, number, number] = [0, 1, 0]
const EMPTY_DESCRIPTION = ''
const VERSION_PART_STYLE: CSSProperties = { width: '6rem' }
const DEFAULT_SUGGESTIONS = {
    major: '1.0.0',
    minor: '0.1.0',
    patch: '0.0.1',
}

export default function FIPVersionProjectAction({
    settings,
    project,
    onActionClose,
}: ProjectActionComponentProps<SettingsData, null>) {
    const [view, setView] = useState<View>('preparing')
    const [reloadKey, setReloadKey] = useState(0)
    const [prepareData, setPrepareData] = useState<PrepareResponse | null>(null)
    const [versionParts, setVersionParts] = useState<VersionParts>(
        semverToParts(DEFAULT_FORM_VERSION),
    )
    const [errorMessage, setErrorMessage] = useState('')
    const [doneMessage, setDoneMessage] = useState<ReactNode>(null)

    useEffect(() => {
        async function runPrepare() {
            if (!project) {
                setErrorMessage('Project data are not available for this action.')
                setView('error')
                return
            }

            setView('preparing')
            setErrorMessage('')

            try {
                const response = await prepareProjectAction(project)
                if (!response.ok) {
                    setErrorMessage(
                        response.message || 'Failed to load project version information.',
                    )
                    setView('error')
                    return
                }

                const workingVersion =
                    parseSemver(response.questionnaireVersion) || DEFAULT_FORM_VERSION
                setPrepareData(response)
                setVersionParts(semverToParts(workingVersion))
                setView('ready')
            } catch (error) {
                setErrorMessage(
                    getErrorMessage(error, 'Failed to load project version information.'),
                )
                setView('error')
            }
        }

        void runPrepare()
    }, [project, reloadKey])

    const latestSubmittedVersion = computeLatest(prepareData?.submittedVersions || [])
    const suggestions = computeSuggestions(prepareData?.questionnaireVersion)
    const parsedDesiredVersion = parseSemverParts(versionParts)
    const desiredVersion = parsedDesiredVersion
        ? parsedDesiredVersion.join('.')
        : formatVersionParts(versionParts)
    const parsedLatestSubmittedVersion = parseSemver(latestSubmittedVersion)
    const isVersionHigherThanLatest =
        !parsedLatestSubmittedVersion ||
        (parsedDesiredVersion !== null &&
            compareSemver(parsedDesiredVersion, parsedLatestSubmittedVersion) > 0)
    const isVersionValid = parsedDesiredVersion !== null
    const canSaveOrSubmit = view === 'ready' && isVersionValid && isVersionHigherThanLatest

    async function handleSave() {
        if (!project || !canSaveOrSubmit) {
            return
        }

        setView('saving')
        setErrorMessage('')

        try {
            const response = await saveVersion(
                project,
                desiredVersion,
                EMPTY_DESCRIPTION,
                settings.submissionServiceId,
            )
            if (!response.ok) {
                setErrorMessage(response.message || 'Failed to save the version.')
                setView('error')
                return
            }

            setDoneMessage(
                <>
                    Version <strong>{desiredVersion}</strong> has been saved successfully.
                </>,
            )
            setView('done')
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to save the version.'))
            setView('error')
        }
    }

    async function handleSubmit() {
        if (!project || !canSaveOrSubmit) {
            return
        }

        setView('submitting')
        setErrorMessage('')

        try {
            const response = await submitVersion(
                project,
                desiredVersion,
                EMPTY_DESCRIPTION,
                settings.submissionServiceId,
            )
            if (!response.ok) {
                setErrorMessage(response.message || 'Failed to submit the nanopublication.')
                setView('error')
                return
            }

            if (response.submissionDone) {
                setDoneMessage(
                    response.submissionLocation ? (
                        <>
                            Version <strong>{desiredVersion}</strong> has been submitted
                            successfully. Nanopublication:{' '}
                            <Link href={response.submissionLocation} external>
                                {response.submissionLocation}
                            </Link>
                        </>
                    ) : (
                        <>
                            Version <strong>{desiredVersion}</strong> has been submitted
                            successfully.
                        </>
                    ),
                )
                setView('done')
                return
            }

            if (response.documentDone) {
                setDoneMessage(
                    <>
                        Version <strong>{desiredVersion}</strong> was saved and the RDF document was
                        generated, but submission was not completed. Check the Documents tab for
                        details.
                    </>,
                )
                setView('done')
                return
            }

            setDoneMessage(
                <>
                    Version <strong>{desiredVersion}</strong> was saved, but document generation or
                    submission did not complete. Check the Documents tab for details.
                </>,
            )
            setView('done')
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to submit the nanopublication.'))
            setView('error')
        }
    }

    let modalBody
    let modalAction: ModalAction | undefined = {
        label: 'Submit Nanopub',
        icon: 'fa-paper-plane',
        disabled: !canSaveOrSubmit,
        onClick: () => void handleSubmit(),
    }
    let modalSecondaryActions: ModalAction[] = [
        {
            label: 'Save Version',
            icon: 'fa-floppy-disk',
            disabled: !canSaveOrSubmit,
            onClick: () => void handleSave(),
        },
    ]

    if (view === 'preparing') {
        modalBody = <AsyncBlock loading />
        modalAction = { ...modalAction, disabled: true }
        modalSecondaryActions = [{ ...modalSecondaryActions[0]!, disabled: true }]
    } else if (view === 'saving') {
        modalBody = <AsyncBlock loading loadingLabel="Saving version, please wait…" />
        modalAction = { ...modalAction, disabled: true }
        modalSecondaryActions = [{ ...modalSecondaryActions[0]!, disabled: true, loading: true }]
    } else if (view === 'submitting') {
        modalBody = (
            <AsyncBlock
                loading
                loadingLabel="Saving version, generating RDF document and submitting it, please wait…"
            />
        )
        modalAction = { ...modalAction, disabled: true, loading: true }
        modalSecondaryActions = [{ ...modalSecondaryActions[0]!, disabled: true }]
    } else if (view === 'done') {
        modalBody = <Alert tone="success">{doneMessage}</Alert>
        modalAction = undefined
        modalSecondaryActions = []
    } else if (view === 'error') {
        modalBody = <Alert tone="danger">{errorMessage}</Alert>
        modalAction = {
            label: 'Retry',
            icon: 'fa-rotate-right',
            onClick: () => {
                setPrepareData(null)
                setDoneMessage(null)
                setErrorMessage('')
                setView('preparing')
                setReloadKey((current) => current + 1)
            },
        }
        modalSecondaryActions = []
    } else {
        modalBody = (
            <ReadyStateBody
                questionnaireVersion={prepareData?.questionnaireVersion}
                latestSubmittedVersion={latestSubmittedVersion}
                versionParts={versionParts}
                suggestions={suggestions}
                isVersionValid={isVersionValid}
                isVersionHigherThanLatest={isVersionHigherThanLatest}
                onSuggestionClick={(suggestedVersion) => {
                    const suggestedParts = parseSemver(suggestedVersion)
                    if (suggestedParts) {
                        setVersionParts(semverToParts(suggestedParts))
                    }
                }}
                onVersionPartChange={(part, value) => {
                    setVersionParts((current) => ({
                        ...current,
                        [part]: sanitizeVersionPart(value),
                    }))
                }}
            />
        )
    }

    return (
        <ProjectActionModal
            modalTitle="FIP Version"
            modalBody={modalBody}
            modalAction={modalAction}
            modalSecondaryActions={modalSecondaryActions}
            onActionClose={onActionClose}
        />
    )
}

type ReadyStateBodyProps = {
    questionnaireVersion?: string | null
    latestSubmittedVersion: string | null
    versionParts: VersionParts
    suggestions: { major: string; minor: string; patch: string }
    isVersionValid: boolean
    isVersionHigherThanLatest: boolean
    onSuggestionClick: (value: string) => void
    onVersionPartChange: (part: VersionPartName, value: string) => void
}

const VERSION_PART_LABELS: Record<VersionPartName, string> = {
    major: 'Major',
    minor: 'Minor',
    patch: 'Patch',
}

function ReadyStateBody({
    questionnaireVersion,
    latestSubmittedVersion,
    versionParts,
    suggestions,
    isVersionValid,
    isVersionHigherThanLatest,
    onSuggestionClick,
    onVersionPartChange,
}: ReadyStateBodyProps) {
    const versionError = !isVersionValid
        ? 'Version must contain non-negative numbers in all three fields.'
        : !isVersionHigherThanLatest
          ? 'The desired version must be higher than the latest submitted version.'
          : undefined

    return (
        <Stack loose>
            <DescriptionList
                items={[
                    {
                        term: 'Current version in questionnaire',
                        description: (
                            <VersionDisplay version={questionnaireVersion} emptyLabel="Not set" />
                        ),
                    },
                    {
                        term: 'Latest submitted version',
                        description: (
                            <VersionDisplay
                                version={latestSubmittedVersion}
                                emptyLabel="No valid version submitted yet"
                            />
                        ),
                    },
                ]}
            />

            <FieldGroup
                legend="Desired version"
                error={versionError}
                hint="The version number is in format X.Y.Z. Increasing number Z indicates only some fixes, number Y minor changes, and number X indicates a major change."
            >
                <Inline>
                    {(['major', 'minor', 'patch'] as VersionPartName[]).map((part, index) => (
                        <Inline key={part}>
                            {index > 0 && <Body aria-hidden>.</Body>}
                            <TextField
                                id={`version-${part}`}
                                label={VERSION_PART_LABELS[part]}
                                hiddenLabel
                                inputMode="numeric"
                                style={VERSION_PART_STYLE}
                                value={versionParts[part]}
                                onChange={(value) => onVersionPartChange(part, value)}
                            />
                        </Inline>
                    ))}
                </Inline>
            </FieldGroup>

            <Stack>
                <Body>Suggestions:</Body>
                <List>
                    <ListItem
                        title={
                            <ActionLink onClick={() => onSuggestionClick(suggestions.major)}>
                                {suggestions.major}
                            </ActionLink>
                        }
                        description="If you introduced major changes in your FIP."
                    />
                    <ListItem
                        title={
                            <ActionLink onClick={() => onSuggestionClick(suggestions.minor)}>
                                {suggestions.minor}
                            </ActionLink>
                        }
                        description="If you updated some declarations resulting in minor changes."
                    />
                    <ListItem
                        title={
                            <ActionLink onClick={() => onSuggestionClick(suggestions.patch)}>
                                {suggestions.patch}
                            </ActionLink>
                        }
                        description="If you just fixed some error, such as typos, to patch your FIP."
                    />
                </List>
            </Stack>
        </Stack>
    )
}

function VersionDisplay({
    version,
    emptyLabel,
}: {
    version: string | null | undefined
    emptyLabel: string
}) {
    const parsedVersion = parseSemver(version)
    if (parsedVersion) {
        return <Code>{parsedVersion.join('.')}</Code>
    }
    return <Muted>{version || emptyLabel}</Muted>
}

function computeSuggestions(version: string | null | undefined): {
    major: string
    minor: string
    patch: string
} {
    const parsed = parseSemver(version)
    if (!parsed) {
        return DEFAULT_SUGGESTIONS
    }

    return {
        major: `${parsed[0] + 1}.0.0`,
        minor: `${parsed[0]}.${parsed[1] + 1}.0`,
        patch: `${parsed[0]}.${parsed[1]}.${parsed[2] + 1}`,
    }
}

function rectifySemver(input: string | undefined | null): string | null {
    if (!input) {
        return null
    }

    const match = input.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i)
    if (!match) {
        return null
    }

    const [, major, minor = '0', patch = '0'] = match
    return `${major}.${minor}.${patch}`
}

function parseSemver(input: string | undefined | null): [number, number, number] | null {
    const rectified = rectifySemver(input)
    if (!rectified) {
        return null
    }

    const match = rectified.match(/^(\d+)\.(\d+)\.(\d+)$/)
    if (!match) {
        return null
    }

    return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
    for (let i = 0; i < 3; i += 1) {
        if (a[i] > b[i]) {
            return 1
        }
        if (a[i] < b[i]) {
            return -1
        }
    }

    return 0
}

function computeLatest(versions: SubmittedVersion[]): string | null {
    let best: [number, number, number] | null = null

    for (const item of versions) {
        const parsed = parseSemver(item.version)
        if (!parsed) {
            continue
        }

        if (!best || compareSemver(parsed, best) > 0) {
            best = parsed
        }
    }

    return best ? best.join('.') : null
}

function parseSemverParts(parts: VersionParts): [number, number, number] | null {
    if (!/^\d+$/.test(parts.major) || !/^\d+$/.test(parts.minor) || !/^\d+$/.test(parts.patch)) {
        return null
    }

    return [Number(parts.major), Number(parts.minor), Number(parts.patch)]
}

function semverToParts(version: [number, number, number]): VersionParts {
    return {
        major: String(version[0]),
        minor: String(version[1]),
        patch: String(version[2]),
    }
}

function formatVersionParts(parts: VersionParts): string {
    return `${parts.major || '0'}.${parts.minor || '0'}.${parts.patch || '0'}`
}

function sanitizeVersionPart(value: string): string {
    return value.replace(/[^\d]/g, '')
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return fallback
}
