import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { Wordmark } from '@/components/shared/brand'
import { useSession } from '@/features/auth/hooks/use-session'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function initials(first: string, last: string) {
  return `${first.at(0) ?? ''}${last.at(0) ?? ''}`.toUpperCase()
}

/** The signed-in chrome: mark, organisation context, account. */
export function AppShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  const { account, signOut, can } = useSession()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-15 items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link to="/applications" className="flex items-center">
              <Wordmark />
            </Link>
            <span aria-hidden="true" className="hidden h-[22px] w-px bg-border sm:block" />
            <span className="code hidden rounded-[3px] border border-border px-2.5 py-1.5 text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase sm:inline">
              Personal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void signOut()}
              className="h-9 gap-2 pr-2.5 pl-1.5"
            >
              <span className="flex size-6 items-center justify-center rounded-[3px] bg-primary text-[11px] font-semibold text-primary-foreground">
                {account ? initials(account.firstName, account.lastName) : '··'}
              </span>
              <span className="hidden text-[13.5px] font-medium sm:inline">
                {account ? `${account.firstName} ${account.lastName}` : 'Account'}
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </div>
        </div>
        {/* On a phone the tabs outgrow the screen; the fade says there is more to scroll to. */}
        <nav className="flex gap-6 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)] sm:px-8 md:[mask-image:none]">
          {nav ?? (
            <>
              <NavTab to="/applications">Applications</NavTab>
              <NavTab to="/travellers">Travellers</NavTab>
              <NavTab to="/catalogue">Catalogue</NavTab>
              {can('APPLICATION_READ_ALL') ? <NavTab to="/queue">Queue</NavTab> : null}
              {can('ORGANISATION_MANAGE') ? (
                <NavTab to="/organisation/members">Organisation</NavTab>
              ) : null}
              {can('USER_READ') ? <NavTab to="/admin/users">Admin</NavTab> : null}
              <NavTab to="/account">Account</NavTab>
            </>
          )}
        </nav>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  )
}

export function NavTab({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="pb-3 text-sm text-label no-underline data-[status=active]:-mb-px data-[status=active]:border-b-2 data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground"
    >
      {children}
    </Link>
  )
}

/** Centred content column, the width used by every signed-in page. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('enter-rise mx-auto w-full max-w-[880px] px-5 py-10 sm:px-8', className)}>
      {children}
    </div>
  )
}
