import { useRef } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Check, FileText, Upload } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import {
  useApplication,
  useApplicationQuestions,
} from '@/features/applications/hooks/use-applications'
import { useOffering } from '@/features/catalogue/hooks/use-catalogue'
import { useApplicationDocuments } from '@/features/documents/hooks/use-documents'
import { answersEditable } from '@/features/applications/lib/schemas'
import { PageBody } from '@/components/shared/app-shell'
import { Notice } from '@/components/shared/notice'
import { Legend } from '@/components/shared/legend'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_app/applications/$applicationId/documents')

export function ApplicationDocumentsView() {
  const { applicationId } = route.useParams()
  const application = useApplication(applicationId)
  const questions = useApplicationQuestions(applicationId)
  const offering = useOffering(questions.data?.visaCode ?? '')
  const { uploads, attached, start } = useApplicationDocuments(applicationId)

  if (application.isPending || questions.isPending || offering.isPending) {
    return (
      <PageBody>
        <Skeleton className="mb-4 h-10 w-80" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </PageBody>
    )
  }

  if (application.isError || questions.isError || offering.isError) {
    return (
      <PageBody>
        <Notice
          tone="danger"
          title={humanMessage(application.error ?? questions.error ?? offering.error)}
        />
      </PageBody>
    )
  }

  const app = application.data
  const requirements = offering.data.requirements
  const editable = answersEditable(app.status)
  const done = requirements.filter((r) => attached.some((a) => a.categoryCode === r.code))

  return (
    <PageBody className="max-w-[920px]">
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <span className="code text-xs text-code-accent">{app.reference}</span>
        <StatusBadge code={app.status} tone={statusTone(app.status)} />
        <span className="text-[13.5px] text-muted-foreground">{app.visaCode}</span>
      </div>

      <h1 className="mb-2 text-[30px]">Documents</h1>
      <p className="mb-6 max-w-[620px] text-[15px] leading-[1.6] text-muted-foreground">
        {done.length} of {requirements.length} in place. PDF, JPEG or PNG, up to 10 MB each — the
        file's real type has to match its extension.
      </p>

      {!editable ? (
        <Notice tone="warning" title="This application is no longer editable" className="mb-6">
          Documents can be added while it is a draft or under correction.
        </Notice>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-6 sm:p-7">
        <Legend className="mb-1 w-full border-b border-border/70 pb-3">
          Required for {offering.data.code}
        </Legend>

        {requirements.map((requirement) => {
          const upload = uploads[requirement.code]
          const version = attached.find((a) => a.categoryCode === requirement.code)
          return (
            <Row
              key={requirement.code}
              categoryCode={requirement.code}
              label={requirement.name}
              description={requirement.description ?? undefined}
              required={requirement.required}
              version={version?.versionNumber}
              upload={upload}
              disabled={!editable}
              onFile={(file) => void start(file, requirement.code)}
            />
          )
        })}

        <p className="mt-4 border-t border-border/70 pt-3.5 text-[12.5px] leading-[1.55] text-muted-foreground">
          Your application keeps the exact version you attach. Replacing a document later adds a new
          version and never alters an application an officer has already looked at.
        </p>
      </section>

      <Notice tone="info" className="mt-5" title="Uploads are not listed back yet">
        The backend exposes no endpoint for listing an application's documents, so this page can
        only show what you uploaded in this session. A reload will look empty even though the files
        are stored. Worth closing backend-side before launch.
      </Notice>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button asChild variant="outline">
          <Link to="/applications/$applicationId/questions" params={{ applicationId }}>
            Back to answers
          </Link>
        </Button>
        <Button asChild>
          <Link to="/applications/$applicationId/submit" params={{ applicationId }}>
            Review and submit
          </Link>
        </Button>
      </div>
    </PageBody>
  )
}

function Row({
  categoryCode,
  label,
  description,
  required,
  version,
  upload,
  disabled,
  onFile,
}: {
  categoryCode: string
  label: string
  description?: string
  required: boolean
  version?: number
  upload?: { filename: string; percent: number; error?: string }
  disabled: boolean
  onFile: (file: File) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const uploading = upload && !upload.error && upload.percent < 100

  return (
    <div className="flex flex-wrap items-center gap-3.5 border-b border-border/70 py-4 last:border-0">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border">
        {version ? (
          <Check className="size-4 text-success" aria-hidden="true" />
        ) : (
          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-[200px] flex-1">
        <span className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-[14.5px] font-semibold">{label}</span>
          <span className="code text-[10.5px] text-code-accent">{categoryCode}</span>
        </span>
        {upload?.error ? (
          <span className="block pt-1 text-[12.5px] text-danger">{upload.error}</span>
        ) : version ? (
          <span className="block pt-1 text-[12.5px] text-success">
            {upload?.filename} · attached as v{version}
          </span>
        ) : (
          <span className="block pt-1 text-[12.5px] text-muted-foreground">
            {description ?? (required ? 'Required' : 'Only if it applies to you')}
          </span>
        )}

        {uploading ? (
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-sm bg-border">
            <span
              className="block h-1 rounded-sm bg-primary transition-[width] duration-200"
              style={{ width: `${upload.percent}%` }}
            />
          </span>
        ) : null}
      </span>

      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
      <Button
        type="button"
        size="sm"
        variant={version ? 'outline' : 'default'}
        disabled={disabled || uploading}
        onClick={() => input.current?.click()}
      >
        <Upload className="size-3.5" aria-hidden="true" />
        {uploading ? `${upload.percent}%` : version ? 'Replace' : 'Upload'}
      </Button>
    </div>
  )
}
