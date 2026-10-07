import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// `vite --mode mock` swaps the Firebase SDK for local fakes in src/mock (no network, seeded test data)
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: mode === 'mock'
      ? [{
          find: /^firebase\/(app|auth|firestore|storage)$/,
          replacement: fileURLToPath(new URL('./src/mock/$1.js', import.meta.url))
        }]
      : []
  }
}))
