import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CheckEmailView } from '@/modules/auth/views/check-email-view'

const searchSchema = z.object({ email: z.string().optional() })

export const Route = createFileRoute('/_auth/check-email')({
  validateSearch: (search) => searchSchema.parse(search),
  component: CheckEmailView,
})
