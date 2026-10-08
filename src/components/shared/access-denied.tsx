import { Link } from '@tanstack/react-router'
import { ShieldOff } from 'lucide-react'
import { PageBody } from './app-shell'
import { Button } from '@/components/ui/button'

/**
 * Shown when a guard refuses a route. It names what is missing without
 * confirming that anything exists behind it.
 */
export function AccessDenied({ what }: { what: string }) {
  return (
    <PageBody className="max-w-[560px]">
      <span className="mb-6 flex size-13 items-center justify-center rounded-md border border-danger-border bg-danger-surface">
        <ShieldOff className="size-6 text-danger" aria-hidden="true" />
      </span>
      <h1 className="mb-3 text-[30px]">You do not have access to this</h1>
      <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
        Your permissions do not cover {what}. An administrator can change that.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/applications">Back to your applications</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/account">Account settings</Link>
        </Button>
      </div>
      <p className="mt-6 text-[12.5px] leading-[1.55] text-muted-foreground">
        This is not retried automatically. The backend decides access, and a refusal is final until
        your permissions change.
      </p>
    </PageBody>
  )
}
