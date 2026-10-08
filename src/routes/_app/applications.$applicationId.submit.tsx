import { createFileRoute } from '@tanstack/react-router'
import { ApplicationSubmitView } from '@/modules/applications/views/application-submit-view'

export const Route = createFileRoute('/_app/applications/$applicationId/submit')({
  component: ApplicationSubmitView,
})
