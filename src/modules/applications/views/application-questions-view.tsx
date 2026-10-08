import { useMemo, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import {
  useApplication,
  useApplicationQuestions,
  useSaveAnswers,
} from '@/features/applications/hooks/use-applications'
import { answersEditable } from '@/features/applications/lib/schemas'
import {
  buildAnswersSchema,
  countOutstanding,
  inDisplayOrder,
  isRequired,
  isVisible,
  toAnswerPayload,
  toDefaultValues,
  type AnswersForm,
} from '@/features/applications/lib/answers'
import { InformationRequests } from '@/features/applications/components/information-requests'
import { QuestionField } from '@/features/applications/components/question-field'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Legend } from '@/components/shared/legend'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/applications/$applicationId/questions')

export function ApplicationQuestionsView() {
  const { applicationId } = route.useParams()
  const application = useApplication(applicationId)
  const questions = useApplicationQuestions(applicationId)

  if (application.isPending || questions.isPending) {
    return (
      <PageBody>
        <Skeleton className="mb-4 h-8 w-80" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </PageBody>
    )
  }

  if (application.isError || questions.isError) {
    return (
      <PageBody>
        <Notice tone="danger" title={humanMessage(application.error ?? questions.error)}>
          <Link to="/applications" className="underline">
            Back to your applications
          </Link>
        </Notice>
      </PageBody>
    )
  }

  return (
    <AnswersForm_
      applicationId={applicationId}
      application={application.data}
      questions={questions.data}
    />
  )
}

function AnswersForm_({
  applicationId,
  application,
  questions: payload,
}: {
  applicationId: string
  application: NonNullable<ReturnType<typeof useApplication>['data']>
  questions: NonNullable<ReturnType<typeof useApplicationQuestions>['data']>
}) {
  const save = useSaveAnswers(applicationId)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const editable = answersEditable(application.status)
  const questions = payload.questions

  /**
   * Visibility and conditional requirement both depend on the answers being
   * validated, so the schema cannot be built once — it is rebuilt each pass
   * from the values in hand.
   */
  const resolver = useMemo<Resolver<AnswersForm>>(
    () => (values, context, options) =>
      zodResolver(buildAnswersSchema(questions, values))(values, context, options),
    [questions],
  )

  const form = useForm<AnswersForm>({
    resolver,
    defaultValues: toDefaultValues(questions),
    mode: 'onBlur',
  })

  // Live values drive which questions are on screen at all.
  const values = useWatch({ control: form.control }) as AnswersForm
  const visible = questions.filter((q) => isVisible(q, values))
  const outstanding = countOutstanding(questions, values)
  const answered = visible.length - countOutstanding(questions, values)

  const onSave = form.handleSubmit(async (submitted) => {
    setBanner(null)
    try {
      await save.mutateAsync(toAnswerPayload(questions, submitted))
      setSavedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    } catch (error) {
      // Nothing is reset: a failed save must not cost the person their typing.
      setBanner(humanMessage(error))
    }
  })

  return (
    <PageBody className="max-w-[920px]">
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <span className="code text-xs text-code-accent">{application.reference}</span>
        <StatusBadge code={application.status} tone={statusTone(application.status)} />
        <span className="text-[13.5px] text-muted-foreground">
          {application.visaCode} · definition v{payload.visaDefinitionVersion}
        </span>
      </div>

      <h1 className="mb-2 text-[30px]">Your answers</h1>
      <p className="mb-6 max-w-[620px] text-[15px] leading-[1.6] text-muted-foreground">
        These questions come from the version of{' '}
        <span className="code text-sm">{payload.visaCode}</span> this application was started on.
        They will not change under you, even if the offering is updated.
      </p>

      <InformationRequests applicationId={application.id} />

      {!editable ? (
        <Notice tone="warning" title="These answers are locked" className="mb-6">
          Answers can be edited while an application is a draft, or if a case officer sends it back
          for correction. This one is {application.status.toLowerCase().replaceAll('_', ' ')}.
        </Notice>
      ) : null}

      {banner ? (
        <Notice tone="danger" title="We could not save that" className="mb-6">
          {banner} Your answers are still on screen — nothing was lost.
        </Notice>
      ) : null}

      <Form {...form}>
        <form onSubmit={onSave} noValidate>
          <fieldset disabled={!editable} className="m-0 border-0 p-0">
            <div className="flex flex-col gap-6">
              <section className="rounded-lg border border-border bg-card p-6 sm:p-7">
                <Legend className="mb-5 w-full border-b border-border/70 pb-3">
                  {payload.visaCode} · v{payload.visaDefinitionVersion}
                </Legend>
                <div className="flex flex-col gap-5">
                  {inDisplayOrder(visible).map((question) => (
                    <QuestionField
                      key={question.code}
                      question={question}
                      control={form.control}
                      required={isRequired(question, values)}
                      conditional={(question.rules ?? []).some((r) => r.effect === 'DISPLAY')}
                    />
                  ))}
                </div>
              </section>
            </div>
          </fieldset>

          <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border bg-background/95 py-4 backdrop-blur">
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{answered}</span> of{' '}
                {visible.length} answered
              </span>
              {outstanding > 0 ? <span>{outstanding} still required</span> : null}
              {save.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Saving…
                </span>
              ) : savedAt ? (
                <span className="flex items-center gap-1.5 text-success">
                  <Check className="size-3.5" aria-hidden="true" />
                  Saved {savedAt}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="outline"
                // One save in flight at a time: each PUT replaces the entire
                // answer set, so an overlapping pair could resurrect a stale value.
                disabled={!editable || save.isPending}
              >
                Save draft
              </Button>
              <Button asChild>
                <Link to="/applications/$applicationId/submit" params={{ applicationId }}>
                  Review and submit
                </Link>
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <p className="mt-4 text-[12.5px] leading-[1.55] text-muted-foreground">
        Each save sends the whole answer set, not only what changed. Questions that an earlier
        answer has hidden are not submitted — an answer that no longer applies should not survive.
      </p>
    </PageBody>
  )
}
