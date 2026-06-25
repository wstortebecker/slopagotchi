import { useEffect, useState } from 'react'
import { getPet } from '../api/client.js'
import { SLOP_CATEGORY_META, VERDICT_COLOR, moodFromPet } from '../api/mapping.js'

/* A single rubric bar: more slop points = fuller + redder. */
function CategoryBar({ label, value, max }) {
  const pct = Math.max(0, Math.min(1, (value || 0) / max))
  const color = pct > 0.66 ? 'var(--health-dead)' : pct > 0.33 ? 'var(--health-warning)' : 'var(--health-thriving)'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 38px', gap: 8, alignItems: 'center', fontSize: 12 }}>
      <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
      <span style={{ height: 8, borderRadius: 999, background: 'var(--paper-2)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct * 100}%`, background: color, transition: 'width var(--dur-base)' }} />
      </span>
      <span style={{ fontWeight: 800, color: 'var(--ink-3)', textAlign: 'right' }}>{value}/{max}</span>
    </div>
  )
}

function Delta({ delta }) {
  if (delta === undefined || delta === null) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  if (delta === 0) return <span style={{ color: 'var(--ink-3)' }}>±0</span>
  const improved = delta < 0
  return (
    <span style={{ color: improved ? 'var(--health-thriving)' : 'var(--slop)', fontWeight: 800 }}>
      {improved ? '▼' : '▲'} {Math.abs(delta)}
    </span>
  )
}

/* One expandable PR: header (score/verdict/title) + the "why" (reasons, rubric, medicine). */
function PrRow({ pr, open, onToggle }) {
  return (
    <div style={{ border: '2px solid var(--line)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: open ? 'var(--accent-soft)' : 'var(--surface-card)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 12,
            color: '#fff',
            background: VERDICT_COLOR[pr.latestVerdict] || 'var(--ink-3)',
            borderRadius: 8,
            padding: '5px 8px',
            minWidth: 34,
            textAlign: 'center',
          }}
        >
          {pr.latestScore}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pr.prTitle || pr.prUri.split('/').pop()}
          </span>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
            {pr.latestVerdict} · {pr.rounds} round{pr.rounds === 1 ? '' : 's'} · Δ <Delta delta={pr.delta} />
          </span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-sunken)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              slop by category {pr.confidence ? `· ${pr.confidence} confidence` : ''}
            </div>
            {SLOP_CATEGORY_META.map((c) => (
              <CategoryBar key={c.key} label={c.label} value={pr.categories?.[c.key] ?? 0} max={c.max} />
            ))}
          </div>

          {pr.reasons?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>why it scored this</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {pr.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {pr.medicine?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>💊 medicine</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {pr.medicine.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A modal that fetches and explains a teammate's slop score: their pet health,
 * every scored pull request, and — per PR — the rubric breakdown, the reasons it
 * scored that way, and the suggested "medicine". Real data from /api/pet/:handle.
 */
export default function PetInspector({ handle, onClose }) {
  const [state, setState] = useState({ status: 'loading', data: null })
  const [openPr, setOpenPr] = useState(0)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!handle) return undefined
    let alive = true
    setState({ status: 'loading', data: null })
    getPet(handle).then((res) => {
      if (!alive) return
      if (res.ok) setState({ status: 'ok', data: res.data })
      else if (res.status === 404) setState({ status: 'pending', data: null })
      else setState({ status: 'error', data: null })
    })
    return () => {
      alive = false
    }
  }, [handle])

  if (!handle) return null

  const pet = state.data?.pet ?? null
  const prs = state.data?.prs ?? []
  const mood = moodFromPet(pet)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Slop score for ${handle}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 1000)',
        background: 'rgba(20,18,28,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '86vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-card)',
          border: '3px solid var(--line)',
          borderRadius: 'var(--radius-lg, 18px)',
          boxShadow: 'var(--shadow-plastic, 0 20px 60px rgba(0,0,0,0.3))',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px', borderBottom: '2px solid var(--line)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--ink)' }}>why this score?</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', wordBreak: 'break-all' }}>{handle}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'var(--paper-2)', border: '2px solid var(--line)', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontWeight: 900, color: 'var(--ink-2)' }}
          >
            ×
          </button>
        </div>

        {/* body */}
        <div style={{ padding: 18, overflowY: 'auto' }}>
          {state.status === 'loading' && <p style={{ color: 'var(--ink-3)', fontWeight: 600 }}>loading their receipt…</p>}
          {state.status === 'error' && <p style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Couldn't reach the scorer right now. Try again shortly.</p>}
          {state.status === 'pending' && (
            <p style={{ color: 'var(--ink-3)', fontWeight: 600 }}>
              Registered — their pull requests are still being scored. Check back in a moment.
            </p>
          )}

          {state.status === 'ok' && (
            <>
              {pet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, fontSize: 14, fontWeight: 800 }}>
                  <span style={{ color: 'var(--ink-2)' }}>health</span>
                  <span style={{ color: 'var(--accent)' }}>{pet.health}/100</span>
                  <span style={{ color: 'var(--ink-3)', fontWeight: 700 }}>
                    · {pet.band ? `${pet.band} (${mood})` : 'no diagnoses yet'} · {pet.diagnosticCount} scored round{pet.diagnosticCount === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              {prs.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', fontWeight: 600 }}>No pull requests scored yet.</p>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 10 }}>
                    {prs.length} scored pull request{prs.length === 1 ? '' : 's'} — tap one to see why.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prs.map((pr, i) => (
                      <PrRow key={pr.prUri} pr={pr} open={openPr === i} onToggle={() => setOpenPr(openPr === i ? -1 : i)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
