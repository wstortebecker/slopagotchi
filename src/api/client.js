/* ============================================================================
   Thin client for the Slopagotchi backend (the /api serverless functions).
   Every call resolves to a uniform { ok, status, data, error } envelope and
   never throws — the UI degrades to its local simulation when the backend is
   unreachable (e.g. `vite dev` without `vercel dev`, or env not yet wired).
   ========================================================================== */

const BASE = '/api'

async function request(path, init) {
  try {
    const res = await fetch(`${BASE}${path}`, init)
    let data = {}
    try {
      data = await res.json()
    } catch {
      /* non-JSON / empty body */
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : data?.error || `HTTP ${res.status}` }
  } catch (err) {
    // Network error / endpoint absent in local vite dev.
    return { ok: false, status: 0, data: {}, error: err?.message || 'network error' }
  }
}

/** Register a Tangled handle into a team zoo and start its backfill. */
export function joinTeam({ handle, team }) {
  return request('/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle, team }),
  })
}

/** Poll join/backfill progress: joining → backfilling → done (or unknown). */
export function getStatus(handle) {
  return request(`/status/${encodeURIComponent(handle)}`)
}

/** Fetch a team's real pets (pet-state records) for the zoo. */
export function getZoo(team) {
  return request(`/zoo/${encodeURIComponent(team)}`)
}

/** Fetch one developer's pet + slop receipt (PR history, reasons, medicine). */
export function getPet(handle) {
  return request(`/pet/${encodeURIComponent(handle)}`)
}
