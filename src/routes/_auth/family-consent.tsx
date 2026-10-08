import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FamilyConsentView } from '@/modules/family/views/family-consent-view'

const searchSchema = z.object({ token: z.string().optional() })

/** Public: the invited adult has no account and may never get one. */
export const Route = createFileRoute('/_auth/family-consent')({
  validateSearch: (search) => searchSchema.parse(search),
  component: FamilyConsentView,
})
