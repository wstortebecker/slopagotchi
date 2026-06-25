import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Protect, SignedIn, SignedOut } from '@clerk/clerk-react'
import { usePet } from './game/store.jsx'
import { PLAN_SLUG } from './game/billing.js'
import AuthScreen from './screens/AuthScreen.jsx'
import Blog from './screens/Blog.jsx'
import BlogPost from './screens/BlogPost.jsx'
import Landing from './screens/Landing.jsx'
import Legal from './screens/Legal.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Paywall from './screens/Paywall.jsx'
import Personal from './screens/Personal.jsx'
import Zoo from './screens/Zoo.jsx'

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

/** Signed-in users without an active plan see the Clerk Billing pricing table. */
function RequireSubscription({ children }) {
  return (
    <Protect plan={PLAN_SLUG} fallback={<Paywall />}>
      {children}
    </Protect>
  )
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
