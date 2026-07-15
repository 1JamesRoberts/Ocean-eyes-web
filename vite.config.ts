import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { onDeviceModels, sites } from './build/sites-vite-plugin'

// https://vite.dev/config/
export default defineConfig(async () => {
  const isTest = process.env.VITEST === 'true'
  if (isTest) {
    return {
      plugins: [react(), tailwindcss()],
    }
  }

  const { cloudflare } = await import('@cloudflare/vite-plugin')

  return {
    plugins: [
      react(),
      tailwindcss(),
      onDeviceModels(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'server' },
        config: {
          main: './worker/index.ts',
          compatibility_date: '2026-07-15',
          assets: {
            not_found_handling: 'single-page-application',
          },
        },
      }),
    ],
    server: {
      proxy: {
        '/history': 'http://localhost:8000',
      },
    },
  }
})
