import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Pathless layout for the public pages. They stay reachable while signed in —
 * a person may land on a verification link with a live session.
 */
export const Route = createFileRoute('/_auth')({
  component: () => <Outlet />,
})
