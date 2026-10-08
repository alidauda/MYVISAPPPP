import { z } from 'zod'
import { request } from '@/api/client'
import { familyRelationshipSchema, type FamilyMemberInput } from '../lib/schemas'

export const familyApi = {
  /**
   * Creates a client owned by the signed-in family manager. The response is
   * the relationship record, not the client — fetch the client by `clientId`.
   */
  create: (input: FamilyMemberInput) =>
    request('/family-members', {
      method: 'POST',
      schema: familyRelationshipSchema,
      body: {
        relationship: input.relationship,
        traveller: {
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          nationality: input.nationality,
          countryOfResidence: input.countryOfResidence,
          email: input.email || null,
        },
      },
    }),

  /** Relationship, consent and migration state. Owner-only. */
  get: (clientId: string) =>
    request(`/family-members/${clientId}`, { schema: familyRelationshipSchema }),

  /**
   * One invitation at a time: a new one replaces whatever was outstanding.
   * Expires in 48 hours and the raw token is never returned to the manager.
   */
  invite: (clientId: string, purpose: 'CONSENT' | 'MIGRATION') =>
    request(`/family-members/${clientId}/invitations`, {
      method: 'POST',
      body: { purpose },
      schema: z.unknown(),
    }),

  cancelInvitation: (clientId: string) =>
    request(`/family-members/${clientId}/invitations`, { method: 'DELETE', schema: z.unknown() }),

  /** Public, token-based. Never submitted automatically on page load. */
  recordConsent: (token: string, granted: boolean) =>
    request('/auth/family-consent', {
      method: 'POST',
      body: { token, granted },
      auth: false,
      schema: z.unknown(),
    }),

  /** Requires being signed into the matching verified account. */
  acceptMigration: (token: string) =>
    request('/family-members/accept-migration', {
      method: 'POST',
      body: { token },
      schema: z.unknown(),
    }),
}
