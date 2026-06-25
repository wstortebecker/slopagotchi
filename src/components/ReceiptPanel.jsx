import { useEffect, useState } from 'react'
import { Card } from '../ds/index.js'
import { usePet } from '../game/store.jsx'
import { getPet, githubSubjectKey } from '../api/client.js'

/* Renders a round's score delta vs. the previous round (▼ = less slop = good). */
function Delta({ delta }) {
  if (delta === undefined || delta === null) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  if (delta === 0) return <span>0</span>
  const improved = delta < 0
  return (
    <span style={{ color: improved ? 'var(--health-thriving)' : 'var(--slop)', fontWeight: 800 }}>
      {improved ? '▼' : '▲'} {Math.abs(delta)}
    </span>
  )
}

/**
 * The "slop receipt": the connected pet's real diagnostics from the backend —
 * scored Tangled pull requests with deltas, plus the latest reasons + medicine.
 * Only shown when the pet is linked to a Tangled handle; otherwise it nudges the
 * player to connect. Network failures degrade to a quiet, friendly message so
 * the local game is never blocked.
 */
export default function ReceiptPanel() {
  const { pet } = usePet()
  const handle = pet?.handle || ''
  // Standalone GitHub pets are keyed to `github:<login>` on the backend, not a
  // resolvable handle; everything else looks up by handle directly.
  const lookupKey = handle ? (pet?.source === 'github' ? githubSubjectKey(handle) : handle) : ''
  const [state, setState] = useState({ status: handle ? 'loading' : 'unlinked', data: null })

  useEffect(() => {
    if (!lookupKey) {
      setState({ status: 'unlinked', data: null })
      return undefined
    }
    let alive = true
    const load = async () => {
      const res = await getPet(lookupKey)
      if (!alive) return
      if (res.ok) setState({ status: 'ok', data: res.data })
      else if (res.status === 404) setState({ status: 'pending', data: null })
      else setState({ status: 'error', data: null })
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
    }
  }, [lookupKey])

  const prs = state.data?.prs ?? []
  const reasons = state.data?.latestReasons ?? []
  const medicine = state.data?.latestMedicine ?? []
  const backendPet = state.data?.pet ?? null

  return (
    <Card padding={20} radius={2} style={{ width: '100%', maxWidth: 480, boxShadow: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, margin: 0, color: 'rgba(0, 0, 0, 0.8)' }}>slop receipt</h3>
        {handle && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', wordBreak: 'break-all' }}>{handle}</span>
        )}
      </div>

      {state.status === 'unlinked' && (
        <p style={{ fontFamily: 'var(--font-lcd)', fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
          This pet plays locally. Re-hatch and connect a <strong>tangled.org</strong> handle to score your
          real pull requests and get a receipt of every slop incident.
        </p>
      )}

      {state.status === 'loading' && (
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0 }}>loading your receipt…</p>
      )}

      {state.status === 'error' && (
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
          Couldn't reach the scorer right now. Your local pet is fine — try again in a bit.
        </p>
      )}

      {state.status === 'pending' && (
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
          Registered — we're backfilling and scoring your pull requests. Your receipt shows up here once the
          first round lands.
        </p>
      )}

      {state.status === 'ok' && (
        <>
          {backendPet && (
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 12 }}>
              backend health <span style={{ color: 'var(--accent)' }}>{backendPet.health}/100</span>
              {backendPet.band ? ` · ${backendPet.band}` : ' · no diagnoses yet'}
            </div>
          )}

          {prs.length === 0 ? (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', margin: 0 }}>
              No pull requests scored yet. Ship a clean one.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: '6px 4px', fontWeight: 800 }}>PR</th>
                  <th style={{ padding: '6px 4px', fontWeight: 800 }}>Slop</th>
                  <th style={{ padding: '6px 4px', fontWeight: 800 }}>Δ</th>
                  <th style={{ padding: '6px 4px', fontWeight: 800 }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <tr key={pr.prUri} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 4px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pr.prTitle ?? pr.prUri.split('/').pop()}
                    </td>
                    <td style={{ padding: '6px 4px', fontWeight: 800 }}>{pr.latestScore}</td>
                    <td style={{ padding: '6px 4px' }}><Delta delta={pr.delta} /></td>
                    <td style={{ padding: '6px 4px' }}>{pr.latestVerdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reasons.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 6 }}>why it&apos;s feeling this way</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {medicine.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 6 }}>💊 medicine</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {medicine.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
