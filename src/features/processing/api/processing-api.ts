import { z } from 'zod'
import { request } from '@/api/client'
import { apiVoid, springPage } from '@/api/envelope'
import { ApiProblem } from '@/api/problem'
import { applicationsApi } from '@/features/applications/api/applications-api'
import { applicationSchema } from '@/features/applications/lib/schemas'
import {
  checklistItemSchema,
  informationRequestSchema,
  internalNoteSchema,
  queueRowSchema,
  type QueueFilters,
  type QueueRow,
} from '../lib/schemas'

const PAGE_SIZE = 20

export type QueuePage = {
  content: QueueRow[]
  totalElements: number
  totalPages: number
  /**
   * True when the queue endpoint failed and the rows came from the plain
   * application list instead: no priority, due date or officer filtering.
   */
  degraded: boolean
}

/**
 * The internal queue currently fails on the server. Rather than leave staff
 * with nothing, fall back to the application list, which honours only the
 * status filter. Remove once the queue endpoint is fixed.
 */
async function queueWithFallback(filters: QueueFilters): Promise<QueuePage> {
  try {
    const page = await request(`/internal/applications?${toQuery(filters)}`, {
      schema: springPage(queueRowSchema),
    })
    return { ...page, degraded: false }
  } catch (error) {
    if (!(error instanceof ApiProblem) || error.status < 500) throw error
    const page = await applicationsApi.list({
      page: filters.page ?? 0,
      size: PAGE_SIZE,
      status: filters.status,
    })
    return {
      content: page.content.map((application) => ({
        id: application.id,
        reference: application.reference,
        status: application.status,
        visaType: application.visaCode,
        country: null,
        officerId: application.assignedToUserId,
        reviewerId: null,
        organisationId: application.managingOrganisationId,
        priority: null,
        dueAt: null,
        submittedAt: null,
      })),
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      degraded: true,
    }
  }
}

function toQuery(filters: QueueFilters) {
  const query = new URLSearchParams()
  query.set('page', String(filters.page ?? 0))
  query.set('size', String(PAGE_SIZE))
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || value === undefined || value === '') continue
    query.set(key, String(value))
  }
  return query
}

export const processingApi = {
  /** The queue serialises a Spring page, not the custom page object. */
  queue: queueWithFallback,

  /** Returns no payload; refetch the case to see the new assignment. */
  assignOfficer: (id: string, userId: string, reason: string) =>
    request(`/internal/applications/${id}/officer`, {
      method: 'PUT',
      body: { userId, reason },
      schema: apiVoid,
    }),

  /** Priority and due date together — the endpoint takes both. */
  schedule: (id: string, body: { priority: string; dueAt: string | null }) =>
    request(`/internal/applications/${id}/schedule`, {
      method: 'PUT',
      body,
      schema: apiVoid,
    }),

  notes: (id: string) =>
    request(`/internal/applications/${id}/notes`, { schema: springPage(internalNoteSchema) }),

  addNote: (id: string, note: string) =>
    request(`/internal/applications/${id}/notes`, {
      method: 'POST',
      body: { note },
      schema: internalNoteSchema,
    }),

  checklist: (id: string) =>
    request(`/internal/applications/${id}/checklist`, { schema: z.array(checklistItemSchema) }),

  /** `label` is required on every call — an existing item keeps its own. */
  updateChecklist: (id: string, code: string, label: string, completed: boolean) =>
    request(`/internal/applications/${id}/checklist`, {
      method: 'PUT',
      body: { code, label, completed },
      schema: checklistItemSchema,
    }),

  /**
   * Also moves the case to AWAITING_ADDITIONAL_INFORMATION when the workflow
   * allows — that transition needs the change-status permission as well.
   */
  requestInformation: (id: string, body: { message: string; dueAt?: string }) =>
    request(`/internal/applications/${id}/information-requests`, {
      method: 'POST',
      body,
      schema: informationRequestSchema,
    }),

  changeStatus: (id: string, status: string, reason?: string) =>
    request(`/applications/${id}/status`, {
      method: 'POST',
      body: { status, reason },
      schema: applicationSchema,
    }),
}
