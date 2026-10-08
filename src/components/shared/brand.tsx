import { cn } from '@/lib/utils'

/**
 * The Myvisapp mark: a violet disc carrying a white aircraft.
 *
 * This is a vector approximation of the supplied logo, good enough to ship
 * against. Replace it with the real asset when you have it — drop the SVG in
 * and keep this component's shape, and nothing else has to change.
 */
export function Mark({ tone = 'brand', className }: { tone?: 'brand' | 'light'; className?: string }) {
  // On the dark panel the disc would disappear, so the plane carries the mark.
  const disc = tone === 'light' ? '#FFFFFF' : 'var(--primary)'
  const plane = tone === 'light' ? 'var(--brand-deep)' : '#FFFFFF'

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn('size-6', className)}>
      <circle cx="24" cy="24" r="24" fill={disc} />
      <path
        d="M9.5 30.8c6.4 2.1 13.6 1.7 20.2-1.1 4-1.7 7.4-4.1 10-7l-4.9-2.2c-2 2-4.5 3.7-7.4 5l-1.5.6-4.3-9.8-3.6 1.5 1.5 9.9-4.6.9-2.4-4.2-2.9 1.2 0 5.2z"
        fill={plane}
      />
    </svg>
  )
}

export function Wordmark({
  tone = 'brand',
  className,
}: {
  tone?: 'brand' | 'light'
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Mark tone={tone} className={tone === 'light' ? 'size-8' : 'size-7'} />
      <span
        className={cn(
          'font-display font-semibold tracking-[-0.02em]',
          tone === 'light' ? 'text-[21px] text-white' : 'text-[18px] text-primary',
        )}
      >
        Myvisapp
      </span>
    </span>
  )
}
