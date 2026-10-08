import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ApplicationsView } from '@/modules/applications/views/applications-view'

/**
 * List state lives in the URL, so a filtered view is a shareable link.
 * Both are optional: a bare /applications is valid, and `catch` means junk in
 * the query string falls back rather than throwing a person off the page.
 */
const searchSchema = z.object({
  page: z.coerce.number().int().min(0).catch(0).optional(),
  group: z.enum(['all', 'needsYou', 'processing', 'decided']).catch('all').optional(),
})

export const Route = createFileRoute('/_app/applications/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ApplicationsView,
})
