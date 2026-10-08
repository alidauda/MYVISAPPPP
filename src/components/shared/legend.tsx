import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The uppercase mono rule that heads every section. */
export function Legend({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('legend-rule', className)}>{children}</div>
}
