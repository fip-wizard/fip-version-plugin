import { ProjectActionComponentProps } from '@ds-wizard/plugin-sdk/elements'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

import type { ModalAction } from '@/components/ProjectActionModal'
import { ProjectActionModal } from '@/components/ProjectActionModal'
import { SettingsData } from '@/data/settings-data'

import { PrepareResponse, SubmittedVersion } from './fip-version-project-action/data'
import { FlashError } from './fip-version-project-action/FlashError'
import { Loader } from './fip-version-project-action/Loader'
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
const VERSION_PART_INPUT_STYLE: CSSProperties = {
    width: '120px',
    color: '#212529',
    WebkitTextFillColor: '#212529',
    opacity: 1,
}
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
    const [doneMessage, setDoneMessage] = useState('')

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
    const isBusy = view === 'preparing' || view === 'saving' || view === 'submitting'
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

            setDoneMessage(`Version ${desiredVersion} has been saved successfully.`)
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
                const message = response.submissionLocation
                    ? `Version ${desiredVersion} has been submitted successfully. Nanopublication: ${response.submissionLocation}`
                    : `Version ${desiredVersion} has been submitted successfully.`
                setDoneMessage(message)
                setView('done')
                return
            }

            if (response.documentDone) {
                setDoneMessage(
                    `Version ${desiredVersion} was saved and the RDF document was generated, but submission was not completed. Check the Documents tab for details.`,
                )
                setView('done')
                return
            }

            setDoneMessage(
                `Version ${desiredVersion} was saved, but document generation or submission did not complete. Check the Documents tab for details.`,
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
        disabled: !canSaveOrSubmit,
        onClick: () => void handleSubmit(),
    }
    let modalSecondaryActions: ModalAction[] = [
        {
            label: 'Save Version',
            disabled: !canSaveOrSubmit,
            onClick: () => void handleSave(),
        },
    ]

    if (view === 'preparing') {
        modalBody = <Loader />
        modalAction = {
            label: 'Loading...',
            disabled: true,
        }
        modalSecondaryActions = []
    } else if (view === 'saving') {
        modalBody = (
            <div className="py-2">
                <Loader />
                <p className="mb-0 mt-3">Saving version, please wait...</p>
            </div>
        )
        modalAction = {
            label: 'Saving...',
            disabled: true,
        }
        modalSecondaryActions = []
    } else if (view === 'submitting') {
        modalBody = (
            <div className="py-2">
                <Loader />
                <p className="mb-0 mt-3">
                    Saving version, generating RDF document and submitting it, please wait...
                </p>
            </div>
        )
        modalAction = {
            label: 'Submitting...',
            disabled: true,
        }
        modalSecondaryActions = []
    } else if (view === 'done') {
        modalBody = <div className="alert alert-success mb-0">{doneMessage}</div>
        modalAction = undefined
        modalSecondaryActions = []
    } else if (view === 'error') {
        modalBody = <FlashError message={errorMessage} />
        modalAction = {
            label: 'Retry',
            onClick: () => {
                setPrepareData(null)
                setDoneMessage('')
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
                submittedVersions={prepareData?.submittedVersions || []}
                versionParts={versionParts}
                suggestions={suggestions}
                isVersionValid={isVersionValid}
                isVersionHigherThanLatest={isVersionHigherThanLatest}
                isBusy={isBusy}
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
    submittedVersions: SubmittedVersion[]
    versionParts: VersionParts
    suggestions: { major: string; minor: string; patch: string }
    isVersionValid: boolean
    isVersionHigherThanLatest: boolean
    isBusy: boolean
    onSuggestionClick: (value: string) => void
    onVersionPartChange: (part: VersionPartName, value: string) => void
}

function ReadyStateBody({
    questionnaireVersion,
    latestSubmittedVersion,
    submittedVersions,
    versionParts,
    suggestions,
    isVersionValid,
    isVersionHigherThanLatest,
    isBusy,
    onSuggestionClick,
    onVersionPartChange,
}: ReadyStateBodyProps) {
    return (
        <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column gap-3">
                <div>
                    <label className="form-label mb-1">Current version in questionnaire:</label>
                    <VersionReadOnlyDisplay version={questionnaireVersion} emptyLabel="(not set)" />
                </div>
                <div>
                    <label className="form-label mb-1">Latest submitted version:</label>
                    <VersionReadOnlyDisplay
                        version={latestSubmittedVersion}
                        emptyLabel="(no valid submitted yet)"
                    />
                </div>
            </div>

            <div>
                <label className="form-label" htmlFor="version-major">
                    Desired version:
                </label>
                <div className="d-flex align-items-center gap-2">
                    <input
                        id="version-major"
                        type="number"
                        min={0}
                        step={1}
                        className="form-control text-center"
                        style={VERSION_PART_INPUT_STYLE}
                        value={versionParts.major}
                        onChange={(event) => onVersionPartChange('major', event.target.value)}
                        disabled={isBusy}
                    />
                    <span className="fs-4">.</span>
                    <input
                        id="version-minor"
                        type="number"
                        min={0}
                        step={1}
                        className="form-control text-center"
                        style={VERSION_PART_INPUT_STYLE}
                        value={versionParts.minor}
                        onChange={(event) => onVersionPartChange('minor', event.target.value)}
                        disabled={isBusy}
                    />
                    <span className="fs-4">.</span>
                    <input
                        id="version-patch"
                        type="number"
                        min={0}
                        step={1}
                        className="form-control text-center"
                        style={VERSION_PART_INPUT_STYLE}
                        value={versionParts.patch}
                        onChange={(event) => onVersionPartChange('patch', event.target.value)}
                        disabled={isBusy}
                    />
                </div>
            </div>

            {!isVersionValid && (
                <div className="alert alert-warning mb-0">
                    Version must contain non-negative numbers in all three fields.
                </div>
            )}

            {isVersionValid && !isVersionHigherThanLatest && (
                <div className="alert alert-warning mb-0">
                    The desired version must be higher than the latest submitted version.
                </div>
            )}

            <div>
                <p className="mb-1">Suggestions:</p>
                <ul className="mb-2">
                    <li>
                        <button
                            type="button"
                            className="btn btn-link p-0 align-baseline text-primary text-decoration-none fw-bold"
                            onClick={() => onSuggestionClick(suggestions.major)}
                            disabled={isBusy}
                        >
                            {suggestions.major}
                        </button>{' '}
                        = if you introduced <strong>major</strong> changes in your FIP,
                    </li>
                    <li>
                        <button
                            type="button"
                            className="btn btn-link p-0 align-baseline text-primary text-decoration-none fw-bold"
                            onClick={() => onSuggestionClick(suggestions.minor)}
                            disabled={isBusy}
                        >
                            {suggestions.minor}
                        </button>{' '}
                        = if you updated some declarations resulting in <strong>minor</strong>{' '}
                        changes,
                    </li>
                    <li>
                        <button
                            type="button"
                            className="btn btn-link p-0 align-baseline text-primary text-decoration-none fw-bold"
                            onClick={() => onSuggestionClick(suggestions.patch)}
                            disabled={isBusy}
                        >
                            {suggestions.patch}
                        </button>{' '}
                        = if you just fixed some error such as typos to <strong>patch</strong> your
                        FIP.
                    </li>
                </ul>
                <p className="form-text text-muted mb-0">
                    The version number is in format X.Y.Z. Increasing number Z indicates only some
                    fixes, number Y minor changes, and number X indicates a major change.
                </p>
            </div>

            {submittedVersions.length > 0 && (
                <div>
                    <div className="text-muted small mb-2">Submitted nanopublications</div>
                    <ul className="mb-0 ps-3">
                        {submittedVersions.map((item, index) => (
                            <li key={`${item.uri}-${index}`}>
                                {item.version || 'Unknown version'}
                                {item.submittedAt ? ` (${formatDate(item.submittedAt)})` : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

function VersionReadOnlyDisplay({
    version,
    emptyLabel,
}: {
    version: string | null | undefined
    emptyLabel: string
}) {
    const parsedVersion = parseSemver(version)
    const parts = parsedVersion
        ? semverToParts(parsedVersion)
        : {
              major: '',
              minor: '',
              patch: '',
          }

    return (
        <div>
            <div className="d-flex align-items-center gap-2">
                <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-control text-center"
                    style={VERSION_PART_INPUT_STYLE}
                    value={parts.major}
                    disabled
                    readOnly
                />
                <span className="fs-4">.</span>
                <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-control text-center"
                    style={VERSION_PART_INPUT_STYLE}
                    value={parts.minor}
                    disabled
                    readOnly
                />
                <span className="fs-4">.</span>
                <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-control text-center"
                    style={VERSION_PART_INPUT_STYLE}
                    value={parts.patch}
                    disabled
                    readOnly
                />
            </div>
            {!parsedVersion && (
                <p className="form-text text-muted mb-0 mt-1">{version || emptyLabel}</p>
            )}
        </div>
    )
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

function formatDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return fallback
}
