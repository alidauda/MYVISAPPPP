import { request } from '@/api/client'
import { customPage } from '@/api/envelope'
import { clientSchema, type TravellerProfileInput } from '../lib/schemas'

export const travellersApi = {
  /** `selfManaged: true` makes the caller the owner of the record. */
  create: (input: TravellerProfileInput) =>
    request('/clients', {
      method: 'POST',
      schema: clientSchema,
      body: {
        firstName: input.firstName,
        middleName: input.middleName?.trim() ? input.middleName : null,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        nationality: input.nationality,
        countryOfResidence: input.countryOfResidence,
        email: input.email || null,
        phoneNumber: input.phoneNumber || null,
        selfManaged: true,
      },
    }),

  get: (id: string) => request(`/clients/${id}`, { schema: clientSchema }),

  /** PATCH carries only what changed — never ownership, ids or audit fields. */
  update: (id: string, changes: Partial<TravellerProfileInput>) =>
    request(`/clients/${id}`, { method: 'PATCH', body: changes, schema: clientSchema }),

  list: (params: { page?: number; size?: number; search?: string } = {}) => {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
      ...(params.search ? { search: params.search } : {}),
    })
    return request(`/clients?${query}`, { schema: customPage(clientSchema) })
  },
}
