import { useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Lock } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import { applicationsApi } from '@/features/applications/api/applications-api'
import { useApplication, useApplicationQuestions } from '@/features/applications/hooks/use-applications'
import {
  useCaseChecklist,
  useCaseMutations,
  useCaseNotes,
  useOfficers,
} from '@/features/processing/hooks/use-queue'
import { isVisible, toDefaultValues } from '@/features/applications/lib/answers'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const route = getRouteApi('/_app/queue/$applicationId')

export function CaseView() {
  const { applicationId } = route.useParams()
  const application = useApplication(applicationId)
  const questions = useApplicationQuestions(applicationId)
  const notes = useCaseNotes(applicationId)
  const checklist = useCaseChecklist(applicationId)
  const officers = useOfficers([application.data?.managingOrganisationId])
  const actions = useCaseMutations(applicationId)

  const timeline = useQuery({
    queryKey: ['timeline', applicationId],
    queryFn: () => applicationsApi.timeline(applicationId),
  })

  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  if (application.isPending || questions.isPending) {
    return (
      <PageBody className="max-w-[1400px]">
        <Skeleton className="mb-4 h-10 w-96" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </PageBody>
    )
  }
  if (application.isError) {
    return (
      <PageBody>
        <Notice tone="danger" title={humanMessage(application.error)} />
      </PageBody>
    )
  }

  const app = application.data
  const payload = questions.data
  const values = payload ? toDefaultValues(payload.questions) : {}
  const answered = payload?.questions.filter((q) => isVisible(q, values)) ?? []

  const run = async (work: Promise<unknown>) => {
    setBanner(null)
    try {
      await work
    } catch (error) {
      setBanner(humanMessage(error))
    }
  }

  return (
    <PageBody className="max-w-[1400px]">
      <Link
        to="/queue"
        search={{}}
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-label no-underline hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to queue
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="code text-[12.5px] text-code-accent">{app.reference}</span>
        <StatusBadge code={app.status} tone={statusTone(app.status)} />
        <span className="font-display text-[22px] font-semibold">{app.visaCode}</span>
        <span className="code text-[11.5px] text-muted-foreground">
          definition v{app.visaDefinitionVersion}
        </span>
      </div>

      {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <Legend>Answers — read against {app.visaCode} v{app.visaDefinitionVersion}</Legend>
            <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
              The version this application was started on. Later versions of the offering do not
              apply here.
            </p>
          </div>

          <div className="px-6 py-2">
            {answered.map((question) => {
              const value = values[question.code]
              // Show what the applicant chose, not the stored code behind it.
              const label = (v: string) =>
                question.options?.find((option) => option.value === v)?.label ?? v
              const shown =
                value === undefined || value === null || value === '' ? (
                  <span className="text-muted-foreground">Not answered</span>
                ) : Array.isArray(value) ? (
                  value.map(label).join(', ')
                ) : typeof value === 'boolean' ? (
                  value ? 'Yes' : 'No'
                ) : (
                  label(String(value))
                )
              return (
                <div
                  key={question.code}
                  className="flex flex-wrap items-baseline gap-4 border-b border-border/70 py-3.5 last:border-0"
                >
                  <span className="w-full shrink-0 sm:w-[280px]">
                    <span className="block text-[13.5px] text-label">{question.label}</span>
                    <span className="code block pt-0.5 text-[10.5px] text-muted-foreground/80">
                      {question.code} · {question.type}
                    </span>
                  </span>
                  <span className="min-w-[180px] flex-1 text-[14.5px] leading-[1.5] font-medium">
                    {shown}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="border-t border-border px-6 py-5">
            <Legend className="mb-3.5">Timeline</Legend>
            <ol className="m-0 list-none p-0">
              {(timeline.data ?? []).map((entry, index) => (
                <li
                  key={index}
                  className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border/70 py-2.5 last:border-0"
                >
                  <StatusBadge code={entry.status} tone={statusTone(entry.status)} />
                  <span className="min-w-0 text-[12.5px] wrap-anywhere text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                    {entry.previousStatus ? ` · from ${entry.previousStatus}` : ''}
                    {entry.reason ? ` · “${entry.reason}”` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[400px]">
          <section className="rounded-lg border border-border bg-card p-5">
            <Legend className="mb-3.5">Assignment</Legend>
            <Label htmlFor="officer" className="mb-1.5">
              Processing officer
            </Label>
            <Select
              value={
                officers.data.some((o) => o.id === app.assignedToUserId)
                  ? (app.assignedToUserId ?? undefined)
                  : undefined
              }
              onValueChange={(userId) =>
                void run(actions.assign.mutateAsync({ userId, reason: 'Queue triage' }))
              }
            >
              <SelectTrigger id="officer" className="w-full">
                <SelectValue
                  placeholder={officers.isPending ? 'Loading members…' : 'Assign someone'}
                />
              </SelectTrigger>
              <SelectContent>
                {officers.data.map((officer) => (
                  <SelectItem key={officer.id} value={officer.id}>
                    {officer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-muted-foreground">
              {!app.managingOrganisationId
                ? 'This application belongs to no organisation, so there is nobody to assign it to.'
                : officers.isError
                  ? 'The members of this organisation could not be loaded.'
                  : app.assignedToUserId &&
                      !officers.isPending &&
                      !officers.data.some((o) => o.id === app.assignedToUserId)
                    ? 'Assigned to someone who is no longer an active member.'
                    : 'Active members of the organisation that manages this application.'}
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <Legend className="mb-3.5">Schedule</Legend>
            <div className="mb-3 flex gap-1.5">
              {(['LOW', 'NORMAL', 'HIGH'] as const).map((priority) => (
                <Button
                  key={priority}
                  size="sm"
                  variant="outline"
                  className="flex-1 px-2 text-[12.5px]"
                  onClick={() =>
                    void run(actions.schedule.mutateAsync({ priority, dueAt: dueAt || null }))
                  }
                >
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            <Label htmlFor="due" className="mb-1.5">
              Due
            </Label>
            <Input
              id="due"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
            <p className="mt-2 text-xs leading-[1.5] text-muted-foreground">
              Stored with a timezone. Shown to staff in yours.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <Legend>Checklist</Legend>
              <span className="text-xs text-muted-foreground">
                {(checklist.data ?? []).filter((c) => c.completed).length} of{' '}
                {(checklist.data ?? []).length}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {(checklist.data ?? []).map((item) => (
                <label key={item.code} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) =>
                      void run(
                        actions.toggleChecklist.mutateAsync({
                          code: item.code,
                          label: item.label,
                          completed: Boolean(checked),
                        }),
                      )
                    }
                    className="mt-0.5"
                  />
                  <span className="text-[13px] leading-[1.4] text-label">{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <Legend className="mb-3.5">Request information</Legend>
            <Textarea
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Name the document, not the internal reason for doubting it."
            />
            <Notice tone="warning" className="my-3">
              Sending this moves the case to{' '}
              <span className="code text-[13px]">AWAITING_ADDITIONAL_INFORMATION</span> when the
              workflow allows. That transition needs the change-status permission too.
            </Notice>
            <Button
              size="sm"
              disabled={!message.trim() || actions.requestInformation.isPending}
              onClick={() =>
                void run(
                  actions.requestInformation
                    .mutateAsync({ message })
                    .then(() => setMessage('')),
                )
              }
            >
              Send request
            </Button>
          </section>

          <section className="overflow-hidden rounded-lg border border-danger bg-card">
            <div className="flex items-center gap-2.5 border-b border-danger-border bg-danger-surface px-5 py-2.5">
              <Lock className="size-3.5 text-danger" aria-hidden="true" />
              <span className="code text-[10px] tracking-[0.12em] text-danger uppercase">
                Internal notes — never shown to the applicant
              </span>
            </div>
            <div className="p-5">
              {(notes.data?.content ?? []).map((item, index) => (
                <div
                  key={index}
                  className="border-b border-border/70 pb-3 last:border-0 last:pb-0 [&+div]:pt-3"
                >
                  <p className="m-0 text-[13px] leading-[1.55] text-label">{item.note}</p>
                </div>
              ))}

              <div className="mt-4 border-t border-border/70 pt-3.5">
                <Label htmlFor="note" className="mb-1.5">
                  Add a note
                </Label>
                <Textarea
                  id="note"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Visible to staff on this case only"
                />
                <Button
                  size="sm"
                  className="mt-2.5"
                  disabled={!note.trim() || actions.addNote.isPending}
                  onClick={() => void run(actions.addNote.mutateAsync(note).then(() => setNote('')))}
                >
                  Post note
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageBody>
  )
}
