import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { OrgMembersView } from '@/modules/admin/views/org-members-view'

export const Route = createFileRoute('/_app/organisation/members')({
  component: () => (
    <RequirePermission permission={Permission.ORGANISATION_MANAGE} what="organisation members">
      <OrgMembersView />
    </RequirePermission>
  ),
})
