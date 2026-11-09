import { ProjectData } from '@ds-wizard/plugin-sdk'
import { getApiUrlAndToken } from '@ds-wizard/plugin-sdk/requests'
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

export async function prepareProjectAction(project: ProjectData): Promise<PrepareResponse> {
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
    // The wizard's API address and the signed-in user's token, from the
    // wizard's own session; the service calls the API on the user's behalf
    const { apiUrl, token } = getApiUrlAndToken()
    if (!apiUrl || !token) {
        throw new Error('Missing FAIR Wizard session information')
    }

    return { apiUrl, token }
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
            payload &&
            typeof payload === 'object' &&
            'message' in payload &&
            typeof payload.message === 'string'
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
