import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordView } from '@/modules/auth/views/forgot-password-view'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordView,
})
