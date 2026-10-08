/**
 * Where the API lives.
 *
 * In development the app always calls **same-origin** `/api/v1`, and the dev
 * server decides who answers:
 *
 *   VITE_API_ORIGIN unset  → the mock handlers (src/mocks)
 *   VITE_API_ORIGIN set    → proxied to the real backend
 *
 * Going through the proxy rather than calling the backend's origin directly
 * means the browser never makes a cross-origin request, so CORS cannot be the
 * thing that breaks a local setup. In a production build there is no dev
 * server, so the origin goes on the URL and the backend must allow it.
 */
const origin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, '') ?? ''
const prefix = import.meta.env.VITE_API_PREFIX ?? '/api/v1'

export const config = {
  apiBaseUrl: import.meta.env.DEV ? prefix : `${origin}${prefix}`,
  /** Mocks answer only when no real origin is configured. */
  useMocks: import.meta.env.DEV && !import.meta.env.VITE_API_ORIGIN,
  backendOrigin: origin || null,
} as const
