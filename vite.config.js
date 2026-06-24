import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the production build also works when opened from a static
// host or a sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5273, open: false },
})
