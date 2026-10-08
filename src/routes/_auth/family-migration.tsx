import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FamilyMigrationView } from '@/modules/family/views/family-migration-view'

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/_auth/family-migration')({
  validateSearch: (search) => searchSchema.parse(search),
  component: FamilyMigrationView,
})
