import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { AdminRolesView } from '@/modules/admin/views/admin-roles-view'

export const Route = createFileRoute('/_app/admin/roles')({
  component: () => (
    <RequirePermission permission={Permission.PERMISSION_ASSIGN} what="role administration">
      <AdminRolesView />
    </RequirePermission>
  ),
})
