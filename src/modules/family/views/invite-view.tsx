import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { humanMessage } from '@/api/problem'
import { queryKeys } from '@/api/query-client'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { useFamilyMutations } from '@/features/family/hooks/use-family'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/travellers/$clientId/invite')

const PURPOSES = [
  {
    value: 'CONSENT' as const,
    title: 'Ask for consent',
    body: 'They record that they agree to you managing the record. You keep ownership either way — consent is never a prerequisite for anything, and a later invitation can change the answer.',
  },
  {
    value: 'MIGRATION' as const,
    title: 'Hand the record over',
    body: 'They sign into their own verified account and take over the traveller record and the applications you own for them. Document links and IDs are preserved. Your access as family manager ends.',
  },
]

export function InviteView() {
  const { clientId } = route.useParams()
  const navigate = useNavigate()
  const family = useFamilyMutations(clientId)
  const [purpose, setPurpose] = useState<'CONSENT' | 'MIGRATION'>('CONSENT')
  const [banner, setBanner] = useState<string | null>(null)

  const traveller = useQuery({
    queryKey: queryKeys.client(null, clientId),
    queryFn: () => travellersApi.get(clientId),
  })

  if (traveller.isPending) {
    return (
      <PageBody>
        <Skeleton className="h-64 w-full rounded-lg" />
      </PageBody>
    )
  }
  if (traveller.isError) {
    return (
      <PageBody>
        <Notice tone="danger" title={humanMessage(traveller.error)} />
      </PageBody>
    )
  }

  const person = traveller.data

  return (
    <PageBody className="max-w-[820px]">
      <h1 className="mb-2 text-[30px]">Invite {person.firstName}</h1>
      <p className="mb-6 max-w-[620px] text-[15px] leading-[1.6] text-muted-foreground">
        Two optional things become possible for an adult you manage. Neither is required, and
        ignoring the invitation changes nothing.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <div className="flex flex-col gap-4">
        {PURPOSES.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3.5 rounded-lg border bg-card p-5 ${
              purpose === option.value ? 'border-primary' : 'border-border'
            }`}
          >
            <input
              type="radio"
              name="purpose"
              checked={purpose === option.value}
              onChange={() => setPurpose(option.value)}
              className="mt-1 size-4.5 shrink-0 accent-[var(--primary)]"
            />
            <span>
              <span className="mb-1.5 flex flex-wrap items-baseline gap-2.5">
                <span className="text-base font-semibold">{option.title}</span>
                <span className="code rounded-[3px] bg-background px-1.5 py-0.5 text-[10px] text-label">
                  {option.value}
                </span>
              </span>
              <span className="block text-[13.5px] leading-[1.6] text-label">{option.body}</span>
            </span>
          </label>
        ))}

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3">
            <span className="mb-1 block text-[13px] font-semibold text-label">Send to</span>
            <span className="code text-sm">{person.email ?? 'No address on the record'}</span>
          </div>
          <Notice tone="warning">
            The link expires after 48 hours and works once. Sending this replaces the invitation
            already outstanding — there is only ever one.
          </Notice>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="max-w-[380px] text-[12.5px] leading-[1.5] text-muted-foreground">
            You will not see the link. It is emailed directly, and never returned to you.
          </span>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link to="/travellers/$clientId" params={{ clientId }}>
                Cancel
              </Link>
            </Button>
            <Button
              disabled={!person.email || family.invite.isPending}
              onClick={async () => {
                setBanner(null)
                try {
                  await family.invite.mutateAsync(purpose)
                  await navigate({ to: '/travellers/$clientId', params: { clientId } })
                } catch (error) {
                  setBanner(humanMessage(error))
                }
              }}
            >
              {family.invite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </div>
      </div>
    </PageBody>
  )
}
