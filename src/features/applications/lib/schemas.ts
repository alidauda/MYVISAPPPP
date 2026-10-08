import { z } from 'zod'
import { questionBase } from '@/features/catalogue/lib/schemas'

export const applicationStatusSchema = z.enum([
  'DRAFT',
  'INITIAL_INFORMATION_SUBMITTED',
  'INITIAL_DOCUMENTS_SUBMITTED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'AWAITING_ADDITIONAL_INFORMATION',
  'CORRECTION_REQUIRED',
  'READY_FOR_SUBMISSION',
  'SUBMITTED_TO_AUTHORITY',
  'DECISION_RECEIVED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
])
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

/** Display grouping only. The backend transition policy is authoritative. */
export const STATUS_GROUPS = {
  editable: ['DRAFT', 'CORRECTION_REQUIRED'],
  needsYou: ['DRAFT', 'AWAITING_ADDITIONAL_INFORMATION', 'CORRECTION_REQUIRED'],
  processing: [
    'INITIAL_INFORMATION_SUBMITTED',
    'INITIAL_DOCUMENTS_SUBMITTED',
    'IN_PROGRESS',
    'UNDER_REVIEW',
    'READY_FOR_SUBMISSION',
    'SUBMITTED_TO_AUTHORITY',
    'DECISION_RECEIVED',
  ],
  decided: ['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
} as const satisfies Record<string, readonly ApplicationStatus[]>

export function answersEditable(status: ApplicationStatus) {
  return (STATUS_GROUPS.editable as readonly string[]).includes(status)
}

/**
 * `ApplicationResponse`. Note `version` is the record's optimistic-lock
 * counter — the *catalogue* version is `visaDefinitionVersion`. Conflating
 * them would pin an application to the wrong set of questions.
 *
 * The response carries IDs, not names: there is no `clientName` or `visaName`
 * to display, so a screen that wants one resolves it itself.
 */
export const applicationSchema = z.object({
  id: z.string(),
  reference: z.string(),
  clientId: z.string(),
  visaDefinitionId: z.string(),
  visaCode: z.string(),
  visaDefinitionVersion: z.number(),
  ownerUserId: z.string().nullish(),
  assignedToUserId: z.string().nullish(),
  managingOrganisationId: z.string().nullish(),
  status: applicationStatusSchema,
  applicantNotes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().nullish(),
})
export type Application = z.infer<typeof applicationSchema>

export const timelineEntrySchema = z.object({
  id: z.string().nullish(),
  previousStatus: applicationStatusSchema.nullish(),
  status: applicationStatusSchema,
  actorUserId: z.string().nullish(),
  timestamp: z.string(),
  reason: z.string().nullish(),
})
export type TimelineEntry = z.infer<typeof timelineEntrySchema>

export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
])
export type AnswerValue = z.infer<typeof answerValueSchema>

/**
 * An application's question carries its own current answer and the server's
 * own evaluation of whether it should be visible — there is no separate map
 * of answers to merge in.
 */
export const applicationQuestionSchema = z.object({
  ...questionBase,
  visible: z.boolean().nullish(),
  currentAnswer: answerValueSchema.nullish(),
})
export type ApplicationQuestion = z.infer<typeof applicationQuestionSchema>

export const applicationQuestionsSchema = z.object({
  applicationId: z.string(),
  visaDefinitionId: z.string(),
  visaCode: z.string(),
  visaDefinitionVersion: z.number(),
  questions: z.array(applicationQuestionSchema),
})
export type ApplicationQuestions = z.infer<typeof applicationQuestionsSchema>

/** As the applicant reads them. `status` is `OPEN` until the officer closes it. */
export const informationRequestSchema = z.object({
  id: z.string().nullish(),
  message: z.string(),
  dueAt: z.string().nullish(),
  status: z.string().nullish(),
  createdAt: z.string().nullish(),
})
export type InformationRequest = z.infer<typeof informationRequestSchema>
