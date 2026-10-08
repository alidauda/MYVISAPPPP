import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { humanMessage } from '@/api/problem'
import { adminApi } from '@/features/admin/api/admin-api'
import { catalogueApi } from '@/features/catalogue/api/catalogue-api'
import type { VisaDefinition } from '@/features/catalogue/lib/schemas'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function CatalogueVersionsView() {
  const queryClient = useQueryClient()
  const [banner, setBanner] = useState<string | null>(null)
  const [draftId, setDraftId] = useState('')
  const [lookupId, setLookupId] = useState<string | null>(null)

  // Only active versions can be listed; drafts and superseded versions are
  // reachable by id alone, because the backend exposes no admin list.
  const live = useQuery({ queryKey: ['visa-catalogue'], queryFn: catalogueApi.list })
  const looked = useQuery({
    queryKey: ['visa-definition', lookupId],
    queryFn: () => adminApi.visaDefinition(lookupId!),
    enabled: Boolean(lookupId),
  })

  const activate = useMutation({
    mutationFn: (id: string) => adminApi.activateVersion(id),
    onSuccess: () => {
      setBanner(null)
      void queryClient.invalidateQueries({ queryKey: ['visa-catalogue'] })
      void queryClient.invalidateQueries({ queryKey: ['visa-definition'] })
    },
    onError: (error) => setBanner(humanMessage(error)),
  })

  const trimmed = draftId.trim()

  return (
    <PageBody className="max-w-[1000px]">
      <h1 className="mb-1.5 text-[28px]">Visa catalogue</h1>
      <p className="mb-6 max-w-[700px] text-sm leading-[1.55] text-muted-foreground">
        One version of an offering is live at a time. A revision is a complete new version under the
        same code — there is no partial edit, and no endpoint to change a single question.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <Legend className="mb-3.5">Open a version by id</Legend>
        <form
          noValidate
          className="flex flex-wrap items-end gap-3.5"
          onSubmit={(event) => {
            event.preventDefault()
            if (UUID.test(trimmed)) setLookupId(trimmed)
          }}
        >
          <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
            <Label htmlFor="definition-id">Definition id</Label>
            <Input
              id="definition-id"
              className="code"
              placeholder="f0000007-0000-4000-8000-000000000007"
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={!UUID.test(trimmed)}>
            Open
          </Button>
        </form>
        <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">
          Drafts and superseded versions cannot be listed yet — creating a definition returns its
          id, and that id is the only way back to it.
        </p>

        {lookupId ? (
          looked.isError ? (
            <Notice tone="danger" title={humanMessage(looked.error)} className="mt-4" />
          ) : looked.isPending ? (
            <Skeleton className="mt-4 h-20 w-full rounded-lg" />
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <VersionRow
                definition={looked.data}
                action={
                  looked.data.active ? null : (
                    <Button
                      size="sm"
                      disabled={activate.isPending}
                      onClick={() => activate.mutate(looked.data.id)}
                      className="bg-success border-success hover:bg-success/90"
                    >
                      Activate
                    </Button>
                  )
                }
              />
            </div>
          )
        ) : null}
      </section>

      <Legend className="mb-3.5">Live now</Legend>
      {live.isError ? (
        <Notice tone="danger" title={humanMessage(live.error)} />
      ) : live.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {live.data.map((offering) => (
            <div
              key={offering.id}
              className="flex flex-wrap items-center gap-4 border-b border-border/70 px-5 py-4 last:border-0"
            >
              <span className="code w-11 shrink-0 text-base font-medium">v{offering.version}</span>
              <span className="min-w-[200px] flex-1">
                <span className="block text-[14.5px] font-semibold">{offering.name}</span>
                <span className="code block pt-0.5 text-[11.5px] wrap-anywhere text-code-accent">
                  {offering.code} · {offering.destinationCountry} · {offering.visaCategory}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraftId(offering.id)
                  setLookupId(offering.id)
                }}
              >
                Details
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Notice tone="warning" title="What activating does">
          It validates the rules, puts the version in the public catalogue and deactivates the
          previous active version in the same step. Applications already started keep the version
          they were started on.
        </Notice>
        <Notice tone="info" title="Taking an offering down">
          There is no deactivate action. An offering leaves the catalogue only when a newer version
          of the same code replaces it — plan a withdrawal as a version, not a switch.
        </Notice>
      </div>
    </PageBody>
  )
}

function VersionRow({
  definition,
  action,
}: {
  definition: VisaDefinition
  action: ReactNode
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 px-5 py-4 ${definition.active ? 'bg-success-surface/30' : ''}`}
    >
      <span className="code w-11 shrink-0 text-base font-medium">v{definition.version}</span>
      <span className="min-w-[200px] flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-2.5">
          <span className="text-[14.5px] font-semibold">{definition.name}</span>
          <span
            className={`code rounded-[3px] border px-2 py-1 text-[10px] ${
              definition.active
                ? 'border-success-border bg-success-surface text-success'
                : 'border-border bg-background text-label'
            }`}
          >
            {definition.active ? 'ACTIVE' : 'NOT ACTIVE'}
          </span>
        </span>
        <span className="code block text-[11.5px] wrap-anywhere text-code-accent">
          {definition.code}
        </span>
        <span className="block pt-1 text-[12.5px] text-muted-foreground">
          {definition.questions.length} questions · {definition.requirements.length} requirements
        </span>
      </span>
      {action}
    </div>
  )
}
