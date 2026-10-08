import { createFileRoute } from '@tanstack/react-router'
import { RegisterView } from '@/modules/auth/views/register-view'

export const Route = createFileRoute('/_auth/register')({
  component: RegisterView,
})
