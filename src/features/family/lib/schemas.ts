import { z } from 'zod'
import { genderSchema } from '@/features/travellers/lib/schemas'
import { countryCodes } from '@/lib/countries'

export const familyRelationshipSchema = z.object({
  clientId: z.string(),
  relationship: z.string(),
  consentGrantedAt: z.string().nullish(),
  migratedAt: z.string().nullish(),
  invitation: z
    .object({
      purpose: z.enum(['CONSENT', 'MIGRATION']),
      sentTo: z.string(),
      expiresAt: z.string(),
    })
    .nullish(),
})
export type FamilyRelationship = z.infer<typeof familyRelationshipSchema>

/** `POST /family-members` — relationship plus a nested traveller. */
export const familyMemberSchema = z.object({
  relationship: z.string().min(1, 'Say how they are related to you.'),
  firstName: z.string().min(1, 'Enter their first name.'),
  lastName: z.string().min(1, 'Enter their last name.'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
    .refine((value) => new Date(value) <= new Date(), 'A date of birth cannot be in the future.'),
  gender: genderSchema,
  nationality: z.string().refine((v) => countryCodes.includes(v), 'Choose a nationality.'),
  countryOfResidence: z
    .string()
    .refine((v) => countryCodes.includes(v), 'Choose a country of residence.'),
  /** Required before an adult can be invited, optional otherwise. */
  email: z.string().trim().email('Enter a valid email address.').or(z.literal('')),
})
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>

export const invitationSchema = z.object({
  purpose: z.enum(['CONSENT', 'MIGRATION']),
})
export type InvitationInput = z.infer<typeof invitationSchema>

/** The implementation's own threshold for who may be invited. */
export const ADULT_AGE = 18

export function ageOf(dateOfBirth: string) {
  const born = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDelta = now.getMonth() - born.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age--
  return age
}
