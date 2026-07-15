import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { onDeviceModels } from './build/on-device-models-vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), onDeviceModels()],
  server: {
    proxy: {
      '/history': 'http://localhost:8000',
    },
  },
})
