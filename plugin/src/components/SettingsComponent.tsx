import { SettingsComponentProps } from '@ds-wizard/plugin-sdk/elements'
import { TextareaField, TextField } from '@ds-wizard/plugin-sdk/ui/Field'
import { Stack } from '@ds-wizard/plugin-sdk/ui/Layout'
import { Code } from '@ds-wizard/plugin-sdk/ui/Text'

import { SettingsData } from '@/data/settings-data'

export default function SettingsComponent({
    settings,
    onSettingsChange,
}: SettingsComponentProps<SettingsData>) {
    const rows = Math.min(12, Math.max(4, settings.extraKmPatterns.split('\n').length))

    return (
        <Stack>
            <TextField
                id="submission-service-id"
                label="Submission Service ID"
                value={settings.submissionServiceId}
                onChange={(submissionServiceId) =>
                    onSettingsChange({ ...settings, submissionServiceId })
                }
                hint={
                    <>
                        Submission Service ID used for submitting nanopublications. Default value is{' '}
                        <Code>nanopub</Code>.
                    </>
                }
            />
            <TextareaField
                id="extra-km-patterns"
                label="Additional KM Patterns"
                rows={rows}
                value={settings.extraKmPatterns}
                onChange={(extraKmPatterns) => onSettingsChange({ ...settings, extraKmPatterns })}
                hint={
                    <>
                        FIP Version works by default with knowledge models{' '}
                        <Code>gofair:FIP:^5</Code> and <Code>gofair:reference-fip:^1</Code>. If you
                        have additional knowledge models, you can add them here so that they can
                        work with this plugin as well. Add one pattern per line.
                    </>
                }
            />
        </Stack>
    )
}
