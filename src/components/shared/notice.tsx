import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-info-border bg-info-surface text-info', icon: Info },
  success: { box: 'border-success-border bg-success-surface text-success', icon: CheckCircle2 },
  warning: { box: 'border-warning-border bg-warning-surface text-warning', icon: AlertTriangle },
  danger: { box: 'border-danger-border bg-danger-surface text-danger', icon: XCircle },
}

/**
 * The single alert shape used across the product. `title` is the sentence a
 * person acts on; `children` carries the detail.
 */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}) {
  const { box, icon: Icon } = tones[tone]
  return (
    <div
      role={role ?? (tone === 'danger' || tone === 'warning' ? 'alert' : 'status')}
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3',
        // Enters on its own when React mounts it — a banner a person is
        // waiting on, so the movement is small and the settle is fast.
        'translate-y-0 opacity-100 transition-[opacity,transform] duration-200 ease-[var(--ease-out-expo)]',
        'starting:-translate-y-1 starting:opacity-0',
        // Reduced motion: fade only, nothing travels.
        'motion-reduce:transition-[opacity] motion-reduce:starting:translate-y-0',
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 size-[15px] shrink-0" aria-hidden="true" />
      <div className="text-[13.5px] leading-[1.5]">
        {title ? <div className="mb-0.5 font-semibold">{title}</div> : null}
        {children}
      </div>
    </div>
  )
}
