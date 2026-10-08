import { z } from 'zod'

/**
 * A document version. The version is the unit an application attaches to —
 * replacing a passport later adds a new version and never rewrites what an
 * officer has already seen.
 */
export const documentVersionSchema = z.object({
  id: z.string(),
  categoryCode: z.string(),
  versionNumber: z.number(),
  current: z.boolean().nullish(),
  originalFilename: z.string(),
  contentType: z.string(),
  size: z.number(),
  checksum: z.string().nullish(),
  issueDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
  uploadedAt: z.string(),
})
export type DocumentVersion = z.infer<typeof documentVersionSchema>

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

/**
 * Checked before the request leaves, so an oversized file costs no upload.
 * The server enforces the same rules and is the one that counts.
 */
export function rejectReason(file: File): string | null {
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`
  }
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return 'Upload a PDF, JPEG or PNG.'
  }
  return null
}
