/* ============================================================================
   Slopagotchi simulation engine — pure functions over a plain pet-state object.
   The premise: the pet lives off your clean code. Real commits feed it; AI slop
   poisons it. Vitals drift in real time; care actions and slop events move them.
   ========================================================================== */

export const VITAL_MAX = 100

const clamp = (n, lo = 0, hi = VITAL_MAX) => Math.max(lo, Math.min(hi, n))

const REPOS = [
  'web-app',
  'api-gateway',
  'dashboard',
  'mobile-app',
  'infra',
  'checkout',
  'auth-service',
  'design-system',
  'billing',
  'notifications',
]

const SLOP_VERDICTS = [
  '80% robot, 20% regret',
  'one prompt, four files, zero understanding',
  'the autocomplete wrote the tests too',
  "you didn't read this, did you",
  '"refactor" = deleted it and regenerated',
  'copied the stack trace in, merged the answer out',
  'a feature nobody asked the model to explain',
  'ship first, comprehend never',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rint = (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1))

export function todayStr(now = Date.now()) {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/* ---------- Lifecycle ---------- */

export function createPet({ name = 'Mossy', species = 'blip', shell = 'bubblegum' } = {}, now = Date.now()) {
  return {
    name,
    species,
    shell,
    bornAt: now,
    lastTick: now,
    day: todayStr(now),
    health: 84,
    hunger: 72,
    slop: 8,
    discipline: 60,
    xp: 0,
    streakDays: 0,
    slopToday: 0,
    cleanToday: 0,
    incidents: [],
    dead: false,
    hatched: true,
  }
}

export function levelFor(xp) {
  return 1 + Math.floor((xp || 0) / 120)
}

export function xpProgress(xp) {
  const into = (xp || 0) % 120
  return { into, of: 120, pct: Math.round((into / 120) * 100) }
}

/* ---------- Time-based decay ---------- */

function stepVitals(s, minutes) {
  let { health, hunger, slop } = s
  hunger -= 0.6 * minutes
  slop -= 0.4 * minutes // slop slowly dissipates on its own

  let dh = 0
  if (hunger < 20) dh -= 1.2
  if (slop > 60) dh -= 1.5
  else if (slop > 30) dh -= 0.5
  if (slop < 15 && hunger > 50) dh += 0.8
  health += dh * minutes

  return {
    ...s,
    health: clamp(health),
    hunger: clamp(hunger),
    slop: clamp(slop),
  }
}

/**
 * Advance the simulation to `now`, integrating in small chunks for accuracy.
 * Offline catch-up is capped at 12h so reopening a tab doesn't instantly bury
 * the pet.
 */
export function applyDecay(state, now = Date.now()) {
  if (state.dead) return { ...state, lastTick: now }
  let remaining = Math.min((now - state.lastTick) / 60000, 12 * 60)
  if (remaining <= 0) return { ...state, lastTick: now }

  let s = state
  const STEP = 5
  while (remaining > 0) {
    s = stepVitals(s, Math.min(STEP, remaining))
    remaining -= STEP
  }
  s = { ...s, lastTick: now }
  if (s.health <= 0) s = { ...s, dead: true, health: 0 }
  return s
}

/** Day rollover — bank or break the slop-free streak, reset daily counters. */
export function rolloverDay(state, now = Date.now()) {
  const today = todayStr(now)
  if (state.day === today) return state
  const wasClean = state.slopToday === 0 && !state.dead
  return {
    ...state,
    day: today,
    streakDays: wasClean ? state.streakDays + 1 : 0,
    slopToday: 0,
    cleanToday: 0,
  }
}

/* ---------- Derived read-models ---------- */

export function deriveMood(s) {
  if (!s || s.dead || s.health <= 0) return 'dead'
  if (s.health < 18) return 'critical'
  if (s.slop > 62 || s.health < 42) return 'sick'
  if (s.hunger < 28) return 'hangry'
  if (s.health > 82 && s.slop < 16 && s.hunger > 55) return 'thriving'
  if (s.health > 60) return 'happy'
  return 'ok'
}

/** Map an internal mood to a StatusBadge status. */
export function deriveStatus(s) {
  const mood = deriveMood(s)
  if (mood === 'dead') return 'dead'
  if (mood === 'critical') return 'critical'
  if (s.slop > 70) return 'slop'
  if (mood === 'sick' || mood === 'hangry') return 'sick'
  if (mood === 'thriving') return 'thriving'
  return 'ok'
}

export function meters(s) {
  return {
    health: (s.health / VITAL_MAX) * 4,
    hunger: (s.hunger / VITAL_MAX) * 4,
    slop: (s.slop / VITAL_MAX) * 5,
  }
}

export function formatAge(bornAt, now = Date.now()) {
  const days = Math.floor((now - bornAt) / 86400000)
  if (days <= 0) return 'hatched today'
  if (days === 1) return 'hatched yesterday'
  return `hatched ${days} days ago`
}

export function relTime(ts, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000))
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/* ---------- Actions ---------- */
/* Each returns { next, event } where event keys into ACTION_QUIPS. */

export function feed(state) {
  if (state.dead) return { next: state, event: 'dead' }
  if (state.hunger >= 92) {
    return { next: { ...state, hunger: VITAL_MAX }, event: 'feedFull' }
  }
  return {
    next: {
      ...state,
      hunger: clamp(state.hunger + 26),
      health: clamp(state.health + 4),
      slop: clamp(state.slop - 4),
      xp: state.xp + 6,
      cleanToday: state.cleanToday + 1,
    },
    event: 'feed',
  }
}

export function clean(state) {
  if (state.dead) return { next: state, event: 'dead' }
  if (state.slop <= 3) return { next: state, event: 'cleanNone' }
  return {
    next: {
      ...state,
      slop: clamp(state.slop - 34),
      health: clamp(state.health + 2),
      discipline: clamp(state.discipline + 4),
      xp: state.xp + 4,
    },
    event: 'clean',
  }
}

export function praise(state) {
  if (state.dead) return { next: state, event: 'dead' }
  return {
    next: { ...state, health: clamp(state.health + 1), xp: state.xp + 2 },
    event: 'praise',
  }
}

/** The temptation. Ship AI slop: spikes slop, drops health, breaks the streak. */
export function shipSlop(state, lines) {
  if (state.dead) return { next: state, event: 'dead' }
  const n = lines || rint(40, 460)
  const heavy = n > 250
  const incident = {
    repo: pick(REPOS),
    lines: n,
    verdict: pick(SLOP_VERDICTS),
    ts: Date.now(),
  }
  return {
    next: {
      ...state,
      slop: clamp(state.slop + (heavy ? 30 : 18)),
      health: clamp(state.health - (heavy ? 16 : 9)),
      discipline: clamp(state.discipline - 6),
      slopToday: state.slopToday + n,
      streakDays: 0,
      xp: state.xp + 1,
      incidents: [incident, ...state.incidents].slice(0, 6),
    },
    event: heavy ? 'shipHeavy' : 'ship',
  }
}

export function revive(state, now = Date.now()) {
  const fresh = createPet({ name: state.name, species: state.species, shell: state.shell }, now)
  return { next: { ...fresh, streakDays: 0 }, event: 'revive' }
}
