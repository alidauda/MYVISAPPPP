import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VerifyEmailView } from '@/modules/auth/views/verify-email-view'

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/_auth/verify-email')({
  validateSearch: (search) => searchSchema.parse(search),
  component: VerifyEmailView,
})
