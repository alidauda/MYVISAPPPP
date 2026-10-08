import { createFileRoute } from '@tanstack/react-router'
import { CatalogueView } from '@/modules/catalogue/views/catalogue-view'

export const Route = createFileRoute('/_app/catalogue/')({
  component: CatalogueView,
})
