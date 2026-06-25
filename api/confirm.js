import Stripe from 'stripe'
import { createClerkClient } from '@clerk/backend'
import { json, getUserId } from './_lib.js'

/**
 * POST /api/confirm?session_id=cs_...
 * Verifies (server-side) that the returning Checkout session was paid, belongs
 * to this Clerk user, and has an active subscription. If so, marks the Clerk
 * user as subscribed via publicMetadata so the entitlement persists across
 * devices and reloads.
 *
 * Env: STRIPE_SECRET_KEY, CLERK_SECRET_KEY
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const userId = await getUserId(req)
  if (!userId) return json(res, 401, { error: 'Not signed in' })

  const sessionId = new URL(req.url, 'http://localhost').searchParams.get('session_id')
  if (!sessionId) return json(res, 400, { error: 'Missing session_id' })

  const { STRIPE_SECRET_KEY, CLERK_SECRET_KEY } = process.env
  if (!STRIPE_SECRET_KEY) return json(res, 500, { error: 'Stripe is not configured.' })

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })

    const belongs = session.client_reference_id === userId || session.metadata?.clerkUserId === userId
    const sub = session.subscription
    const subActive = sub && typeof sub === 'object' && ['active', 'trialing'].includes(sub.status)
    const active = session.payment_status === 'paid' && belongs && !!subActive

    if (active) {
      const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { subscribed: true, stripeSubscriptionId: sub.id },
      })
    }
    return json(res, 200, { active })
  } catch (e) {
    console.error('confirm failed:', e)
    return json(res, 500, { error: 'Verification failed.' })
  }
}
