import { createFileRoute } from '@tanstack/react-router'
import { ApplicationDocumentsView } from '@/modules/applications/views/application-documents-view'

export const Route = createFileRoute('/_app/applications/$applicationId/documents')({
  component: ApplicationDocumentsView,
})
