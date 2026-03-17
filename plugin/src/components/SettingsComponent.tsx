import { SettingsComponentProps } from '@ds-wizard/plugin-sdk/elements'
import React from 'react'

import { SettingsData } from '@/data/settings-data'

export default function SettingsComponent({
    settings,
    onSettingsChange,
}: SettingsComponentProps<SettingsData>) {
    const rows = Math.min(12, Math.max(4, settings.extraKmPatterns.split('\n').length))

    return (
        <div>
            <div className="form-group mb-4">
                <label htmlFor="submission-service-id">Submission Service ID:</label>
                <input
                    id="submission-service-id"
                    className="form-control"
                    value={settings.submissionServiceId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onSettingsChange({ ...settings, submissionServiceId: e.target.value })
                    }
                />
                <p className="text-muted mt-2 mb-0">
                    Submission Service ID used for submitting nanopublications. Default value is{' '}
                    <code>nanopub</code>.
                </p>
            </div>

            <div className="form-group">
                <label>Additional KM Patterns:</label>
                <textarea
                    className="form-control"
                    rows={rows}
                    value={settings.extraKmPatterns}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        onSettingsChange({ ...settings, extraKmPatterns: e.target.value })
                    }
                />
                <p className="text-muted mt-2">
                    FIP Version Importer works by default with knowledge models{' '}
                    <code>gofair:FIP:^5</code> and
                    <code>gofair:reference-fip:^1</code>. If you have additional knowledge models,
                    you can add them here so that they can work with this plugin as well. Add one
                    pattern per line.
                </p>
            </div>
        </div>
    )
}
