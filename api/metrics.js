import Stripe from 'stripe'
import { createClerkClient } from '@clerk/backend'
import { json, getUserId } from './_lib.js'

/**
 * GET /api/metrics
 * Live business metrics computed from Stripe, in USD. Admin-only: the caller
 * must be a signed-in Clerk user whose email is in ADMIN_EMAILS.
 *
 * Env: STRIPE_SECRET_KEY, CLERK_SECRET_KEY, ADMIN_EMAILS (comma-separated)
 */

// Normalize any billing interval to a per-month multiplier.
const MONTHLY_FACTOR = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 }

function monthlyCents(item) {
  const price = item.price
  if (!price || !price.recurring || price.currency !== 'usd') return 0
  const amount = (price.unit_amount || 0) * (item.quantity || 1)
  const factor = MONTHLY_FACTOR[price.recurring.interval] ?? 1
  const count = price.recurring.interval_count || 1
  return (amount * factor) / count
}

export default async function handler(req, res) {
  const userId = await getUserId(req)
  if (!userId) return json(res, 401, { error: 'Not signed in' })

  const { STRIPE_SECRET_KEY, CLERK_SECRET_KEY, ADMIN_EMAILS } = process.env
  if (!STRIPE_SECRET_KEY) return json(res, 500, { error: 'Stripe is not configured.' })

  // --- admin gate: revenue data must not be visible to every signed-in user ---
  let email = null
  try {
    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })
    const user = await clerk.users.getUser(userId)
    email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null
  } catch {
    /* fall through to 403 */
  }
  const admins = (ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!admins.length || !email || !admins.includes(email.toLowerCase())) {
    return json(res, 403, { error: 'Not authorized — your email is not in ADMIN_EMAILS.', email })
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    // MRR + subscriber count from active & trialing subscriptions (USD).
    let mrrCents = 0
    let activeSubscribers = 0
    let nonUsdSubscriptions = 0
    for (const status of ['active', 'trialing']) {
      let startingAfter
      for (let page = 0; page < 20; page++) {
        const list = await stripe.subscriptions.list({
          status,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        })
        for (const sub of list.data) {
          activeSubscribers += 1
          for (const item of sub.items.data) {
            if (item.price?.currency !== 'usd') nonUsdSubscriptions += 1
            mrrCents += monthlyCents(item)
          }
        }
        if (!list.has_more || list.data.length === 0) break
        startingAfter = list.data[list.data.length - 1].id
      }
    }

    // Revenue over the last 30 days (USD succeeded charges, net of refunds).
    const since = Math.floor(Date.now() / 1000) - 30 * 86400
    let revenueCents = 0
    let payments = 0
    let startingAfter
    for (let page = 0; page < 20; page++) {
      const list = await stripe.charges.list({
        limit: 100,
        created: { gte: since },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const ch of list.data) {
        if (ch.paid && ch.status === 'succeeded' && ch.currency === 'usd') {
          revenueCents += ch.amount - (ch.amount_refunded || 0)
          payments += 1
        }
      }
      if (!list.has_more || list.data.length === 0) break
      startingAfter = list.data[list.data.length - 1].id
    }

    const mrr = Math.round(mrrCents) / 100
    return json(res, 200, {
      currency: 'usd',
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      activeSubscribers,
      revenue30d: Math.round(revenueCents) / 100,
      payments30d: payments,
      nonUsdSubscriptions,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('metrics failed:', e)
    return json(res, 500, { error: 'Could not load metrics from Stripe.' })
  }
}
