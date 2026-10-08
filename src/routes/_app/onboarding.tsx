import { createFileRoute } from '@tanstack/react-router'
import { TravellerProfileView } from '@/modules/onboarding/views/traveller-profile-view'

export const Route = createFileRoute('/_app/onboarding')({
  component: TravellerProfileView,
})
