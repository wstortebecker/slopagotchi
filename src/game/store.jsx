import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as engine from './engine.js'
import { actionQuip, moodQuip, HATCH_QUIPS, pickQuip } from './quips.js'

const STORAGE_KEY = 'slop.state'

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
  const [justActed, setJustActed] = useState(0)
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

  const run = useCallback((fn, { affection = false } = {}) => {
    lastActionAt.current = Date.now()
    setPet((prev) => {
      if (!prev) return prev
      const { next, event } = fn(prev)
      const quip = actionQuip(event)
      if (quip) setMessage(quip)
      return next
    })
    if (affection) setJustActed((n) => n + 1)
  }, [])

  const actions = useMemo(
    () => ({
      feed: () => run(engine.feed, { affection: true }),
      clean: () => run(engine.clean),
      praise: () => run(engine.praise, { affection: true }),
      shipSlop: (lines) => run((s) => engine.shipSlop(s, lines)),
      revive: () => run((s) => engine.revive(s)),
      hatch: (config) => {
        const fresh = engine.createPet(config)
        applyShellTheme(fresh.shell)
        setPet(fresh)
        setMessage(pickQuip(HATCH_QUIPS, 'hatch'))
      },
      resetEgg: () => {
        setPet(null)
        setMessage('')
        save(null)
        applyShellTheme('bubblegum')
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
      justActed,
      actions,
    }
  }, [pet, mood, message, justActed, actions])

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) throw new Error('usePet must be used within a PetProvider')
  return ctx
}
