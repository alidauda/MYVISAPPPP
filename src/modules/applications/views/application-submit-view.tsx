import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import {
  useApplication,
  useApplicationQuestions,
  useSubmitInitial,
} from '@/features/applications/hooks/use-applications'
import { countOutstanding, isVisible, toDefaultValues } from '@/features/applications/lib/answers'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/applications/$applicationId/submit')

/** The two stages `submit-initial` walks through, one call each. */
const STAGES = [
  {
    from: 'DRAFT',
    title: 'Submit your information',
    transition: 'DRAFT → INITIAL_INFORMATION_SUBMITTED',
  },
  {
    from: 'INITIAL_INFORMATION_SUBMITTED',
    title: 'Submit your documents',
    transition: 'INITIAL_INFORMATION_SUBMITTED → INITIAL_DOCUMENTS_SUBMITTED',
  },
] as const

export function ApplicationSubmitView() {
  const { applicationId } = route.useParams()
  const navigate = useNavigate()
  const application = useApplication(applicationId)
  const questions = useApplicationQuestions(applicationId)
  const submit = useSubmitInitial(applicationId)
  const [comment, setComment] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  if (application.isPending || questions.isPending) {
    return (
      <PageBody>
        <Skeleton className="mb-4 h-10 w-80" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </PageBody>
    )
  }

  if (application.isError || questions.isError) {
    return (
      <PageBody>
        <Notice tone="danger" title={humanMessage(application.error ?? questions.error)} />
      </PageBody>
    )
  }

  const app = application.data
  const payload = questions.data
  const values = toDefaultValues(payload.questions)
  const visible = payload.questions.filter((q) => isVisible(q, values))
  const outstanding = countOutstanding(payload.questions, values)
  const answered = visible.length - outstanding

  const stageIndex = STAGES.findIndex((stage) => stage.from === app.status)
  const canSubmit = stageIndex >= 0

  async function onSubmit() {
    setBanner(null)
    try {
      await submit.mutateAsync(comment.trim() || undefined)
      setComment('')
      // Render whatever status came back rather than guessing the next one.
      await navigate({ to: '/applications/$applicationId/submit', params: { applicationId } })
    } catch (error) {
      setBanner(humanMessage(error))
    }
  }

  return (
    <PageBody className="max-w-[860px]">
      <div className="mb-3 flex flex-wrap items-center gap-3.5">
        <span className="code text-xs text-code-accent">{app.reference}</span>
        <StatusBadge code={app.status} tone={statusTone(app.status)} />
      </div>
      <h1 className="mb-2 text-[30px]">Check, then submit</h1>
      <p className="mb-6 text-[15px] leading-[1.55] text-muted-foreground">
        Submission happens in two steps: your information first, then your documents. Each one moves
        the application forward on its own.
      </p>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <section className="mb-5 rounded-lg border border-border bg-card p-6 sm:p-7">
        <Legend className="mb-4.5 w-full border-b border-border/70 pb-3">
          How submission works
        </Legend>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row">
          {STAGES.map((stage, index) => {
            const current = index === stageIndex
            const done = stageIndex < 0 || index < stageIndex
            return (
              <div key={stage.from} className="flex flex-1 items-stretch gap-4">
                <div
                  className={`flex-1 rounded-md border p-4.5 ${
                    current ? 'border-primary bg-accent' : 'border-border'
                  }`}
                >
                  <div
                    className={`code mb-1.5 text-[10px] tracking-[0.1em] uppercase ${
                      current ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Step {index + 1}
                    {current ? ' — now' : done ? ' — done' : ''}
                  </div>
                  <div className="mb-1.5 text-sm font-semibold">{stage.title}</div>
                  <div className="code text-[11px] leading-[1.5] text-muted-foreground">
                    {stage.transition}
                  </div>
                </div>
                {index === 0 ? (
                  <ArrowRight
                    className="hidden size-4 self-center text-muted-foreground sm:block"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-5 rounded-lg border border-border bg-card p-6 sm:p-7">
        <Legend className="w-full border-b border-border/70 pb-3">Before you send it</Legend>

        <CheckRow ok label="Traveller record linked" detail={app.visaCode} />
        <CheckRow
          ok={outstanding === 0}
          label={`${answered} of ${visible.length} questions answered`}
          action={
            outstanding > 0 ? (
              <Link
                to="/applications/$applicationId/questions"
                params={{ applicationId }}
                className="text-[13px] text-primary underline-offset-4 hover:underline"
              >
                Finish answers
              </Link>
            ) : undefined
          }
        />

        <p className="mt-3 border-t border-border/70 pt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
          We check this for you before sending — the backend does not yet enforce completeness, so
          submitting with gaps only delays the case.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 sm:p-7">
        <Label htmlFor="submit-comment" className="mb-2 block">
          Anything the officer should know?{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="submit-comment"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="For example: my travel dates are fixed by a conference."
        />

        <Notice tone="warning" className="my-4.5">
          Once submitted, your answers stop being editable. If something needs changing, an officer
          sends the application back as <span className="code text-[13px]">CORRECTION_REQUIRED</span>{' '}
          and you can edit again.
        </Notice>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="max-w-[380px] text-[12.5px] leading-[1.5] text-muted-foreground">
            The button disables while the request is in flight, so a double click cannot submit
            twice.
          </span>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link to="/applications/$applicationId/questions" params={{ applicationId }}>
                Back to answers
              </Link>
            </Button>
            <Button disabled={!canSubmit || submit.isPending} onClick={() => void onSubmit()}>
              {submit.isPending
                ? 'Submitting…'
                : canSubmit
                  ? STAGES[stageIndex].title
                  : 'Already submitted'}
            </Button>
          </div>
        </div>
      </section>
    </PageBody>
  )
}

function CheckRow({
  ok,
  label,
  detail,
  action,
}: {
  ok: boolean
  label: string
  detail?: string
  action?: React.ReactNode
}) {
  const Icon = ok ? CircleCheck : CircleAlert
  return (
    <div className="flex items-center gap-3.5 border-b border-border/70 py-3.5 last:border-0">
      <Icon
        className={`size-[18px] shrink-0 ${ok ? 'text-success' : 'text-warning'}`}
        aria-hidden="true"
      />
      <span className="flex-1 text-sm">{label}</span>
      {detail ? <span className="text-[13px] text-muted-foreground">{detail}</span> : null}
      {action}
    </div>
  )
}
