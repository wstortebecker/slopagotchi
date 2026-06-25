import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the /api functions during `vite dev` (Vercel runs them in production).
// Maps a request path to its handler module and invokes it with (req, res).
function devApi() {
  const routes = {
    '/api/checkout': './api/checkout.js',
    '/api/confirm': './api/confirm.js',
    '/api/metrics': './api/metrics.js',
  }
  return {
    name: 'dev-stripe-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0]
        const mod = routes[path]
        if (!mod) return next()
        import(mod)
          .then((m) => m.default(req, res))
          .catch((e) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose server-side secrets to the dev API handlers via process.env.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'CLERK_SECRET_KEY', 'ADMIN_EMAILS', 'PUBLIC_BASE_URL']) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    // Relative base so the production build also works from a static host or sub-path.
    base: './',
    plugins: [react(), devApi()],
    server: { port: 5273, open: false },
  }
})
