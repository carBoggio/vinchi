import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), wasm(), topLevelAwait(), viteCommonjs()],
  build: { target: 'esnext' },
  envDir: path.resolve(import.meta.dirname, '..'),
  envPrefix: ['VITE_', 'MIDNIGHT_NETWORK', 'VINCHI_NOTES_ADDRESS', 'MERCHANT_REGISTRY_ADDRESS'],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
