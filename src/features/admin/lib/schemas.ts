import { z } from 'zod'
import { accountStatusSchema } from '@/features/auth/lib/schemas'

/** `UserListResponse` — a list row carries no roles and no creation date. */
export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  status: accountStatusSchema,
  emailVerified: z.boolean(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

/** `UserManagementResponse` — what a single-user action returns. */
export const managedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string().nullish(),
  status: accountStatusSchema,
  emailVerifiedAt: z.string().nullish(),
  mfaEnabled: z.boolean().nullish(),
  roles: z.array(z.string()).nullish().transform((v) => v ?? []),
})
export type ManagedUser = z.infer<typeof managedUserSchema>

export const permissionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
})
export type Permission = z.infer<typeof permissionSchema>

export const roleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  permissions: z.array(z.string()).default([]),
  memberCount: z.number().default(0),
})
export type Role = z.infer<typeof roleSchema>

/** `OrganisationMemberResponse` — carries the email but no display name. */
export const membershipSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  email: z.string(),
  active: z.boolean(),
  roles: z.array(z.string()).nullish().transform((v) => v ?? []),
})
export type Membership = z.infer<typeof membershipSchema>

export const organisationSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
})
export type Organisation = z.infer<typeof organisationSchema>

/**
 * A registration carries only the applicant's id; the person behind it is a
 * separate `GET /users/{id}`. `status` is untyped in the contract.
 */
export const organisationRegistrationReviewSchema = z.object({
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
export type OrganisationRegistrationReview = z.infer<typeof organisationRegistrationReviewSchema>
