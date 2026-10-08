import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { humanMessage } from '@/api/problem'
import { adminApi } from '@/features/admin/api/admin-api'
import {
  NoOrganisation,
  OrganisationPicker,
} from '@/features/admin/components/organisation-picker'
import {
  useOrganisationMembers,
  useSelectedOrganisation,
} from '@/features/admin/hooks/use-organisations'
import type { Organisation } from '@/features/admin/lib/schemas'
import { Permission } from '@/features/auth/lib/permissions'
import { useSession } from '@/features/auth/hooks/use-session'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function OrgMembersView() {
  const { organisations, current, select } = useSelectedOrganisation()

  return (
    <PageBody className="max-w-[1000px]">
      <h1 className="mb-1.5 text-[28px]">
        {current ? `Members of ${current.name}` : 'Organisation members'}
      </h1>
      <p className="mb-6 max-w-[660px] text-sm leading-[1.55] text-muted-foreground">
        Who can act inside this organisation, and what each of them may do.
      </p>

      {organisations.isError ? (
        <Notice tone="danger" title={humanMessage(organisations.error)} />
      ) : organisations.isPending ? (
        <Skeleton className="h-52 w-full rounded-lg" />
      ) : !current ? (
        <NoOrganisation />
      ) : (
        <>
          <OrganisationPicker
            organisations={organisations.data}
            current={current}
            onSelect={select}
          />
          <Members organisation={current} />
        </>
      )}
    </PageBody>
  )
}

function Members({ organisation }: { organisation: Organisation }) {
  const queryClient = useQueryClient()
  const { account, can } = useSession()
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  const members = useOrganisationMembers(organisation.id)
  const roles = useQuery({
    queryKey: ['org-roles', organisation.id],
    queryFn: () => adminApi.organisationRoles(organisation.id),
  })
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['org-members', organisation.id] })

  // The endpoint takes an account id; only someone who can read accounts can
  // turn an email address into one.
  const canLookUp = can(Permission.USER_READ)

  const add = useMutation({
    mutationFn: async () => {
      const user = await adminApi.findUserByEmail(email)
      if (!user) return null
      return adminApi.addMember(organisation.id, user.id, roleId ? [roleId] : [])
    },
    onSuccess: (membership) => {
      if (!membership) {
        setBanner('No account uses that email address. They need to register first.')
        return
      }
      setEmail('')
      setBanner(null)
      void refresh()
    },
    onError: (error) => setBanner(humanMessage(error)),
  })

  const deactivate = useMutation({
    mutationFn: (membershipId: string) => adminApi.deactivateMember(organisation.id, membershipId),
    onSuccess: refresh,
    onError: (error) => setBanner(humanMessage(error)),
  })

  return (
    <>
      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <section className="mb-5 rounded-lg border border-border bg-card p-5">
        <Legend className="mb-3.5">Add an existing account</Legend>
        {canLookUp ? (
          <form
            noValidate
            className="flex flex-wrap items-end gap-3.5"
            onSubmit={(event) => {
              event.preventDefault()
              add.mutate()
            }}
          >
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label htmlFor="member-email">Their email address</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-[220px]">
              <Label htmlFor="member-role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="member-role" className="w-full">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles.data ?? []).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!email.trim() || add.isPending}>
              {add.isPending ? 'Adding…' : 'Add'}
            </Button>
          </form>
        ) : (
          <p className="text-[13.5px] leading-[1.55] text-muted-foreground">
            Adding someone needs their account id, and turning an email address into one needs
            permission to read accounts. Ask a platform administrator to add them.
          </p>
        )}
        <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">
          This does not create an account. The person must already have one — if they were a member
          before, adding them again reactivates the membership.
        </p>
      </section>

      {members.isError ? (
        <Notice tone="danger" title={humanMessage(members.error)} />
      ) : members.isPending ? (
        <Skeleton className="h-52 w-full rounded-lg" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {members.data.map((member) => {
            const self = member.userId === account?.id
            return (
              <div
                key={member.membershipId}
                className={`flex flex-wrap items-center gap-4 border-b border-border/70 px-5 py-4 last:border-0 ${
                  member.active ? '' : 'bg-muted'
                }`}
              >
                <span
                  className={`min-w-[180px] flex-1 text-[14.5px] font-semibold wrap-anywhere ${member.active ? '' : 'text-muted-foreground'}`}
                >
                  {member.email}
                  {self ? <span className="font-normal text-muted-foreground"> — you</span> : null}
                </span>

                <span className="flex w-full flex-wrap gap-1.5 sm:w-[240px]">
                  {member.roles.map((role) => (
                    <span
                      key={role}
                      className="code rounded-[3px] border border-info-border bg-info-surface px-2 py-1 text-[10.5px] text-info"
                    >
                      {role}
                    </span>
                  ))}
                </span>

                <span
                  className={`w-[76px] text-[12.5px] ${member.active ? 'font-semibold text-success' : 'text-muted-foreground'}`}
                >
                  {member.active ? 'Active' : 'Inactive'}
                </span>

                <span className="w-[112px] text-right">
                  {self ? (
                    <span className="text-[12.5px] text-muted-foreground">Cannot edit own</span>
                  ) : member.active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-danger"
                      disabled={deactivate.isPending}
                      onClick={() => deactivate.mutate(member.membershipId)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground">Re-add to restore</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-4 max-w-[680px] text-[12.5px] leading-[1.55] text-muted-foreground">
        Deactivating keeps the account and its history — it only ends the membership here. Nobody
        can deactivate their own membership, so an organisation cannot be left without an
        administrator by accident.
      </p>
    </>
  )
}
