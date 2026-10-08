import type { ReactNode } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import type { PermissionCode } from '@/features/auth/lib/permissions'
import { AccessDenied } from './access-denied'

/**
 * A route-level guard. It decides what to render, never what someone may have
 * — the backend refuses regardless, and every call is written to survive a 403
 * arriving anyway.
 */
export function RequirePermission({
  permission,
  what,
  children,
}: {
  permission: PermissionCode
  what: string
  children: ReactNode
}) {
  const { can } = useSession()
  if (!can(permission)) return <AccessDenied what={what} />
  return <>{children}</>
}
