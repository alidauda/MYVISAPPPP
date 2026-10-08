import type { ReactNode } from 'react'
import { Wordmark } from '@/components/shared/brand'

/**
 * The split screen every public auth page sits in: a deep-navy panel carrying
 * the promise, and a paper column carrying the form. The panel is decorative,
 * so it collapses away below `lg` rather than stacking.
 */
export function AuthLayout({
  headline,
  lede,
  panelFooter = 'Secure applicant portal',
  stamp,
  aside,
  children,
  topRight,
}: {
  headline: ReactNode
  lede: ReactNode
  panelFooter?: string
  stamp?: string
  aside?: ReactNode
  children: ReactNode
  topRight?: ReactNode
}) {
  return (
    <div className="flex min-h-svh bg-card">
      <aside className="bg-brand-deep relative hidden w-[512px] shrink-0 flex-col justify-between overflow-hidden px-12 py-14 text-white lg:flex">
        <Wordmark tone="light" />

        <div className="relative z-10 max-w-[380px]">
          <h2 className="mb-4 text-[36px] leading-[1.18] font-semibold">{headline}</h2>
          <p className="text-[15px] leading-[1.6] text-[#CFC2F5]">{lede}</p>
          {aside ? <div className="mt-7">{aside}</div> : null}
        </div>

        <div className="code relative z-10 text-[10.5px] tracking-[0.14em] text-[#A594DC] uppercase">
          {panelFooter}
        </div>

        {stamp ? (
          <div
            aria-hidden="true"
            className="code absolute right-[-40px] bottom-26 rotate-[-14deg] rounded-md border-[1.5px] border-[var(--brand-light)] px-5 py-3 text-xs tracking-[0.24em] text-[var(--brand-light)] uppercase opacity-40"
          >
            {stamp}
          </div>
        ) : null}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-5 py-8 sm:px-10 lg:px-20 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <div className="ml-auto text-[13.5px] text-muted-foreground">{topRight}</div>
        </div>

        <div className="flex flex-1 items-center py-10">
          <div className="enter-rise w-full max-w-[430px]">{children}</div>
        </div>
      </main>
    </div>
  )
}

/** The reassurance list used on the sign-in panel. */
export function PanelList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none border-t border-white/15 p-0">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2.5 border-b border-white/15 py-3.5 text-[13.5px] leading-[1.45] text-[#DCD3F8]"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 size-[15px] shrink-0">
            <path d="M3 8.4l3.2 3.2L13 4.9" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  )
}
