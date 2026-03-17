import { makeNullCodec } from '@ds-wizard/plugin-sdk'
import { PluginBuilder } from '@ds-wizard/plugin-sdk/core'
import { Plugin } from '@ds-wizard/plugin-sdk/types'

import FIPVersionProjectAction from '@/components/FIPVersionProjectAction'
import SettingsComponent from '@/components/SettingsComponent'

import { SettingsData, SettingsDataCodec } from './data/settings-data'
import { pluginMetadata } from './metadata'

export default function (settingsInput: unknown, _userSettingsInput: unknown): Plugin {
    const settings = SettingsDataCodec.parseOrInit(settingsInput)

    const plugin: Plugin = PluginBuilder.create(pluginMetadata, SettingsDataCodec, makeNullCodec())
        .addProjectAction('FIP Version', 'x-fip-version-project-action', FIPVersionProjectAction, [
            'gofair:FIP:^5',
            'gofair:reference-fip:^1',
            ...parseExtraKmPatterns(settings),
        ])
        .addSettings('x-fip-version-settings', SettingsComponent)
        .createPlugin()

    return plugin
}

function parseExtraKmPatterns(settings: SettingsData): string[] {
    if (!settings.extraKmPatterns) {
        return []
    }

    return settings.extraKmPatterns
        .split(/[,\n]/)
        .map((name) => name.trim())
        .filter(Boolean)
}
