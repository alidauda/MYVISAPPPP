import { createFileRoute } from '@tanstack/react-router'
import { ApplicationQuestionsView } from '@/modules/applications/views/application-questions-view'

export const Route = createFileRoute('/_app/applications/$applicationId/questions')({
  component: ApplicationQuestionsView,
})
