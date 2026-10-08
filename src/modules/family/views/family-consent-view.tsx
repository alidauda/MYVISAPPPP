import { useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { humanMessage } from '@/api/problem'
import { useFamilyMutations } from '@/features/family/hooks/use-family'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Notice } from '@/components/shared/notice'
import { Button } from '@/components/ui/button'

const route = getRouteApi('/_auth/family-consent')

export function FamilyConsentView() {
  const { token } = route.useSearch()
  const family = useFamilyMutations()
  const [answer, setAnswer] = useState<boolean | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  async function record(granted: boolean) {
    if (!token) return
    setBanner(null)
    try {
      await family.recordConsent.mutateAsync({ token, granted })
      setAnswer(granted)
    } catch (error) {
      setBanner(humanMessage(error))
    }
  }

  return (
    <AuthLayout
      headline="Nothing is recorded until you choose."
      lede="Opening this page does not answer for you. Consent is recorded only when you press one of the two buttons, and it can be changed if a fresh invitation is sent."
      panelFooter="Family traveller consent"
      stamp="Your choice"
    >
      {!token ? (
        <>
          <h1 className="mb-3 text-[32px]">This link is missing its token</h1>
          <p className="mb-7 text-[15.5px] leading-[1.6] text-label">
            Open the link from your email on this device.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </>
      ) : answer !== null ? (
        <>
          <h1 className="mb-3 text-[32px]">{answer ? 'Thank you' : 'Recorded'}</h1>
          <Notice tone={answer ? 'success' : 'info'} className="mb-6">
            {answer
              ? 'Your agreement has been recorded. You can change it if a fresh invitation is sent.'
              : 'We have recorded that you did not agree. This does not stop the record being managed — it records your answer.'}
          </Notice>
          <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
            You can close this page. The link will not work again.
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-3 text-[32px] leading-[1.2]">
            Someone manages a traveller record for you
          </h1>
          <p className="mb-6 text-[15.5px] leading-[1.6] text-label">
            They are asking whether you agree to that. The record holds your passport details and
            any documents they upload for your visa applications.
          </p>

          {banner ? <Notice tone="danger" title={banner} className="mb-5" /> : null}

          <div className="mb-6 overflow-hidden rounded-md border border-border">
            <div className="legend-rule border-b border-border/70 bg-muted px-4 py-2.5">
              What agreeing does, and does not do
            </div>
            <div className="px-4 pb-3">
              <Point ok>It records that you know about the record and agree to it.</Point>
              <Point>It does not transfer the record to you, or give you an account.</Point>
              <Point last>
                Declining does not stop them managing it — it records that you did not agree.
              </Point>
            </div>
          </div>

          <div className="mb-4.5 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={family.recordConsent.isPending}
              onClick={() => void record(true)}
            >
              Yes, I agree
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              disabled={family.recordConsent.isPending}
              onClick={() => void record(false)}
            >
              No, I do not agree
            </Button>
          </div>

          <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
            If you were not expecting this, close the page and tell us — the link stops working once
            it is used.
          </p>
        </>
      )}
    </AuthLayout>
  )
}

function Point({ ok, last, children }: { ok?: boolean; last?: boolean; children: string }) {
  const Icon = ok ? Check : X
  return (
    <div className={`flex gap-2.5 py-2.5 ${last ? '' : 'border-b border-border/70'}`}>
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${ok ? 'text-success' : 'text-danger'}`}
        aria-hidden="true"
      />
      <span className="text-[13.5px] leading-[1.5] text-label">{children}</span>
    </div>
  )
}
