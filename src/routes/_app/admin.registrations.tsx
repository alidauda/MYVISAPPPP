import { createFileRoute } from '@tanstack/react-router'
import { Permission } from '@/features/auth/lib/permissions'
import { RequirePermission } from '@/components/shared/require-permission'
import { RegistrationReviewView } from '@/modules/admin/views/registration-review-view'

export const Route = createFileRoute('/_app/admin/registrations')({
  component: () => (
    // Reviewing needs cross-tenant access as well; the endpoint enforces both.
    <RequirePermission permission={Permission.TENANT_ACCESS_CROSS} what="organisation review">
      <RegistrationReviewView />
    </RequirePermission>
  ),
})
