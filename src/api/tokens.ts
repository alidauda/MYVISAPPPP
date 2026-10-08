import type { TokenPair } from '@/features/auth/lib/schemas'

const REFRESH_KEY = 'myvisapp.refresh'

/**
 * The access token lives in memory only, as the integration guide requires.
 * The refresh token has to survive a reload for session restore to work at
 * all, so it goes to localStorage — a deliberate, documented trade-off. It is
 * rotated on every use, and a reused one revokes its whole family server-side.
 *
 * Neither token is ever put in a URL, a log, or an analytics call.
 */
let accessToken: string | null = null
const listeners = new Set<() => void>()

function announce() {
  for (const listener of listeners) listener()
}

export const tokenStore = {
  getAccessToken: () => accessToken,

  getRefreshToken: () => {
    try {
      return localStorage.getItem(REFRESH_KEY)
    } catch {
      return null
    }
  },

  /** Replace both tokens together — never one without the other. */
  set(pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>) {
    accessToken = pair.accessToken
    try {
      localStorage.setItem(REFRESH_KEY, pair.refreshToken)
    } catch {
      /* private mode: the session simply will not survive a reload */
    }
    announce()
  },

  clear() {
    accessToken = null
    try {
      localStorage.removeItem(REFRESH_KEY)
    } catch {
      /* ignore */
    }
    announce()
  },

  /** True when a reload might be able to restore a session. */
  canRestore: () => Boolean(accessToken) || Boolean(tokenStore.getRefreshToken()),

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
