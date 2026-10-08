import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiProblem, humanMessage } from '@/api/problem'
import { queryKeys } from '@/api/query-client'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { useSession } from '@/features/auth/hooks/use-session'
import { useFamilyRelationship, useFamilyMutations } from '@/features/family/hooks/use-family'
import { ADULT_AGE, ageOf } from '@/features/family/lib/schemas'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/travellers/$clientId/')

export function TravellerDetailView() {
  const { clientId } = route.useParams()
  const traveller = useQuery({
    queryKey: queryKeys.client(null, clientId),
    queryFn: () => travellersApi.get(clientId),
  })
  // `selfManaged` cannot tell a family member from your own record — the
  // backend sets it on both — so the relationship lookup decides: it answers
  // only for travellers you manage as family, and 404s for everything else.
  const relationship = useFamilyRelationship(clientId)
  const family = useFamilyMutations(clientId)
  const { account } = useSession()

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
  const age = ageOf(person.dateOfBirth)
  const adult = age >= ADULT_AGE
  const invitation = relationship.data?.invitation
  const noRelationship =
    relationship.error instanceof ApiProblem && relationship.error.isNotFound
  const isYou = Boolean(
    person.email && account && person.email.toLowerCase() === account.email.toLowerCase(),
  )

  return (
    <PageBody className="max-w-[980px]">
      <Link
        to="/travellers"
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] text-label no-underline hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All travellers
      </Link>

      <h1 className="mb-1.5 text-[28px]">
        {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
        {person.lastName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Born {new Date(person.dateOfBirth).toLocaleDateString()} · {person.nationality} · resident in{' '}
        {person.countryOfResidence}
        {person.email ? ` · ${person.email}` : ''}
      </p>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1 rounded-lg border border-border bg-card p-6">
          <Legend className="mb-4 w-full border-b border-border/70 pb-3">Document library</Legend>
          <Notice tone="info" title="Not listed back yet">
            The backend exposes no endpoint for listing a traveller's documents, so this cannot show
            what is already stored. Uploads happen on an application, where the requirement list
            says what is needed.
          </Notice>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/applications">Go to your applications</Link>
          </Button>
        </section>

        <aside className="w-full shrink-0 lg:w-[340px]">
          {relationship.isPending ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : noRelationship ? (
            <section className="rounded-lg border border-border bg-card p-5">
              <Legend className="mb-3">{isYou ? 'This is you' : 'No family relationship'}</Legend>
              <p className="m-0 text-[13px] leading-[1.6] text-label">
                {isYou
                  ? 'Your own traveller record. There is no family relationship to manage.'
                  : 'You do not manage this traveller as family, so there is nothing to invite them to.'}
              </p>
            </section>
          ) : relationship.isError ? (
            <Notice tone="danger" title={humanMessage(relationship.error)} />
          ) : (
            <>
              <section className="mb-4 rounded-lg border border-border bg-card p-5">
                <Legend className="mb-3 w-full border-b border-border/70 pb-2.5">
                  Relationship
                </Legend>
                <Row label="Relationship" value={relationship.data?.relationship ?? '—'} />
                <Row label="Managed by" value="You" />
                <Row
                  label="Consent"
                  value={
                    relationship.data?.consentGrantedAt
                      ? new Date(relationship.data.consentGrantedAt).toLocaleDateString()
                      : 'Not recorded'
                  }
                />
                <Row
                  label="Migrated"
                  value={relationship.data?.migratedAt ? 'Yes' : 'No'}
                  last
                />
              </section>

              {!adult ? (
                <section className="rounded-lg border border-border bg-card p-5">
                  <Legend className="mb-2.5">Turning eighteen</Legend>
                  <p className="m-0 text-[12.5px] leading-[1.6] text-label">
                    Nothing happens automatically. {person.firstName} stays under your management
                    until they accept a migration invitation — and they never have to.
                  </p>
                </section>
              ) : invitation ? (
                <section className="rounded-lg border border-warning-border bg-warning-surface p-5">
                  <Legend className="mb-2.5 text-warning">Outstanding invitation</Legend>
                  <p className="mb-3.5 text-[13px] leading-[1.55] text-warning">
                    A {invitation.purpose.toLowerCase()} invitation was sent to {invitation.sentTo}.
                    It expires {new Date(invitation.expiresAt).toLocaleString()} and can be used
                    once.
                  </p>
                  <div className="flex gap-2.5">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to="/travellers/$clientId/invite" params={{ clientId }}>
                        Replace it
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={family.cancelInvitation.isPending}
                      onClick={() => family.cancelInvitation.mutate()}
                    >
                      Cancel
                    </Button>
                  </div>
                </section>
              ) : (
                <section className="rounded-lg border border-border bg-card p-5">
                  <Legend className="mb-2.5">Invitations</Legend>
                  <p className="mb-3.5 text-[12.5px] leading-[1.6] text-label">
                    {person.firstName} is {age}, so two optional things become possible: recording
                    consent, or handing the record over entirely.
                  </p>
                  <Button asChild size="sm" className="w-full" disabled={!person.email}>
                    <Link to="/travellers/$clientId/invite" params={{ clientId }}>
                      Send an invitation
                    </Link>
                  </Button>
                  {!person.email ? (
                    <p className="mt-2.5 text-xs leading-[1.5] text-muted-foreground">
                      Add their own email address to the record first.
                    </p>
                  ) : null}
                </section>
              )}
            </>
          )}
        </aside>
      </div>
    </PageBody>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 py-2.5 text-[13.5px] ${last ? '' : 'border-b border-border/70'}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
