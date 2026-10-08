import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginView } from '@/modules/auth/views/login-view'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search) => searchSchema.parse(search),
  component: LoginView,
})
