import { createFileRoute } from '@tanstack/react-router'
import { AddTravellerView } from '@/modules/family/views/add-traveller-view'

export const Route = createFileRoute('/_app/travellers/new')({ component: AddTravellerView })
