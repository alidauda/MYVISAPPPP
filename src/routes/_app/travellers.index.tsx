import { createFileRoute } from '@tanstack/react-router'
import { TravellersView } from '@/modules/travellers/views/travellers-view'

export const Route = createFileRoute('/_app/travellers/')({ component: TravellersView })
