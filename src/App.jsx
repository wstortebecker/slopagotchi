import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react'
import { usePet } from './game/store.jsx'
import AuthScreen from './screens/AuthScreen.jsx'
import Blog from './screens/Blog.jsx'
import BlogPost from './screens/BlogPost.jsx'
import Landing from './screens/Landing.jsx'
import Legal from './screens/Legal.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Paywall from './screens/Paywall.jsx'
import Personal from './screens/Personal.jsx'
import Zoo from './screens/Zoo.jsx'
import Scoreboard from './screens/Scoreboard.jsx'
import AdminDashboard from './screens/AdminDashboard.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Routes that need a hatched pet bounce to the hatch flow. */
function RequirePet({ children }) {
  const { hatched } = usePet()
  if (!hatched) return <Navigate to="/hatch" replace />
  return children
}

/** Signed-out visitors get the sign-in screen (this is the "hatch" trigger). */
function RequireAuth({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <AuthScreen />
      </SignedOut>
    </>
  )
}

/**
 * Signed-in users without an active subscription see the paywall. The flag is
 * set server-side (see /api/confirm) after a verified Stripe payment, so it
 * persists across devices and can't be flipped from the client.
 */
function RequireSubscription({ children }) {
  const { user, isLoaded } = useUser()
  if (!isLoaded) return null
  if (user?.publicMetadata?.subscribed === true) return children
  return <Paywall />
}

/**
 * Handles the redirect back from Stripe Checkout: ?stripe=success&session_id=…
 * is verified server-side, the Clerk user is refreshed to pick up the new
 * subscription flag, then the query is stripped so a refresh doesn't re-run it.
 */
function StripeReturn() {
  const { getToken, isSignedIn } = useAuth()
  const { user } = useUser()
  useEffect(() => {
    if (!isSignedIn) return undefined
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') !== 'success') return undefined
    const sessionId = params.get('session_id')
    if (!sessionId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        await fetch(`/api/confirm?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled) await user?.reload()
      } catch {
        /* leave them on the paywall; they can retry */
      }
      const clean = window.location.pathname + window.location.hash
      window.history.replaceState({}, '', clean)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])
  return null
}

/** Auth + subscription gate, applied to everything behind the paywall. */
function Gated({ children }) {
  return (
    <RequireAuth>
      <RequireSubscription>{children}</RequireSubscription>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <StripeReturn />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/terms" element={<Legal doc="terms" />} />
        <Route path="/privacy" element={<Legal doc="privacy" />} />
        <Route path="/refunds" element={<Legal doc="refunds" />} />
        <Route
          path="/hatch"
          element={
            <Gated>
              <Onboarding />
            </Gated>
          }
        />
        <Route
          path="/play"
          element={
            <Gated>
              <RequirePet>
                <Personal />
              </RequirePet>
            </Gated>
          }
        />
        <Route
          path="/zoo"
          element={
            <Gated>
              <RequirePet>
                <Zoo />
              </RequirePet>
            </Gated>
          }
        />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
