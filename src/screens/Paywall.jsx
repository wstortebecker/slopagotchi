import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Button, DeviceShell, PetScene } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import PaymentBadges from '../components/PaymentBadges.jsx'

/**
 * Shown to a signed-in user who does not yet have an active subscription.
 * The button starts a Stripe Checkout session (your own Stripe product) via
 * /api/checkout and redirects to Stripe. After payment, /api/confirm marks the
 * user as subscribed and RequireSubscription lets them through.
 */
export default function Paywall() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subscribe = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not start checkout.')
      }
      const { url } = await res.json()
      if (!url) throw new Error('No checkout URL returned.')
      window.location.href = url
    } catch (e) {
      setError(e.message || 'Could not reach checkout. Try again in a sec.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 880, display: 'grid', gap: 28, justifyItems: 'center' }}>
        <Logo size={30} />

        <DeviceShell shell="bubblegum" width={200} fill>
          <PetScene mood="hangry" scale={6} />
        </DeviceShell>

        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <h1 className="pixel-display" style={{ fontSize: 'clamp(22px, 3.4vw, 30px)', margin: 0 }}>
            your pet needs a <span style={{ color: 'var(--accent)' }}>subscription</span>.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '14px 0 0' }}>
            Keeping your pet alive — and out of the bottom of the team zoo — is the part we charge
            for. $20 a seat: go solo or bring the whole team. Self-serve, cancel anytime.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
          <Button size="lg" pixel={false} disabled={loading} onClick={subscribe}>
            {loading ? 'Opening checkout…' : 'Subscribe — $20/mo'}
          </Button>
          {error ? (
            <p style={{ color: 'var(--health-danger)', fontWeight: 700, fontSize: 14, margin: 0, textAlign: 'center' }}>
              {error}
            </p>
          ) : null}
        </div>

        <PaymentBadges style={{ justifyContent: 'center' }} />

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0, textAlign: 'center' }}>
          Secure checkout · powered by Stripe · 256-bit SSL
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', margin: 0, textAlign: 'center' }}>
          By subscribing you agree to our{' '}
          <Link to="/terms" style={{ color: 'var(--accent)', fontWeight: 800 }}>
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 800 }}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
