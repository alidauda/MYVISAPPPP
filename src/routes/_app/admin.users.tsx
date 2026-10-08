import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { AdminUsersView } from '@/modules/admin/views/admin-users-view'

export const Route = createFileRoute('/_app/admin/users')({
  component: () => (
    <RequirePermission permission={Permission.USER_READ} what="account administration">
      <AdminUsersView />
    </RequirePermission>
  ),
})
