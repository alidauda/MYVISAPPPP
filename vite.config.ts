import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { mockApiPlugin } from './src/mocks/vite-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_API_ORIGIN?.replace(/\/$/, '')

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      mockApiPlugin(backend),
    ],
    resolve: {
      alias: { '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), './src') },
    },
    server: {
      port: 5173,
      // With a backend configured, /api/v1 is forwarded to it. The browser
      // only ever sees a same-origin request, so no CORS, no preflight, and
      // cookies or auth headers behave the same as they will in production
      // behind a reverse proxy.
      proxy: backend
        ? {
            '/api': {
              target: backend,
              changeOrigin: true,
              secure: false,
              configure(proxy) {
                proxy.on('error', (error) => {
                  console.error(`[proxy] ${backend} unreachable: ${error.message}`)
                })
              },
            },
          }
        : undefined,
    },
  }
})
