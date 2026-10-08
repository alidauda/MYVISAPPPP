import { createFileRoute } from '@tanstack/react-router'
import { InviteView } from '@/modules/family/views/invite-view'

export const Route = createFileRoute('/_app/travellers/$clientId/invite')({ component: InviteView })
