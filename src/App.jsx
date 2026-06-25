import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { usePet } from './game/store.jsx'
import Landing from './screens/Landing.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Personal from './screens/Personal.jsx'
import Zoo from './screens/Zoo.jsx'
import Scoreboard from './screens/Scoreboard.jsx'

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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/hatch" element={<Onboarding />} />
        <Route
          path="/play"
          element={
            <RequirePet>
              <Personal />
            </RequirePet>
          }
        />
        <Route
          path="/zoo"
          element={
            <RequirePet>
              <Zoo />
            </RequirePet>
          }
        />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
