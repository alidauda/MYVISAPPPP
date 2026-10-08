import { createFileRoute } from '@tanstack/react-router'
import { TravellerDetailView } from '@/modules/travellers/views/traveller-detail-view'

export const Route = createFileRoute('/_app/travellers/$clientId/')({
  component: TravellerDetailView,
})
