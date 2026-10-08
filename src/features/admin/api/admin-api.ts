import { z } from 'zod'
import { request } from '@/api/client'
import { springPage } from '@/api/envelope'
import { visaDefinitionSchema } from '@/features/catalogue/lib/schemas'
import {
  adminUserSchema,
  managedUserSchema,
  membershipSchema,
  organisationRegistrationReviewSchema,
  organisationSchema,
  permissionSchema,
  roleSchema,
} from '../lib/schemas'

/** The largest page the users endpoint serves. */
const USER_PAGE_SIZE = 100

export const adminApi = {
  /** Spring page: zero-based, 20 by default, newest first. */
  users: (page = 0) =>
    request(`/users?page=${page}&size=20`, { schema: springPage(adminUserSchema) }),

  user: (id: string) => request(`/users/${id}`, { schema: managedUserSchema }),

  /**
   * There is no lookup by email, so this walks the account list. Needs
   * USER_READ; anyone without it gets the backend's 403.
   */
  findUserByEmail: async (email: string) => {
    const wanted = email.trim().toLowerCase()
    for (let page = 0; ; page++) {
      const result = await request(`/users?page=${page}&size=${USER_PAGE_SIZE}`, {
        schema: springPage(adminUserSchema),
      })
      const match = result.content.find((user) => user.email.toLowerCase() === wanted)
      if (match) return match
      if (page + 1 >= result.totalPages) return null
    }
  },

  setUserStatus: (id: string, action: 'suspend' | 'disable' | 'activate') =>
    request(`/users/${id}/${action}`, { method: 'POST', schema: managedUserSchema }),

  assignGlobalRole: (userId: string, roleId: string) =>
    request(`/users/${userId}/roles/${roleId}`, { method: 'PUT', schema: managedUserSchema }),

  removeGlobalRole: (userId: string, roleId: string) =>
    request(`/users/${userId}/roles/${roleId}`, { method: 'DELETE', schema: managedUserSchema }),

  roles: () => request('/roles', { schema: z.array(roleSchema) }),

  permissions: () => request('/roles/permissions', { schema: z.array(permissionSchema) }),

  assignRolePermission: (roleId: string, permissionId: string) =>
    request(`/roles/${roleId}/permissions/${permissionId}`, { method: 'PUT', schema: roleSchema }),

  removeRolePermission: (roleId: string, permissionId: string) =>
    request(`/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
      schema: roleSchema,
    }),

  /* ---- organisation scoped ---- */

  organisation: (organisationId: string) =>
    request(`/organisations/${organisationId}`, { schema: organisationSchema }),

  members: (organisationId: string) =>
    request(`/organisations/${organisationId}/members`, { schema: z.array(membershipSchema) }),

  /** Adding never creates an account; re-adding reactivates the old membership. */
  addMember: (organisationId: string, userId: string, roleIds: string[]) =>
    request(`/organisations/${organisationId}/members`, {
      method: 'POST',
      body: { userId, roleIds },
      schema: membershipSchema,
    }),

  deactivateMember: (organisationId: string, membershipId: string) =>
    request(`/organisations/${organisationId}/members/${membershipId}`, {
      method: 'DELETE',
      schema: z.unknown(),
    }),

  organisationRoles: (organisationId: string) =>
    request(`/organisations/${organisationId}/roles`, { schema: z.array(roleSchema) }),

  setOrganisationRolePermission: (
    organisationId: string,
    roleId: string,
    permissionId: string,
    granted: boolean,
  ) =>
    request(`/organisations/${organisationId}/roles/${roleId}/permissions/${permissionId}`, {
      method: granted ? 'PUT' : 'DELETE',
      schema: roleSchema,
    }),

  /* ---- registration review ---- */

  /** reviewQueue=true needs ORGANISATION_MANAGE *and* TENANT_ACCESS_CROSS. */
  reviewQueue: (page = 0) =>
    request(`/organisation-registrations?reviewQueue=true&page=${page}`, {
      schema: springPage(organisationRegistrationReviewSchema),
    }),

  approveRegistration: (id: string) =>
    request(`/organisation-registrations/${id}/approve`, { method: 'POST', schema: z.unknown() }),

  rejectRegistration: (id: string, reason: string) =>
    request(`/organisation-registrations/${id}/reject`, {
      method: 'POST',
      body: { reason },
      schema: z.unknown(),
    }),

  /* ---- catalogue ---- */

  /** Any version — draft, active or inactive. There is no list, only lookup by id. */
  visaDefinition: (id: string) =>
    request(`/admin/visa-definitions/${id}`, { schema: visaDefinitionSchema }),

  /** Activating deactivates the previous active version of the same code. */
  activateVersion: (id: string) =>
    request(`/admin/visa-definitions/${id}/activate`, {
      method: 'POST',
      schema: visaDefinitionSchema,
    }),
}
