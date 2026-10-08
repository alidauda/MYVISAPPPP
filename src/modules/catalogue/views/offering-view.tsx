import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import { queryKeys } from '@/api/query-client'
import { useOffering } from '@/features/catalogue/hooks/use-catalogue'
import { useCreateApplication } from '@/features/applications/hooks/use-applications'
import { travellersApi } from '@/features/travellers/api/travellers-api'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const route = getRouteApi('/_app/catalogue/$code')

export function OfferingView() {
  const { code } = route.useParams()
  const navigate = useNavigate()
  const offering = useOffering(code)
  const create = useCreateApplication()
  const [travellerId, setTravellerId] = useState<string | undefined>()
  const [banner, setBanner] = useState<string | null>(null)

  const travellers = useQuery({
    queryKey: queryKeys.clients(null, { page: 0, size: 100 }),
    queryFn: () => travellersApi.list({ page: 0, size: 100 }),
  })

  const selected = travellerId ?? travellers.data?.content[0]?.id

  async function startDraft() {
    if (!offering.data || !selected) return
    setBanner(null)
    try {
      const application = await create.mutateAsync({
        clientId: selected,
        visaDefinitionId: offering.data.id,
      })
      await navigate({
        to: '/applications/$applicationId/questions',
        params: { applicationId: application.id },
      })
    } catch (error) {
      setBanner(humanMessage(error))
    }
  }

  if (offering.isPending) {
    return (
      <PageBody className="max-w-[1100px]">
        <Skeleton className="mb-4 h-10 w-96" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </PageBody>
    )
  }

  if (offering.isError) {
    return (
      <PageBody>
        <Notice tone="danger" title={humanMessage(offering.error)}>
          <Link to="/catalogue" className="underline">
            Back to the catalogue
          </Link>
        </Notice>
      </PageBody>
    )
  }

  const definition = offering.data

  return (
    <PageBody className="max-w-[1100px]">
      <Link
        to="/catalogue"
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] text-label no-underline hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to catalogue
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-3.5">
        <span className="code text-[11.5px] text-code-accent">{definition.code}</span>
        <span className="code rounded-[3px] border border-success-border bg-success-surface px-2 py-1 text-[10px] text-success">
          v{definition.version} ACTIVE
        </span>
      </div>
      <h1 className="mb-2.5 text-[30px]">{definition.name}</h1>
      <p className="mb-6 max-w-[680px] text-[15px] leading-[1.55] text-muted-foreground">
        {definition.description ??
          'Read what is asked for before you start — you can leave a draft and come back to it.'}
      </p>

      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <section className="rounded-lg border border-border bg-card p-6 sm:p-7">
            <Legend className="w-full border-b border-border/70 pb-3">
              Documents you will need
            </Legend>
            <ul className="m-0 list-none p-0">
              {definition.requirements.map((requirement) => (
                <li
                  key={requirement.code}
                  className="flex flex-wrap items-start gap-3.5 border-b border-border/70 py-3.5 last:border-0"
                >
                  <span className="code w-[180px] shrink-0 pt-0.5 text-[11px] text-code-accent">
                    {requirement.code}
                  </span>
                  <span className="min-w-[200px] flex-1 text-sm leading-[1.45]">
                    {requirement.name}
                    {requirement.description ? (
                      <span className="block pt-0.5 text-[12.5px] text-muted-foreground">
                        {requirement.description}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`shrink-0 text-[11.5px] font-semibold ${
                      requirement.required ? 'text-danger' : 'text-muted-foreground'
                    }`}
                  >
                    {requirement.required ? 'Required' : 'Conditional'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 sm:p-7">
            <Legend className="mb-4 w-full border-b border-border/70 pb-3">
              What you will be asked — {definition.questions.length} questions
            </Legend>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {definition.questions.slice(0, 6).map((question) => (
                <li
                  key={question.code}
                  className="flex flex-wrap items-baseline gap-3 text-[13.5px] leading-[1.5]"
                >
                  <span className="code w-[180px] shrink-0 text-[11px] text-muted-foreground">
                    {question.code}
                  </span>
                  <span className="min-w-[180px] flex-1 text-label">{question.label}</span>
                </li>
              ))}
            </ul>
            {definition.questions.length > 6 ? (
              <p className="mt-2.5 text-[13px] text-muted-foreground">
                and {definition.questions.length - 6} more
              </p>
            ) : null}
            <p className="mt-4 border-t border-border/70 pt-3.5 text-[12.5px] leading-[1.55] text-muted-foreground">
              Some questions appear only once an earlier answer makes them relevant.
            </p>
          </section>
        </div>

        <aside className="w-full shrink-0 rounded-lg border border-border bg-card p-6 lg:w-[340px]">
          <h2 className="mb-4 text-[19px]">Start this application</h2>

          {banner ? <Notice tone="danger" title={banner} className="mb-4" /> : null}

          {travellers.isPending ? (
            <Skeleton className="h-11 w-full" />
          ) : travellers.data && travellers.data.content.length > 0 ? (
            <div className="mb-4.5 flex flex-col gap-1.5">
              <Label htmlFor="traveller">Who is travelling?</Label>
              <Select value={selected} onValueChange={setTravellerId}>
                <SelectTrigger id="traveller" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {travellers.data.content.map((traveller) => (
                    <SelectItem key={traveller.id} value={traveller.id}>
                      {traveller.firstName} {traveller.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Notice tone="warning" title="No traveller yet" className="mb-4.5">
              An application is built from a traveller record.{' '}
              <Link to="/onboarding" className="underline">
                Add yours first
              </Link>
              .
            </Notice>
          )}

          <dl className="mb-4.5 border-y border-border/70 py-3.5 text-[13.5px]">
            <div className="flex justify-between pb-2">
              <dt className="text-muted-foreground">Version pinned</dt>
              <dd className="code text-[13px]">v{definition.version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Starting status</dt>
              <dd className="code rounded-[3px] border border-info-border bg-info-surface px-1.5 py-0.5 text-xs text-info">
                DRAFT
              </dd>
            </div>
          </dl>

          <Button
            size="lg"
            className="w-full"
            disabled={!selected || create.isPending}
            onClick={() => void startDraft()}
          >
            {create.isPending ? 'Creating draft…' : 'Start a draft'}
          </Button>

          <p className="mt-3.5 text-[12.5px] leading-[1.55] text-muted-foreground">
            This creates a draft only. Nothing is sent anywhere until you submit, and version{' '}
            {definition.version} stays attached even if this offering is updated later.
          </p>
        </aside>
      </div>
    </PageBody>
  )
}
