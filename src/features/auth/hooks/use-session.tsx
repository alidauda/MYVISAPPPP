import { createContext, use, useEffect, useMemo, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { setSessionEndedHandler } from '@/api/client'
import { queryKeys } from '@/api/query-client'
import { tokenStore } from '@/api/tokens'
import { authApi } from '../api/auth-api'
import type { Account } from '../lib/schemas'
import type { PermissionCode } from '../lib/permissions'

type SessionValue = {
  account: Account | null
  /** True until we know whether a stored session can be restored. */
  isLoading: boolean
  isAuthenticated: boolean
  /** Guard helper. The backend still decides; this only shapes the UI. */
  can: (permission: PermissionCode) => boolean
  canAny: (...permissions: PermissionCode[]) => boolean
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // A failed refresh ends the session for good: drop every cached row, then
  // send the person to sign in. Tenant-scoped caches must not outlive it.
  useEffect(() => {
    setSessionEndedHandler(() => {
      queryClient.clear()
      void navigate({ to: '/login', replace: true })
    })
  }, [queryClient, navigate])

  const query = useQuery({
    queryKey: queryKeys.me(),
    queryFn: authApi.me,
    // Nothing stored means nothing to restore — do not fire a doomed request.
    enabled: tokenStore.canRestore(),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const signOut = async () => {
    const refreshToken = tokenStore.getRefreshToken()
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // An unknown or already-revoked token is not an error worth showing.
    } finally {
      tokenStore.clear()
      queryClient.clear()
      void navigate({ to: '/login', replace: true })
    }
  }

  const value = useMemo<SessionValue>(() => {
    const account = query.data ?? null
    const granted = new Set(account?.permissions ?? [])
    return {
      account,
      isLoading: tokenStore.canRestore() && query.isPending,
      isAuthenticated: Boolean(account),
      can: (permission) => granted.has(permission),
      canAny: (...permissions) => permissions.some((p) => granted.has(p)),
      signOut,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isPending])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionValue {
  const value = use(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}

/* ---------------- mutations ---------------- */

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const tokens = await authApi.login(input)
      tokenStore.set(tokens)
      // A new sign-in may be a different person: no row cached for the
      // previous one may be served to them. `me` itself is refetched rather
      // than removed — the session provider is subscribed to it, and a
      // removed query would leave it showing the previous account.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me()[0] })
      // Load the account before we hand control back, so the first guarded
      // render already knows the permissions. staleTime 0: never the cached one.
      return queryClient.fetchQuery({ queryKey: queryKeys.me(), queryFn: authApi.me, staleTime: 0 })
    },
  })
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register })
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authApi.verifyEmail })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword })
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword })
}

export function useOrganisationRegister() {
  return useMutation({ mutationFn: authApi.organisationRegister })
}
