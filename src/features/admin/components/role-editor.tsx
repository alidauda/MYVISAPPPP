import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { humanMessage } from '@/api/problem'
import { adminApi } from '../api/admin-api'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shared by the global and the organisation role editors — the two differ in
 * which endpoints they call and in whether cross-tenant access is offered at
 * all, not in how a role is shaped.
 */
export function RoleEditor({
  title,
  lede,
  scope,
  organisationId,
  picker,
}: {
  title: string
  lede: string
  scope: 'global' | 'organisation'
  organisationId?: string
  /** Rendered under the lede — the organisation switcher, when there is one. */
  picker?: ReactNode
}) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const key = scope === 'global' ? ['admin-roles'] : ['org-roles', organisationId]

  const roles = useQuery({
    queryKey: key,
    queryFn: () =>
      scope === 'global' ? adminApi.roles() : adminApi.organisationRoles(organisationId!),
  })
  const permissions = useQuery({
    queryKey: ['permissions'],
    queryFn: adminApi.permissions,
    staleTime: 10 * 60_000,
  })

  const toggle = useMutation({
    mutationFn: ({
      roleId,
      permissionId,
      granted,
    }: {
      roleId: string
      permissionId: string
      granted: boolean
    }) =>
      scope === 'global'
        ? granted
          ? adminApi.assignRolePermission(roleId, permissionId)
          : adminApi.removeRolePermission(roleId, permissionId)
        : adminApi.setOrganisationRolePermission(
            organisationId!,
            roleId,
            permissionId,
            granted,
          ),
    onSuccess: () => {
      setBanner(null)
      void queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error) => setBanner(humanMessage(error)),
  })

  const current = roles.data?.find((role) => role.id === selected) ?? roles.data?.[0]

  return (
    <PageBody className="max-w-[1100px]">
      <h1 className="mb-1.5 text-[28px]">{title}</h1>
      <p className="mb-6 max-w-[700px] text-sm leading-[1.55] text-muted-foreground">{lede}</p>
      {picker}

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      {roles.isError ? (
        <Notice tone="danger" title={humanMessage(roles.error)} />
      ) : roles.isPending || permissions.isPending || !permissions.data ? (
        <Skeleton className="h-80 w-full rounded-lg" />
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <nav className="w-full shrink-0 overflow-hidden rounded-lg border border-border bg-card lg:w-[300px]">
            {roles.data.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role.id)}
                className={`block w-full border-b border-border/70 px-4.5 py-3.5 text-left last:border-0 ${
                  current?.id === role.id ? 'border-l-[3px] border-l-primary bg-accent' : ''
                }`}
              >
                <span className="block text-[14.5px] font-semibold">{role.name}</span>
                <span className="code block pt-0.5 text-[11px] text-code-accent">{role.code}</span>
                <span className="block pt-1 text-xs text-muted-foreground">
                  {role.permissions.length} permissions
                </span>
              </button>
            ))}
          </nav>

          {current ? (
            <section className="min-w-0 flex-1 rounded-lg border border-border bg-card p-6">
              <div className="mb-5 border-b border-border/70 pb-4">
                <h2 className="mb-1 text-[22px]">{current.name}</h2>
                <span className="code text-xs text-code-accent">{current.code}</span>
                {current.description ? (
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">
                    {current.description}
                  </p>
                ) : null}
              </div>

              <Legend className="mb-3.5">Permissions</Legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {permissions.data
                  .filter((p) => scope === 'global' || p.code !== 'TENANT_ACCESS_CROSS')
                  .map((permission) => (
                    <label key={permission.id} className="flex items-start gap-2.5">
                      <Checkbox
                        checked={current.permissions.includes(permission.code)}
                        disabled={toggle.isPending}
                        onCheckedChange={(checked) =>
                          toggle.mutate({
                            roleId: current.id,
                            permissionId: permission.id,
                            granted: Boolean(checked),
                          })
                        }
                        className="mt-0.5"
                      />
                      <span className="text-[13px] leading-[1.4]">
                        <span className="code block text-xs text-label">{permission.code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {permission.name}
                        </span>
                      </span>
                    </label>
                  ))}
              </div>

              {scope === 'organisation' ? (
                <Notice tone="danger" className="mt-5">
                  <span className="code text-[12.5px]">TENANT_ACCESS_CROSS</span> is not on this
                  list and is never granted by an organisation role. It lets an account read other
                  organisations' records, and only platform administration can hand it out.
                </Notice>
              ) : null}

              <p className="mt-4 border-t border-border/70 pt-3.5 text-[12.5px] text-muted-foreground">
                Every change is written to the audit log. You cannot remove a role from your own
                account.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </PageBody>
  )
}
