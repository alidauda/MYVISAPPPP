import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/api/query-client'
import { config } from '@/lib/config'
import { routeTree } from './routeTree.gen'
import './styles/globals.css'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

if (config.useMocks) {
  const lines = [
    '[mock] running against the dev server — no backend needed.',
    '  Seeded: ada@example.com / "correct horse battery"',
    '  chidi@example.com is unverified, to exercise that refusal',
    '  Verification and reset links print in your terminal, not here',
    '  Fixture state resets when the dev server restarts',
  ]
  console.info(`%c${lines.join('\n')}`, 'color:#4416c4')
}
