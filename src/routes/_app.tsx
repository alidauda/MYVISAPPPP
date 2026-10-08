import { createFileRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { useSession } from '@/features/auth/hooks/use-session'
import { AppShell } from '@/components/shared/app-shell'
import { FullPageSpinner } from '@/components/shared/full-page-spinner'

export const Route = createFileRoute('/_app')({
  component: GuardedApp,
})

/**
 * The signed-in half. A guard here is convenience only: it decides what to
 * render, never what a person is allowed to have. The backend refuses
 * regardless, and every call is prepared for a 401 or 403.
 */
function GuardedApp() {
  const { isLoading, isAuthenticated } = useSession()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.href }} replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
