import { Link, useNavigate } from 'react-router-dom'
import Logo from '../ds/Logo.jsx'
import PixelIcon from '../ds/PixelIcon.jsx'
import { usePet } from '../game/store.jsx'

const TABS = [
  { id: 'mine', label: 'My Pet', to: '/play' },
  { id: 'zoo', label: 'The Zoo', to: '/zoo' },
]

export default function TopBar({ active = 'mine' }) {
  const navigate = useNavigate()
  const { pet, level } = usePet()
  const streak = pet?.streakDays ?? 0
  const clean = streak > 0

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: 64,
        background: 'var(--surface-card)',
        borderBottom: '2px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-nav)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <button
          onClick={() => navigate('/')}
          title="Home"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <Logo size={30} />
        </button>
        <nav style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={t.to}
              style={{
                fontWeight: 800,
                fontSize: 14,
                padding: '8px 12px',
                borderRadius: 'var(--radius-pill)',
                color: active === t.id ? 'var(--accent)' : 'var(--ink-2)',
                background: active === t.id ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontWeight: 800,
            fontSize: 13,
            color: clean ? 'var(--health-thriving)' : 'var(--ink-3)',
            background: clean ? 'color-mix(in srgb, var(--health-thriving) 14%, white)' : 'var(--paper-2)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <PixelIcon name={clean ? 'sprout' : 'slop'} scale={2.5} color={clean ? 'var(--health-thriving)' : 'var(--slop)'} />
          {streak}-day slop-free streak
        </div>
        <div
          title={`Level ${level}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontWeight: 900,
            fontSize: 12,
            color: 'var(--ink-2)',
            padding: '6px 10px 6px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '2px solid var(--line)',
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--lcd-screen)',
              boxShadow: 'var(--shadow-screen)',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid var(--lcd-bezel)',
            }}
          >
            <PixelIcon name="heart" scale={2} />
          </span>
          LV {level}
        </div>
      </div>
    </header>
  )
}
