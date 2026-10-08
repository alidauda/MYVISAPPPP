import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'border-border bg-background text-label',
  info: 'border-info-border bg-info-surface text-info',
  success: 'border-success-border bg-success-surface text-success',
  warning: 'border-warning-border bg-warning-surface text-warning',
  danger: 'border-danger-border bg-danger-surface text-danger',
}

/**
 * Backend status codes are shown verbatim, in mono. They are identifiers, not
 * prose, and staff quote them to each other — translating them helps nobody.
 */
export function StatusBadge({
  code,
  tone = 'neutral',
  className,
}: {
  code: string
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'code inline-flex items-center rounded-[3px] border px-2 py-1 text-[10.5px] leading-none',
        tones[tone],
        className,
      )}
    >
      {code}
    </span>
  )
}

/** Display grouping only — the backend transition policy is authoritative. */
export function statusTone(status: string): Tone {
  if (['DRAFT', 'CORRECTION_REQUIRED'].includes(status)) return 'info'
  if (['AWAITING_ADDITIONAL_INFORMATION', 'PENDING_APPROVAL', 'PENDING_EMAIL_VERIFICATION'].includes(status))
    return 'warning'
  if (['IN_PROGRESS', 'UNDER_REVIEW', 'READY_FOR_SUBMISSION', 'SUBMITTED_TO_AUTHORITY'].includes(status))
    return 'info'
  if (['APPROVED', 'ACTIVE'].includes(status)) return 'success'
  if (['REJECTED', 'SUSPENDED', 'DISABLED'].includes(status)) return 'danger'
  return 'neutral'
}
