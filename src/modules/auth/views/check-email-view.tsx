import { getRouteApi, Link } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'

const route = getRouteApi('/_auth/check-email')

export function CheckEmailView() {
  const { email } = route.useSearch()

  return (
    <AuthLayout
      headline="We verify the address before the account opens."
      lede="An email address is how decisions, information requests and reset links reach you. Confirming it once keeps someone else from using yours."
      stamp="Pending"
      topRight={
        <span className="flex items-center gap-4">
          Already verified?
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <span className="mb-6 flex size-13 items-center justify-center rounded-md border border-info-border bg-info-surface">
        <Mail className="size-6 text-info" aria-hidden="true" />
      </span>

      <h1 className="mb-3 text-[34px]">Check your email</h1>
      <p className="mb-2 text-[15.5px] leading-[1.6] text-label">
        We sent a verification link to{' '}
        <span className="code text-[14.5px] font-medium text-foreground">
          {email ?? 'your email address'}
        </span>
        . Open it to finish setting up your account.
      </p>
      <p className="mb-6 text-sm leading-[1.6] text-muted-foreground">
        The link works once. If it has not arrived after a few minutes, check your spam folder.
      </p>

      {/* The backend offers no way to send the link again yet. */}
      <Notice tone="warning" className="mb-4" title="Lost or expired link?">
        A new link cannot be requested from here yet. Contact support and we will verify the address
        for you.
      </Notice>

      <Notice tone="info" className="mb-6">
        Registering does not sign you in. Until the address is verified, signing in is refused.
      </Notice>

      <div className="flex flex-col gap-2.5 border-t border-border pt-4.5">
        <Link to="/register" className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline">
          Entered the wrong address? Start again
        </Link>
        <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
          Never forward this link. Anyone who opens it can verify the account.
        </p>
      </div>
    </AuthLayout>
  )
}
