import { z } from 'zod'

const nullableString = z.string().nullable().optional()

export const PrepareRequestSchema = z.object({
    projectUuid: z.string(),
    userToken: z.string(),
    apiUrl: z.string(),
})

export const SubmittedVersionSchema = z.object({
    uri: z.string(),
    version: nullableString,
    submittedAt: nullableString,
})

export const PrepareResponseSchema = z.object({
    ok: z.boolean(),
    message: nullableString,
    questionnaireVersion: nullableString,
    submittedVersions: SubmittedVersionSchema.array(),
    debug: z.unknown().optional(),
})

export type PrepareRequest = z.infer<typeof PrepareRequestSchema>
export type SubmittedVersion = z.infer<typeof SubmittedVersionSchema>
export type PrepareResponse = z.infer<typeof PrepareResponseSchema>

export const VersionRequestSchema = z.object({
    projectUuid: z.string(),
    userToken: z.string(),
    apiUrl: z.string(),
    version: z.string(),
    description: z.string(),
    submissionServiceId: nullableString,
})

export const VersionSaveResponseSchema = z.object({
    ok: z.boolean(),
    message: nullableString,
})

export const VersionSubmitResponseSchema = z.object({
    ok: z.boolean(),
    message: nullableString,
    documentDone: z.boolean(),
    documentUuid: nullableString,
    submissionDone: z.boolean(),
    submissionUuid: nullableString,
    submissionLocation: nullableString,
})

export type VersionRequest = z.infer<typeof VersionRequestSchema>
export type VersionSaveResponse = z.infer<typeof VersionSaveResponseSchema>
export type VersionSubmitResponse = z.infer<typeof VersionSubmitResponseSchema>
