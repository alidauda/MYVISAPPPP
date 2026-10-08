import { z } from 'zod'
import { countryCodes } from '@/lib/countries'
import { phoneNumber } from '@/features/auth/lib/schemas'

export const genderSchema = z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNSPECIFIED'])

export const clientSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  middleName: z.string().nullish(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  gender: genderSchema,
  nationality: z.string(),
  countryOfResidence: z.string(),
  email: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  selfManaged: z.boolean(),
  managingOrganisationId: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
})
export type Client = z.infer<typeof clientSchema>

const isoDate = z
  .string()
  .min(1, 'Enter a date of birth.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a real date.')
  .refine((value) => new Date(value) <= new Date(), 'A date of birth cannot be in the future.')

/** The traveller profile form. Mirrors `POST /clients` field for field. */
export const travellerProfileSchema = z.object({
  firstName: z.string().min(1, 'Enter the first name as printed in the passport.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Enter the last name as printed in the passport.'),
  dateOfBirth: isoDate,
  gender: genderSchema,
  nationality: z
    .string()
    .refine((value) => countryCodes.includes(value), 'Choose a nationality.'),
  countryOfResidence: z
    .string()
    .refine((value) => countryCodes.includes(value), 'Choose a country of residence.'),
  email: z.string().trim().email('Enter a valid email address.').or(z.literal('')),
  // Optional here: a traveller record can be completed later.
  phoneNumber: phoneNumber.refine(
    (value) => value === '' || /^\+[1-9]\d{6,18}$/.test(value),
    'Include the country code, for example +234 800 000 0000.',
  ),
})
export type TravellerProfileInput = z.infer<typeof travellerProfileSchema>
