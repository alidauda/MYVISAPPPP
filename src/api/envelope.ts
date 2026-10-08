import { z } from 'zod'

/** Every successful response is wrapped in this envelope. */
export function apiSuccess<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    message: z.string().nullish(),
    data,
    timestamp: z.string().nullish(),
  })
}

/**
 * `ApiResponseVoid`: success with no payload. The key is absent entirely, not
 * null — so `z.unknown()` is right and `z.object({...})` would reject a
 * perfectly good response.
 */
export const apiVoid = z.unknown()

export const validationErrorSchema = z.object({
  field: z.string(),
  code: z.string().nullish(),
  message: z.string(),
})
export type ValidationError = z.infer<typeof validationErrorSchema>

/** Every failed response, including ones behind a binary download. */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  code: z.string(),
  message: z.string(),
  status: z.number(),
  path: z.string().nullish(),
  validationErrors: z.array(validationErrorSchema).nullish(),
  timestamp: z.string().nullish(),
  traceId: z.string().nullish(),
})

/** A paged list built by the backend's own page object. */
export function customPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    page: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
  })
}

/** A paged list serialised from a Spring `Page`. */
export function springPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    number: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
  })
}
