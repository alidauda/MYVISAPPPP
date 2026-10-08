import { z } from 'zod'

/* ---------- what the server sends ---------- */

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.number(),
})
export type TokenPair = z.infer<typeof tokenPairSchema>

/** Exactly the backend's own enum — `PENDING_VERIFICATION`, not `_EMAIL_`. */
export const accountStatusSchema = z.enum([
  'PENDING_VERIFICATION',
  'ACTIVE',
  'LOCKED',
  'SUSPENDED',
  'DISABLED',
])
export type AccountStatus = z.infer<typeof accountStatusSchema>

export const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string().nullish(),
  status: accountStatusSchema,
  emailVerified: z.boolean(),
  mfaEnabled: z.boolean().default(false),
  /** Effective authority codes. The only source of truth for UI guards. */
  permissions: z.array(z.string()).default([]),
})
export type Account = z.infer<typeof accountSchema>

export const registrationResultSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
})

/**
 * The contract types `status` as a plain string without listing its values,
 * so an enum here would reject whatever the server actually sends.
 */
export const organisationRegistrationSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  applicantId: z.string().nullish(),
  status: z.string(),
  organisationId: z.string().nullish(),
  reviewedBy: z.string().nullish(),
  reviewedAt: z.string().nullish(),
  reviewReason: z.string().nullish(),
})
export type OrganisationRegistration = z.infer<typeof organisationRegistrationSchema>

/* ---------- what the forms collect ---------- *
 *
 * The backend does not publish a password policy, so this is a placeholder:
 * align `passwordSchema` with the real rule before launch. Everything else
 * mirrors the documented request bodies exactly.
 */

/**
 * People type phone numbers the way they read them — with spaces, brackets,
 * dashes. Rejecting that is the app being pedantic about its own formatting,
 * so strip the decoration and judge what is left. The error names the shape
 * we want; it must not be a shape we then refuse.
 */
export const phoneNumber = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()./-]/g, ''))

const PHONE_PATTERN = /^\+[1-9]\d{6,18}$/
const PHONE_MESSAGE = 'Include the country code, for example +234 800 000 0000.'

const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'That is longer than we can accept.')

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  staySignedIn: z.boolean(),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  firstName: z.string().min(1, 'Enter your first name.'),
  lastName: z.string().min(1, 'Enter your last name.'),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  phoneNumber: phoneNumber
    .refine((value) => value.length > 0, 'Enter your phone number.')
    .refine((value) => PHONE_PATTERN.test(value), PHONE_MESSAGE),
  password: passwordSchema,
  acceptedTerms: z.boolean().refine((v) => v, 'Please accept the terms to continue.'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Type the password again.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Both passwords must match.',
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const organisationRegisterSchema = z.object({
  firstName: z.string().min(1, 'Enter your first name.'),
  lastName: z.string().min(1, 'Enter your last name.'),
  email: z.string().trim().min(1, 'Enter your work email.').email('Enter a valid email address.'),
  password: passwordSchema,
  name: z.string().min(1, 'Enter the registered name.'),
  code: z
    .string()
    .min(2, 'Enter an organisation code.')
    .max(40, 'Keep it under 40 characters.')
    .regex(/^[A-Z0-9_]+$/, 'Uppercase letters, numbers and underscores only.'),
  authorised: z
    .boolean()
    .refine((v) => v, 'Confirm that you are authorised to register this organisation.'),
})
export type OrganisationRegisterInput = z.infer<typeof organisationRegisterSchema>
