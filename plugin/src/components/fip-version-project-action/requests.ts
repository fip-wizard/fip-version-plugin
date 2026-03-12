import { ProjectData } from '@ds-wizard/plugin-sdk'
import { z } from 'zod'

import {
    PrepareRequest,
    PrepareResponse,
    PrepareResponseSchema,
    VersionSaveResponse,
    VersionSaveResponseSchema,
    VersionSubmitResponse,
    VersionSubmitResponseSchema,
} from './data'

export async function prepareProjectAction(
    project: ProjectData,
): Promise<PrepareResponse> {
    const { apiUrl, token } = getSession()

    const prepareRequest: PrepareRequest = {
        projectUuid: project.uuid,
        userToken: token,
        apiUrl: apiUrl,
    }

    return await requestJson(`${__API_URL__}/api/prepare-action`, PrepareResponseSchema, {
        method: 'POST',
        body: prepareRequest,
    })
}

export async function saveVersion(
    project: ProjectData,
    version: string,
    description: string,
    submissionServiceId?: string | null,
): Promise<VersionSaveResponse> {
    const { apiUrl, token } = getSession()

    const versionRequest = {
        projectUuid: project.uuid,
        userToken: token,
        apiUrl: apiUrl,
        version,
        description,
        submissionServiceId: normalizeOptionalString(submissionServiceId),
    }

    return await requestJson(`${__API_URL__}/api/save-version`, VersionSaveResponseSchema, {
        method: 'POST',
        body: versionRequest,
    })
}

export async function submitVersion(
    project: ProjectData,
    version: string,
    description: string,
    submissionServiceId?: string | null,
): Promise<VersionSubmitResponse> {
    const { apiUrl, token } = getSession()

    const versionRequest = {
        projectUuid: project.uuid,
        userToken: token,
        apiUrl: apiUrl,
        version,
        description,
        submissionServiceId: normalizeOptionalString(submissionServiceId),
    }

    return await requestJson(`${__API_URL__}/api/submit-version`, VersionSubmitResponseSchema, {
        method: 'POST',
        body: versionRequest,
    })
}

function getSession(): { apiUrl: string; token: string } {
    const sessionString = localStorage.getItem('session/wizard')
    if (!sessionString) {
        throw new Error('Missing FAIR Wizard session information')
    }

    let session: unknown
    try {
        session = JSON.parse(sessionString)
    } catch {
        throw new Error('Invalid FAIR Wizard session information')
    }

    const apiUrl = resolveStringValue(session, [
        ['apiUrl'],
        ['api', 'url'],
        ['wizardApiUrl'],
    ])
    const token = resolveStringValue(session, [
        ['token'],
        ['token', 'value'],
        ['token', 'token'],
        ['token', 'accessToken'],
        ['auth', 'token'],
        ['auth', 'accessToken'],
        ['credentials', 'token'],
        ['userToken'],
    ])

    if (!apiUrl || !token) {
        throw new Error('Missing FAIR Wizard session information')
    }

    return { apiUrl, token }
}

function resolveStringValue(root: unknown, paths: string[][]): string | null {
    for (const path of paths) {
        let current: unknown = root
        for (const key of path) {
            if (!current || typeof current !== 'object') {
                current = null
                break
            }
            current = (current as Record<string, unknown>)[key]
        }

        const value = toTrimmedString(current)
        if (value) {
            return value
        }
    }

    return null
}

function toTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

function normalizeOptionalString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

async function requestJson<TSchema extends z.ZodTypeAny>(
    url: string,
    schema: TSchema,
    init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<z.infer<TSchema>> {
    const res = await fetch(url, {
        method: init.method ?? (init.body ? 'POST' : 'GET'),
        headers: {
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers ?? {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
    })

    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

    if (!res.ok) {
        const message =
            payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
                ? payload.message
                : `Request failed with status ${res.status}`
        throw new Error(message)
    }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
        throw new Error('Unexpected response from server (schema mismatch)')
    }

    return parsed.data
}
