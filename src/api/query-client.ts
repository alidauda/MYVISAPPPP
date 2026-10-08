import { QueryClient } from '@tanstack/react-query'
import { ApiProblem } from './problem'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry(failureCount, error) {
        // Never retry a refusal or a response that failed its schema — the
        // answer will not change. Only a timeout or rate limit is worth another try.
        if (error instanceof ApiProblem) {
          if (error.code === 'UNEXPECTED_RESPONSE') return false
          if (error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) {
            return false
          }
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})

/**
 * Cache keys carry the organisation context, so switching organisations can
 * never show another tenant's rows from cache.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  clients: (org: string | null, params: unknown) => ['clients', org, params] as const,
  client: (org: string | null, id: string) => ['client', org, id] as const,
  applications: (org: string | null, params: unknown) => ['applications', org, params] as const,
  application: (org: string | null, id: string) => ['application', org, id] as const,
  catalogue: () => ['visa-catalogue'] as const,
  organisationRegistrations: (params: unknown) => ['organisation-registrations', params] as const,
} as const
