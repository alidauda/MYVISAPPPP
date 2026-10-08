import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { humanMessage } from '@/api/problem'
import { useFamilyMutations } from '@/features/family/hooks/use-family'
import { useSession } from '@/features/auth/hooks/use-session'
import { AuthLayout, PanelList } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'

const route = getRouteApi('/_auth/family-migration')

export function FamilyMigrationView() {
  const { token } = route.useSearch()
  const navigate = useNavigate()
  const { account, isAuthenticated } = useSession()
  const family = useFamilyMutations()
  const [banner, setBanner] = useState<string | null>(null)

  async function accept() {
    if (!token) return
    setBanner(null)
    try {
      await family.acceptMigration.mutateAsync(token)
      await navigate({ to: '/travellers' })
    } catch (error) {
      setBanner(humanMessage(error))
    }
  }

  return (
    <AuthLayout
      headline="The file moves with you, intact."
      lede="Identifiers, document versions and application history are preserved exactly. Nothing is copied or re-uploaded — ownership changes, the record does not."
      panelFooter="Record handover"
      stamp="Transfer"
      aside={
        <PanelList
          items={[
            'Your traveller record and its documents.',
            'Applications your family manager owns for you, with their timelines.',
            'Applications other people own stay with them.',
          ]}
        />
      }
    >
      <h1 className="mb-3 text-[32px] leading-[1.2]">Take over your own record</h1>

      {!token ? (
        <>
          <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
            This link is missing its token. Open the one from your email on this device.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </>
      ) : !isAuthenticated ? (
        <>
          <p className="mb-6 text-[15.5px] leading-[1.6] text-label">
            Sign in first. The invitation only works on the verified account whose address matches
            it.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/login" search={{ redirect: `/family-migration?token=${token}` }}>
              Sign in to continue
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="mb-5 text-[15.5px] leading-[1.6] text-label">
            After you accept, you manage the record — and your family manager no longer has access
            through the family relationship.
          </p>

          {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

          <Notice tone="info" className="mb-3.5">
            Signed in as <span className="code text-[13px]">{account?.email}</span>. The invitation
            must match this address.
          </Notice>

          <Notice tone="warning" className="mb-6">
            This cannot be undone from here. If you want them to keep managing the record, simply
            close this page — ignoring the invitation leaves everything as it is.
          </Notice>

          <Button
            size="lg"
            className="w-full"
            disabled={family.acceptMigration.isPending}
            onClick={() => void accept()}
          >
            {family.acceptMigration.isPending ? 'Transferring…' : 'Accept and take over the record'}
          </Button>

          <p className="mt-4 text-[12.5px] leading-[1.55] text-muted-foreground">
            Consent is a separate, optional thing. You do not need to have given it to accept this.
          </p>
        </>
      )}
    </AuthLayout>
  )
}
