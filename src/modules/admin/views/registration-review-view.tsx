import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import { adminApi } from '@/features/admin/api/admin-api'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

export function RegistrationReviewView() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  const queue = useQuery({ queryKey: ['review-queue'], queryFn: () => adminApi.reviewQueue(0) })
  const settle = () => {
    setBanner(null)
    setReason('')
    void queryClient.invalidateQueries({ queryKey: ['review-queue'] })
  }

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveRegistration(id),
    onSuccess: settle,
    onError: (error) => setBanner(humanMessage(error)),
  })
  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectRegistration(id, reason),
    onSuccess: settle,
    onError: (error) => setBanner(humanMessage(error)),
  })

  const rows = queue.data?.content ?? []

  // A registration names its applicant only by id; the person is a separate read.
  const applicantIds = [
    ...new Set(rows.map((r) => r.applicantId).filter((id): id is string => Boolean(id))),
  ]
  const applicantQueries = useQueries({
    queries: applicantIds.map((id) => ({
      queryKey: ['admin-user', id],
      queryFn: () => adminApi.user(id),
      staleTime: 5 * 60_000,
    })),
  })
  const applicants = new Map(
    applicantQueries.flatMap((q, i) => (q.data ? [[applicantIds[i], q.data] as const] : [])),
  )
  const applicantOf = (row: (typeof rows)[number]) =>
    row.applicantId ? applicants.get(row.applicantId) : undefined
  // Unknown until the applicant loads; only a confirmed unverified address blocks review.
  const isBlocked = (row: (typeof rows)[number]) => {
    const applicant = applicantOf(row)
    return Boolean(applicant && !applicant.emailVerifiedAt)
  }

  const selected = rows.find((r) => r.id === selectedId) ?? rows.find((r) => !isBlocked(r))
  const selectedApplicant = selected ? applicantOf(selected) : undefined

  return (
    <PageBody className="max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px]">Organisation registrations</h1>
        <span className="code rounded-[3px] border border-danger-border bg-danger-surface px-2 py-1 text-[10px] tracking-[0.1em] text-danger uppercase">
          Cross-tenant review
        </span>
      </div>
      <p className="mb-6 max-w-[680px] text-sm leading-[1.55] text-muted-foreground">
        Applications from firms that want access to client records. Oldest first, 25 per page.
        Reviewing needs organisation management <em>and</em> cross-tenant access.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      {queue.isError ? (
        <Notice tone="danger" title={humanMessage(queue.error)} />
      ) : queue.isPending ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 overflow-hidden rounded-lg border border-border bg-card lg:w-[420px]">
            {rows.map((row) => {
              const blocked = isBlocked(row)
              const applicant = applicantOf(row)
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => setSelectedId(row.id)}
                  className={`block w-full border-b border-border/70 px-5 py-4 text-left last:border-0 ${
                    blocked ? 'bg-muted' : ''
                  } ${selected?.id === row.id ? 'border-l-[3px] border-l-primary bg-accent' : ''}`}
                >
                  <span className="mb-1 flex flex-wrap items-baseline justify-between gap-2.5">
                    <span
                      className={`text-[15px] font-semibold ${blocked ? 'text-muted-foreground' : ''}`}
                    >
                      {row.name}
                    </span>
                    <span className="code text-[11px] text-code-accent">{row.code}</span>
                  </span>
                  <span className="block text-[13px] wrap-anywhere text-muted-foreground">
                    {applicant
                      ? `${applicant.firstName} ${applicant.lastName} · ${applicant.email}`
                      : 'Loading applicant…'}
                  </span>
                  {blocked ? (
                    <span className="mt-2 inline-block rounded-[3px] border border-warning-border bg-warning-surface px-2 py-1 text-xs text-warning">
                      Applicant email not verified — cannot be reviewed yet
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {selected ? (
            <section className="min-w-0 flex-1 rounded-lg border border-border bg-card p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-4">
                <div>
                  <h2 className="mb-1 text-[22px]">{selected.name}</h2>
                  <span className="code text-xs text-code-accent">{selected.code}</span>
                </div>
                <StatusBadge code={selected.status} tone="warning" />
              </div>

              <Row
                label="Applicant"
                value={
                  selectedApplicant
                    ? `${selectedApplicant.firstName} ${selectedApplicant.lastName}`
                    : '—'
                }
              />
              <Row
                label="Email"
                value={selectedApplicant?.email ?? '—'}
                verified={Boolean(selectedApplicant?.emailVerifiedAt)}
                last
              />

              <Notice tone="info" className="my-5">
                Approving creates the organisation and the applicant's administrator membership in a
                single step. It cannot be reviewed again afterwards.
              </Notice>

              <Label htmlFor="reason" className="mb-1.5 block">
                Reason{' '}
                <span className="font-normal text-muted-foreground">
                  — required to reject, recorded either way
                </span>
              </Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: business registration number could not be verified."
              />
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                A rejection reason is emailed to the applicant. Write it for them to read.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
                <span className="max-w-[260px] text-[12.5px] leading-[1.5] text-muted-foreground">
                  Both decisions are final for this application.
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="text-danger"
                    disabled={!reason.trim() || reject.isPending}
                    onClick={() => reject.mutate(selected.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(selected.id)}
                    className="bg-success border-success hover:bg-success/90"
                  >
                    Approve and create organisation
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <Notice tone="info" title="Nothing awaiting review" className="flex-1">
              Registrations appear here once the applicant has verified their email address.
            </Notice>
          )}
        </div>
      )}
    </PageBody>
  )
}

function Row({
  label,
  value,
  verified,
  last,
}: {
  label: string
  value: string
  verified?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap justify-between gap-3 py-2.5 text-[13.5px] ${last ? '' : 'border-b border-border/70'}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        {verified ? <Check className="size-3.5 text-success" aria-hidden="true" /> : null}
        {value}
      </span>
    </div>
  )
}
