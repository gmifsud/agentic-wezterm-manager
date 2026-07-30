import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Rolldown canonicalises module ids through symlinks/junctions, while `root` defaults to the
// uncanonicalised cwd. vite:build-html names the emitted HTML with path.relative(root, id), and
// rolldown rejects names that escape the output directory — so root must be canonical too.
const root = realpathSync(fileURLToPath(new URL('.', import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  root,
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: [
        '**/agentic-wezterm.config.json',
        '**/agentic-wezterm.generated.lua'
      ]
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
