import { createFileRoute } from '@tanstack/react-router'
import { OfferingView } from '@/modules/catalogue/views/offering-view'

export const Route = createFileRoute('/_app/catalogue/$code')({
  component: OfferingView,
})
