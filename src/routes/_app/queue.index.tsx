import { createFileRoute } from '@tanstack/react-router'
import { queueFiltersSchema } from '@/features/processing/lib/schemas'
import { QueueView } from '@/modules/processing/views/queue-view'

export const Route = createFileRoute('/_app/queue/')({
  // Eight filters, validated by the same schema the API layer sends. A
  // filtered queue is a link a colleague can open and see the same rows.
  validateSearch: (search) => queueFiltersSchema.parse(search),
  component: QueueView,
})
