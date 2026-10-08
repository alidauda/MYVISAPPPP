import { Link } from '@tanstack/react-router'
import { useSession } from '@/features/auth/hooks/use-session'
import { PageBody } from '@/components/shared/app-shell'
import { Legend } from '@/components/shared/legend'
import { StatusBadge, statusTone } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'

export function AccountSettingsView() {
  const { account, signOut } = useSession()
  if (!account) return null

  return (
    <PageBody className="max-w-[900px]">
      <h1 className="mb-1.5 text-[30px]">Your account</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        This is your sign-in account. Passport details live on traveller records, not here.
      </p>

      <section className="mb-5 rounded-lg border border-border bg-card p-6">
        <Legend className="mb-4 w-full border-b border-border/70 pb-3">Sign-in and security</Legend>

        <Row
          title="Email address"
          detail={account.email}
          badge={
            account.emailVerified ? (
              <span className="text-[12.5px] text-success">Verified</span>
            ) : (
              <span className="text-[12.5px] text-warning">Not verified</span>
            )
          }
          action={<span className="text-[12.5px] text-muted-foreground">Contact support to change it</span>}
        />

        <Row
          title="Password"
          detail="Changing it signs you out on every device."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/forgot-password">Send me a reset link</Link>
            </Button>
          }
        />

        <Row
          title="Two-factor authentication"
          detail={account.mfaEnabled ? 'Enabled on this account.' : 'Not enabled on this account.'}
          action={
            <span className="code rounded-[3px] border border-border bg-background px-2 py-1 text-[10.5px] text-muted-foreground">
              MFA {account.mfaEnabled ? 'ON' : 'OFF'}
            </span>
          }
        />

        <Row
          title="This device"
          detail="Signing out ends this session only."
          last
          action={
            <Button size="sm" variant="outline" className="text-danger" onClick={() => void signOut()}>
              Sign out
            </Button>
          }
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <Legend className="mb-4 w-full border-b border-border/70 pb-3">Account</Legend>
        <div className="flex justify-between gap-3 border-b border-border/70 py-2.5 text-[13.5px]">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge code={account.status} tone={statusTone(account.status)} />
        </div>
        <div className="flex justify-between gap-3 border-b border-border/70 py-2.5 text-[13.5px]">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">
            {account.firstName} {account.lastName}
          </span>
        </div>
        <div className="flex justify-between gap-3 py-2.5 text-[13.5px]">
          <span className="text-muted-foreground">Effective permissions</span>
          <span className="font-medium">{account.permissions.length}</span>
        </div>
      </section>

      <p className="mt-5 max-w-[640px] text-[12.5px] leading-[1.55] text-muted-foreground">
        Only an administrator of an organisation can end a membership, and nobody can end their own.
        Ask them, or contact support.
      </p>
    </PageBody>
  )
}

function Row({
  title,
  detail,
  badge,
  action,
  last,
}: {
  title: string
  detail: string
  badge?: React.ReactNode
  action?: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 py-4 ${last ? '' : 'border-b border-border/70'}`}
    >
      <span className="min-w-[200px] flex-1">
        <span className="block text-[14.5px] font-semibold">{title}</span>
        <span className="flex flex-wrap items-center gap-2.5 pt-0.5 text-[13px] text-muted-foreground">
          {detail}
          {badge}
        </span>
      </span>
      {action}
    </div>
  )
}
