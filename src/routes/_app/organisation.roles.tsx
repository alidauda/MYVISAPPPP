import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { OrgRolesView } from '@/modules/admin/views/org-roles-view'

export const Route = createFileRoute('/_app/organisation/roles')({
  component: () => (
    <RequirePermission permission={Permission.ORGANISATION_MANAGE} what="organisation roles">
      <OrgRolesView />
    </RequirePermission>
  ),
})
