import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { config } from '@/lib/config'
import { apiSuccess } from './envelope'
import { ApiProblem, NetworkProblem } from './problem'
import { tokenStore } from './tokens'
import { tokenPairSchema } from '@/features/auth/lib/schemas'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Public endpoints (login, register, reset) opt out of the bearer token. */
    skipAuth?: boolean
    /** Set once a request has already been replayed after a refresh. */
    retriedAfterRefresh?: boolean
  }
}

/** Called when a refresh fails and the session is over for good. */
let onSessionEnded: () => void = () => {}
export function setSessionEndedHandler(handler: () => void) {
  onSessionEnded = handler
}

const correlationId = () => crypto.randomUUID()

/**
 * Bare instance for the refresh call itself. It must not carry the response
 * interceptor, or a failing refresh would try to refresh itself.
 */
const bare = axios.create({ baseURL: config.apiBaseUrl })

export const http: AxiosInstance = axios.create({ baseURL: config.apiBaseUrl })

http.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  request.headers.set('X-Correlation-ID', correlationId())
  if (!request.skipAuth) {
    const token = tokenStore.getAccessToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
  }
  return request
})

/* ------------------------------------------------------------------ *
 * Refresh: one in flight at a time.
 *
 * Several requests can meet a 401 at once. They must not each spend the
 * refresh token — it rotates, and reusing a revoked one revokes the whole
 * family server-side. The first 401 starts a refresh; every other caller
 * awaits that same promise.
 * ------------------------------------------------------------------ */
let refreshInFlight: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await bare.post(
      '/auth/refresh',
      { refreshToken },
      { headers: { 'X-Correlation-ID': correlationId() } },
    )
    const parsed = apiSuccess(tokenPairSchema).safeParse(response.data)
    if (!parsed.success) return false
    // Both tokens replaced together.
    tokenStore.set(parsed.data.data)
    return true
  } catch {
    return false
  }
}

function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Turn any axios failure into our own error type. Raw text never escapes. */
function toProblem(error: AxiosError): ApiProblem | NetworkProblem {
  if (!error.response) return new NetworkProblem(error)

  const path = error.config?.url ?? undefined

  const payload = error.response.data as Record<string, unknown> | undefined
  if (payload && typeof payload === 'object' && payload.success === false) {
    return new ApiProblem({
      status: (payload.status as number) || error.response.status,
      code: (payload.code as string) ?? 'UNEXPECTED_RESPONSE',
      message: (payload.message as string) ?? 'Something went wrong. Please try again.',
      validationErrors: payload.validationErrors as ApiProblem['validationErrors'],
      traceId: payload.traceId as string | undefined,
      path: (payload.path as string | undefined) ?? path,
    })
  }

  return new ApiProblem({
    status: error.response.status,
    code: 'UNEXPECTED_RESPONSE',
    message: 'Something went wrong. Please try again.',
    path,
  })
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config

    const canRetry =
      error.response?.status === 401 &&
      request &&
      !request.skipAuth &&
      !request.retriedAfterRefresh

    if (canRetry) {
      const refreshed = await refreshOnce()
      if (!refreshed) {
        tokenStore.clear()
        onSessionEnded()
        throw toProblem(error)
      }
      // Exactly one replay, with the rotated token.
      request.retriedAfterRefresh = true
      return http(request)
    }

    throw toProblem(error)
  },
)
