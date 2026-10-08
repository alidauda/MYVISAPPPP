import { z } from 'zod'
import { request } from '@/api/client'
import { apiVoid } from '@/api/envelope'
import { accountSchema, organisationRegistrationSchema, tokenPairSchema } from '../lib/schemas'

export const authApi = {
  /**
   * Public. Creates a CUSTOMER account pending email verification.
   * Returns no payload — the contract is `ApiResponseVoid`, so there is no id
   * to read back and the email is the only thing we can carry forward.
   */
  register: (body: {
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber?: string
  }) => request('/auth/register', { method: 'POST', body, auth: false, schema: apiVoid }),

  /** Public. Unverified, suspended and locked accounts are refused here. */
  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body, auth: false, schema: tokenPairSchema }),

  logout: (refreshToken: string) =>
    request('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      schema: z.unknown(),
    }),

  verifyEmail: (token: string) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: { token },
      auth: false,
      schema: z.unknown(),
    }),

  /** Answers the same way whether or not an account exists. */
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
      schema: z.unknown(),
    }),

  /**
   * Revokes every refresh token for the account. Sign in again afterwards.
   * The field is `newPassword`, not `password` — the contract is explicit and
   * the server rejects the wrong name with a NotBlank on a field the form
   * does not have.
   */
  resetPassword: (body: { token: string; newPassword: string }) =>
    request('/auth/reset-password', {
      method: 'POST',
      body,
      auth: false,
      schema: z.unknown(),
    }),

  organisationRegister: (body: {
    applicant: { email: string; password: string; firstName: string; lastName: string }
    organisation: { code: string; name: string }
  }) =>
    request('/auth/organisation-register', {
      method: 'POST',
      body,
      auth: false,
      schema: organisationRegistrationSchema,
    }),

  /** The authenticated account, its status and its effective permissions. */
  me: () => request('/users/me', { schema: accountSchema }),
}
