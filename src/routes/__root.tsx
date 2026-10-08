import { createRootRoute, Outlet } from '@tanstack/react-router'
import { SessionProvider } from '@/features/auth/hooks/use-session'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  )
}
