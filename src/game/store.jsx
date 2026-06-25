import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as engine from './engine.js'
import { actionQuip, moodQuip, HATCH_QUIPS, pickQuip } from './quips.js'
import { joinTeam } from '../api/client.js'

const STORAGE_KEY = 'slop.state'
const SHELL_PREF_KEY = 'slop.shell'

/* Remembered shell preference for visitors who haven't hatched yet. */
export function getStoredShell() {
  try {
    return localStorage.getItem(SHELL_PREF_KEY) || 'bubblegum'
  } catch {
    return 'bubblegum'
  }
}

/* Shell colour drives the whole app accent (ported from the DS theme.js). */
export const SHELL_THEME = {
  bubblegum: { a: '#f0408a', p: '#cf2f72', s: '#fde2ee' },
  sky: { a: '#1f96d8', p: '#1577ad', s: '#dcf0fb' },
  lemon: { a: '#d99a10', p: '#b07d09', s: '#fbf0cf' },
  lime: { a: '#5fa321', p: '#4a8019', s: '#e7f4d4' },
  grape: { a: '#9a55c8', p: '#7e3fab', s: '#efe2f9' },
  tangerine: { a: '#ef7e1e', p: '#c96313', s: '#fde6d0' },
  clear: { a: '#5b7d8c', p: '#445e6a', s: '#e4edf0' },
}

export const SHELL_LIST = Object.keys(SHELL_THEME)

export function applyShellTheme(shell) {
  const t = SHELL_THEME[shell] || SHELL_THEME.bubblegum
  const root = document.documentElement
  root.style.setProperty('--accent', t.a)
  root.style.setProperty('--accent-press', t.p)
  root.style.setProperty('--accent-soft', t.s)
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.hatched) return null
    return engine.rolloverDay(engine.applyDecay(parsed, Date.now()), Date.now())
  } catch {
    return null
  }
}

function save(state) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

const PetContext = createContext(null)

export function PetProvider({ children }) {
  const [pet, setPet] = useState(() => load())
  const [message, setMessage] = useState('')
  const [reaction, setReaction] = useState({ id: 0, kind: null })
  const lastActionAt = useRef(0)

  const mood = useMemo(() => (pet ? engine.deriveMood(pet) : 'happy'), [pet])

  /* Keep the document accent in sync with the pet's shell. */
  useEffect(() => {
    if (pet) applyShellTheme(pet.shell)
  }, [pet?.shell])

  /* Persist on every change. */
  useEffect(() => {
    save(pet)
  }, [pet])

  /* Seed an opening line once a pet exists. */
  useEffect(() => {
    if (pet && !message) setMessage(moodQuip(engine.deriveMood(pet)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet])

  /* Real-time tick — decay + day rollover. */
  useEffect(() => {
    if (!pet) return undefined
    const id = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev
        return engine.rolloverDay(engine.applyDecay(prev, Date.now()), Date.now())
      })
    }, 1000)
    return () => clearInterval(id)
  }, [!!pet])

  /* Idle chatter — refresh a mood line every ~14s when not mid-action. */
  useEffect(() => {
    if (!pet) return undefined
    const id = setInterval(() => {
      if (Date.now() - lastActionAt.current < 9000) return
      setMessage(moodQuip(engine.deriveMood(pet)))
    }, 14000)
    return () => clearInterval(id)
  }, [pet])

  const run = useCallback((fn, kind = null) => {
    lastActionAt.current = Date.now()
    setPet((prev) => {
      if (!prev) return prev
      const { next, event } = fn(prev)
      const quip = actionQuip(event)
      if (quip) setMessage(quip)
      // Trigger the on-device reaction only when the action actually landed.
      if (kind && event !== 'dead') setReaction((r) => ({ id: r.id + 1, kind }))
      return next
    })
  }, [])

  const actions = useMemo(
    () => ({
      feed: () => run(engine.feed, 'feed'),
      clean: () => run(engine.clean, 'clean'),
      praise: () => run(engine.praise, 'praise'),
      shipSlop: (lines) => run((s) => engine.shipSlop(s, lines)),
      revive: () => run((s) => engine.revive(s)),
      // Change the shell colour — retints the whole site, updates a live pet,
      // and remembers the choice for later.
      setShell: (shell) => {
        applyShellTheme(shell)
        try {
          localStorage.setItem(SHELL_PREF_KEY, shell)
        } catch {
          /* ignore */
        }
        setPet((prev) => (prev ? { ...prev, shell } : prev))
      },
      hatch: (config) => {
        const fresh = engine.createPet(config)
        applyShellTheme(fresh.shell)
        try {
          localStorage.setItem(SHELL_PREF_KEY, fresh.shell)
        } catch {
          /* ignore */
        }
        setPet(fresh)
        setMessage(pickQuip(HATCH_QUIPS, 'hatch'))
      },
      // Link the live pet to a real Tangled account and register it into a team
      // zoo on the backend. Returns the API envelope so callers can surface
      // progress; failures are non-fatal (the local pet still lives).
      connect: async ({ handle, team, source = 'tangled' }) => {
        const h = String(handle || '').trim().replace(/^@/, '')
        const t = String(team || '').trim().toLowerCase()
        if (h || t) {
          setPet((prev) => (prev ? { ...prev, handle: h, team: t, source } : prev))
        }
        if (!h || !t) return { ok: false, status: 0, data: {}, error: 'handle and team required' }
        return joinTeam({ handle: h, team: t })
      },
      // Set (or change) the zoo team without linking your own account — lets a
      // local player start a team zoo and populate it with other people's pets.
      setTeam: (team) => {
        const t = String(team || '').trim().toLowerCase()
        setPet((prev) => (prev ? { ...prev, team: t } : prev))
      },
      // Register someone else's Tangled handle into a team zoo so their scored
      // pet shows up alongside yours. Doesn't touch your own pet. Returns the
      // API envelope (the backend backfills + scores their PRs).
      addTeammate: ({ handle, team }) => {
        const h = String(handle || '').trim().replace(/^@/, '')
        const t = String(team || '').trim().toLowerCase()
        if (!h || !t) {
          return Promise.resolve({ ok: false, status: 0, data: {}, error: 'handle and team required' })
        }
        return joinTeam({ handle: h, team: t })
      },
      resetEgg: () => {
        setPet(null)
        setMessage('')
        save(null)
        applyShellTheme(getStoredShell())
      },
    }),
    [run]
  )

  const value = useMemo(() => {
    const status = pet ? engine.deriveStatus(pet) : 'ok'
    const m = pet ? engine.meters(pet) : { health: 0, hunger: 0, slop: 0 }
    return {
      pet,
      hatched: !!pet,
      mood,
      status,
      meters: m,
      level: pet ? engine.levelFor(pet.xp) : 1,
      message,
      reaction,
      actions,
    }
  }, [pet, mood, message, reaction, actions])

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) throw new Error('usePet must be used within a PetProvider')
  return ctx
}
