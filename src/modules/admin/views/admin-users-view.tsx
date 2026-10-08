import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { humanMessage } from '@/api/problem'
import { adminApi } from '@/features/admin/api/admin-api'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/hooks/use-session'

export function AdminUsersView() {
  const queryClient = useQueryClient()
  const { account } = useSession()
  const [banner, setBanner] = useState<string | null>(null)

  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users(0) })
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'disable' | 'activate' }) =>
      adminApi.setUserStatus(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (error) => setBanner(humanMessage(error)),
  })

  return (
    <PageBody className="max-w-[1100px]">
      <h1 className="mb-1.5 text-[28px]">Accounts</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every sign-in account on the platform. Newest first, 20 to a page.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      {users.isError ? (
        <Notice tone="danger" title={humanMessage(users.error)} />
      ) : users.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted">
                {['Account', 'Email', 'Status', ''].map((heading) => (
                  <th
                    key={heading}
                    className="code px-5 py-3 text-left text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.data.content.map((user) => {
                const self = user.id === account?.id
                return (
                  <tr key={user.id} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-3.5">
                      <span className="block text-[14.5px] font-semibold">
                        {user.firstName} {user.lastName}
                        {self ? (
                          <span className="font-normal text-muted-foreground"> — you</span>
                        ) : null}
                      </span>
                      <span className="code block pt-0.5 text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-muted-foreground">
                      {user.emailVerified ? 'Verified' : 'Not verified'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge code={user.status} tone={statusTone(user.status)} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {self ? (
                        <span className="text-[12.5px] text-muted-foreground">Yourself</span>
                      ) : !user.emailVerified ? (
                        // Activation requires a verified address; the backend refuses it otherwise.
                        <span className="text-[12.5px] text-muted-foreground">
                          Awaiting verification
                        </span>
                      ) : user.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger"
                          disabled={act.isPending}
                          onClick={() => act.mutate({ id: user.id, action: 'suspend' })}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={act.isPending}
                          onClick={() => act.mutate({ id: user.id, action: 'activate' })}
                        >
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 max-w-[640px] text-[12.5px] leading-[1.55] text-muted-foreground">
        Creating an account sends a verification email and assigns no role — do that separately.
        Reactivating needs a verified address, and nobody can suspend or disable their own account.
      </p>
    </PageBody>
  )
}
