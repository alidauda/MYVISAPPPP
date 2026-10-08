import { z } from 'zod'
import { applicationStatusSchema } from '@/features/applications/lib/schemas'

export const prioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export type Priority = z.infer<typeof prioritySchema>

/**
 * `ApplicationQueueItem` is deliberately thin: identifiers and scheduling, no
 * names. A screen that wants a traveller's name resolves it separately.
 */
export const queueRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: applicationStatusSchema,
  country: z.string().nullish(),
  visaType: z.string().nullish(),
  officerId: z.string().nullish(),
  reviewerId: z.string().nullish(),
  organisationId: z.string().nullish(),
  /** Absent on rows from the fallback list, which carries no scheduling. */
  priority: prioritySchema.nullish(),
  dueAt: z.string().nullish(),
  submittedAt: z.string().nullish(),
})
export type QueueRow = z.infer<typeof queueRowSchema>

export const checklistItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  completed: z.boolean(),
})
export type ChecklistItem = z.infer<typeof checklistItemSchema>

/** The contract returns only the text. */
export const internalNoteSchema = z.object({
  note: z.string(),
})
export type InternalNote = z.infer<typeof internalNoteSchema>

/** The contract documents only `message` and `dueAt`; the rest may be absent. */
export const informationRequestSchema = z.object({
  id: z.string().nullish(),
  message: z.string(),
  dueAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  resolvedAt: z.string().nullish(),
})

/**
 * Every filter the queue endpoint documents. They live in the URL, so a
 * filtered queue is a link a colleague can open and see the same rows.
 */
export const queueFiltersSchema = z.object({
  status: z.string().optional(),
  visaType: z.string().optional(),
  country: z.string().optional(),
  officer: z.string().optional(),
  priority: prioritySchema.optional(),
  overdue: z.boolean().optional(),
  submittedFrom: z.string().optional(),
  submittedTo: z.string().optional(),
  page: z.coerce.number().int().min(0).catch(0).optional(),
})
export type QueueFilters = z.infer<typeof queueFiltersSchema>

export function isOverdue(row: QueueRow) {
  return Boolean(row.dueAt) && new Date(row.dueAt!).getTime() < Date.now()
}
