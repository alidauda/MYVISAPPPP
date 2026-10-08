import { createFileRoute } from '@tanstack/react-router'
import { CaseView } from '@/modules/processing/views/case-view'

export const Route = createFileRoute('/_app/queue/$applicationId')({
  component: CaseView,
})
