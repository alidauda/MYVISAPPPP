import { z } from 'zod'
import { request } from '@/api/client'
import { visaDefinitionSchema, visaSummarySchema } from '../lib/schemas'

export const catalogueApi = {
  /**
   * Public and unfiltered — the backend exposes no server-side catalogue
   * filter and no country master list, so narrowing happens on the client
   * over the full list.
   */
  list: () =>
    request('/visa-catalogue', { auth: false, schema: z.array(visaSummarySchema) }),

  /** By offering code, not UUID. 404 when the code has no active version. */
  get: (code: string) =>
    request(`/visa-catalogue/${code}`, { auth: false, schema: visaDefinitionSchema }),
}
