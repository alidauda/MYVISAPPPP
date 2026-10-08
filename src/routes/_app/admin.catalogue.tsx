import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { CatalogueVersionsView } from '@/modules/admin/views/catalogue-versions-view'

export const Route = createFileRoute('/_app/admin/catalogue')({
  component: () => (
    <RequirePermission permission={Permission.VISA_CATALOGUE_MANAGE} what="the visa catalogue">
      <CatalogueVersionsView />
    </RequirePermission>
  ),
})
