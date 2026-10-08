import { createFileRoute } from '@tanstack/react-router'
import { AccountSettingsView } from '@/modules/admin/views/account-settings-view'

export const Route = createFileRoute('/_app/account')({ component: AccountSettingsView })
