import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { humanMessage } from '@/api/problem'
import { queryKeys } from '@/api/query-client'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { ageOf } from '@/features/family/lib/schemas'
import { useSession } from '@/features/auth/hooks/use-session'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function TravellersView() {
  const { account } = useSession()
  // `selfManaged` says the traveller manages their own record, not that it is
  // the signed-in person — staff see every self-managed record in the list.
  const isYou = (email: string | null | undefined) =>
    Boolean(email && account && email.toLowerCase() === account.email.toLowerCase())
  const travellers = useQuery({
    queryKey: queryKeys.clients(null, { page: 0, size: 100 }),
    queryFn: () => travellersApi.list({ page: 0, size: 100 }),
  })

  return (
    <PageBody className="max-w-[980px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1.5 text-[30px]">Travellers</h1>
          <p className="max-w-[620px] text-sm leading-[1.55] text-muted-foreground">
            The people you apply for. Each keeps its own passport details, documents and application
            history — separate from your sign-in account.
          </p>
        </div>
        <Button asChild>
          <Link to="/travellers/new">Add a traveller</Link>
        </Button>
      </div>

      {travellers.isError ? (
        <Notice tone="danger" title={humanMessage(travellers.error)} />
      ) : travellers.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : travellers.data.content.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-10 text-center">
          <h2 className="mb-2 text-[19px]">No travellers yet</h2>
          <p className="mx-auto mb-5 max-w-[420px] text-[13.5px] text-muted-foreground">
            Add yourself first, then anyone you travel for.
          </p>
          <Button asChild>
            <Link to="/onboarding">Add your own profile</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {travellers.data.content.map((traveller) => {
            const age = ageOf(traveller.dateOfBirth)
            return (
              <article
                key={traveller.id}
                className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-card p-5 sm:p-6"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-sm font-semibold text-label">
                  {traveller.firstName.at(0)}
                  {traveller.lastName.at(0)}
                </span>

                <div className="min-w-[180px] flex-1">
                  <div className="mb-1 flex flex-wrap items-baseline gap-2.5">
                    <span className="text-base font-semibold">
                      {traveller.firstName} {traveller.lastName}
                    </span>
                    {isYou(traveller.email) ? (
                      <span className="rounded-[3px] bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        You
                      </span>
                    ) : (
                      <span className="rounded-[3px] bg-background px-2 py-0.5 text-xs text-label">
                        Age {age}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    Born {new Date(traveller.dateOfBirth).toLocaleDateString()} ·{' '}
                    {traveller.nationality} · resident in {traveller.countryOfResidence}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/travellers/$clientId" params={{ clientId: traveller.id }}>
                      Open
                    </Link>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-[12.5px] leading-[1.55] text-muted-foreground">
        Adults you manage can be invited to record consent, or to take the record over entirely.
        Neither is required, and nothing changes if they ignore it.
      </p>
    </PageBody>
  )
}
