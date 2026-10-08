import type { ErrorRequestHandler } from 'express'
import type { Plugin } from 'vite'

/**
 * Serves the MSW handlers from the dev server itself.
 *
 * The browser service worker was the wrong transport: it has a lifecycle of
 * its own, so a stale registration, a first load before activation, or a fresh
 * tab could each leave requests falling through to Vite as mystery 404s.
 * Answering in the dev server removes that entirely — requests are real HTTP,
 * visible in the network tab, shared across tabs, and they survive a reload.
 *
 * The trade-off is that fixture state lives in the dev-server process and
 * resets when it restarts. That is honest: it is a fixture, not a database.
 */
export function mockApiPlugin(backendOrigin?: string): Plugin {
  return {
    name: 'myvisapp:mock-api',
    apply: 'serve',
    async configureServer(server) {
      // The caller resolves this from loadEnv, which reads .env files as well
      // as the shell. Reading process.env here would miss a value set in
      // .env and leave the mock answering requests meant for the backend.
      if (backendOrigin) {
        server.config.logger.info(`  ➜  Mock API: off — proxying to ${backendOrigin}`)
        return
      }

      const [{ default: express }, { createMiddleware }, { handlers }] = await Promise.all([
        import('express'),
        import('@mswjs/http-middleware'),
        import('./handlers'),
      ])

      // The MSW middleware reaches for Express's own request helpers, which
      // Vite's connect server does not provide — so give it a real Express
      // app to live in rather than shimming pieces of one.
      const api = express()
      api.use(express.json())
      api.use(createMiddleware(...handlers))

      // And never let a fixture bug take the dev server down with it.
      const onError: ErrorRequestHandler = (error, _request, response, _next) => {
        server.config.logger.error(`[mock] handler threw: ${String(error)}`)
        response.status(500).json({
          success: false,
          code: 'MOCK_HANDLER_ERROR',
          message: 'The mock handler threw. See the dev server output.',
          status: 500,
          timestamp: new Date().toISOString(),
        })
      }
      api.use(onError)

      server.middlewares.use('/api/v1', api)
      server.config.logger.info('  ➜  Mock API: /api/v1 (no backend needed)')
    },
  }
}
