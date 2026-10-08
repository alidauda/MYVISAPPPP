import { useEffect, useRef } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { ApiProblem } from '@/api/problem'
import { useVerifyEmail } from '@/features/auth/hooks/use-session'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Legend } from '@/components/shared/legend'

const route = getRouteApi('/_auth/verify-email')

export function VerifyEmailView() {
  const { token } = route.useSearch()
  const navigate = useNavigate()
  const verify = useVerifyEmail()
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verify.mutate(token, {
      onSettled: () => {
        // The token is single-use: drop it from the URL so it cannot be
        // re-sent by a refresh, shared in a screenshot, or kept in history.
        void navigate({ to: '/verify-email', search: {}, replace: true })
      },
    })
  }, [token, verify, navigate])

  const failed = verify.isError
  const succeeded = verify.isSuccess
  const problem = verify.error instanceof ApiProblem ? verify.error : null

  return (
    <AuthLayout
      headline={succeeded ? 'Next: the person who is travelling.' : 'One link, used once.'}
      lede={
        succeeded
          ? 'Your account signs you in. A traveller profile holds the passport details an application is built from — yours first, then anyone you apply for.'
          : 'Verification links are single-use and expire. If this one has already been spent, ask for a fresh one and it will replace it.'
      }
      stamp={succeeded ? 'Cleared' : undefined}
    >
      {!token && !succeeded && !failed ? (
        <>
          <h1 className="mb-3 text-[32px]">Nothing to verify</h1>
          <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
            Open the link from your email on this device. It carries the token we need.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </>
      ) : null}

      {verify.isPending ? (
        <span className="flex items-center gap-2.5 text-[15px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Verifying your email address…
        </span>
      ) : null}

      {succeeded ? (
        <>
          <span className="mb-6 flex size-13 items-center justify-center rounded-md border border-success-border bg-success-surface">
            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
          </span>
          <h1 className="mb-3 text-[34px]">Email verified</h1>
          <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
            Your address is confirmed. Sign in to add your traveller profile and start an
            application.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>

          <div className="mt-7 border-t border-border pt-5">
            <Legend className="mb-2.5">If you registered an organisation</Legend>
            <p className="text-[13.5px] leading-[1.6] text-label">
              Verifying your address moves your organisation application into review. It does not
              approve it — you can sign in, but you will have no organisation access until a
              decision is made.
            </p>
          </div>
        </>
      ) : null}

      {failed ? (
        <>
          <span className="mb-6 flex size-13 items-center justify-center rounded-md border border-danger-border bg-danger-surface">
            <XCircle className="size-6 text-danger" aria-hidden="true" />
          </span>
          <h1 className="mb-3 text-[34px]">This link is no longer valid</h1>
          <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
            {problem?.message ??
              'Verification links can be used once. Request a new one and we will send it straight away.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/check-email" search={{}}>
                Send a new link
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        </>
      ) : null}
    </AuthLayout>
  )
}
