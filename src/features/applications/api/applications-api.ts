import { z } from 'zod'
import { request } from '@/api/client'
import { customPage, springPage } from '@/api/envelope'
import {
  applicationQuestionsSchema,
  applicationSchema,
  informationRequestSchema,
  timelineEntrySchema,
  type AnswerValue,
} from '../lib/schemas'

export const applicationsApi = {
  /** Creates a DRAFT and pins the definition version for its lifetime. */
  create: (body: { clientId: string; visaDefinitionId: string; applicantNotes?: string }) =>
    request('/applications', { method: 'POST', body, schema: applicationSchema }),

  get: (id: string) => request(`/applications/${id}`, { schema: applicationSchema }),

  list: (params: { page?: number; size?: number; status?: string } = {}) => {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(Math.min(params.size ?? 20, 100)),
      ...(params.status ? { status: params.status } : {}),
    })
    return request(`/applications?${query}`, { schema: customPage(applicationSchema) })
  },

  /** Questions for the application's own pinned version, plus its answers. */
  questions: (id: string) =>
    request(`/applications/${id}/questions`, { schema: applicationQuestionsSchema }),

  /**
   * Replaces the entire answer set. Omitted answers are superseded, so the
   * caller must send everything it intends to keep.
   */
  saveAnswers: (id: string, answers: { questionCode: string; value: AnswerValue }[]) =>
    request(`/applications/${id}/answers`, {
      method: 'PUT',
      body: { answers },
      schema: z.unknown(),
    }),

  /** Advances one approved stage per call; the response carries the new status. */
  submitInitial: (id: string, comment?: string) =>
    request(`/applications/${id}/submit-initial`, {
      method: 'POST',
      body: comment ? { comment } : {},
      schema: applicationSchema,
    }),

  /** Only `applicantNotes`. Never the traveller, definition, answers or status. */
  updateNotes: (id: string, applicantNotes: string) =>
    request(`/applications/${id}`, {
      method: 'PATCH',
      body: { applicantNotes },
      schema: applicationSchema,
    }),

  /** What the case officer has asked the applicant for. A Spring page, newest first. */
  informationRequests: (id: string) =>
    request(`/applications/${id}/information-requests?page=0&size=20`, {
      schema: springPage(informationRequestSchema),
    }),

  timeline: (id: string) =>
    request(`/applications/${id}/timeline`, { schema: z.array(timelineEntrySchema) }),
}
