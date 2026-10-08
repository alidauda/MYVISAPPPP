import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useSession } from '@/features/auth/hooks/use-session'
import { FullPageSpinner } from '@/components/shared/full-page-spinner'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const { isLoading, isAuthenticated } = useSession()
  if (isLoading) return <FullPageSpinner />
  return <Navigate to={isAuthenticated ? '/applications' : '/login'} replace />
}
