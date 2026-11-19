import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { SITE_URL } from './src/config/site.js'

// `vite --mode mock` swaps the Firebase SDK for local fakes in src/mock (no network, seeded test data)
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    // Fills __SITE_URL__ in index.html from the one setting in src/config/site.js
    name: 'site-url-html',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL)
  }],
  resolve: {
    alias: mode === 'mock'
      ? [{
          find: /^firebase\/(app|auth|firestore|storage)$/,
          replacement: fileURLToPath(new URL('./src/mock/$1.js', import.meta.url))
        }]
      : []
  }
}))
