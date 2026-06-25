import { verifyToken } from '@clerk/backend'

/** Send a JSON response (works for both Vercel functions and the Vite dev middleware). */
export function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/**
 * Verify the Clerk session token from the Authorization header and return the
 * user id. Returns null if missing/invalid — never trust a client-supplied id.
 */
export async function getUserId(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return payload.sub
  } catch {
    return null
  }
}
