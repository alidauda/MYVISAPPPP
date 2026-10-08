import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordView } from '@/modules/auth/views/reset-password-view'

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ResetPasswordView,
})
