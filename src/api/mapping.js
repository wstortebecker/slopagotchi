/* ============================================================================
   Bridge between the backend's health model and the frontend's pet visuals.

   The backend publishes a pet-state record per developer:
     { health: 0–100, band: 'sharp'|'mild'|'sick'|null, state, handle, ... }
   derived from a rolling average of real PR slop scores. The frontend's
   creatures speak in *moods* (thriving…dead) and HP *segments* (0–4). These
   pure functions translate one into the other so a real, scored pet renders
   with the same sprites + voice as the local simulation. No DOM, no network —
   unit-tested in isolation.
   ========================================================================== */

/* Mirrors the SPECIES keys in ds/sprites.js. Kept as a literal so this module
   stays free of the (DOM-bound) design system and testable under node. */
export const SPECIES_IDS = [
  'blip', 'sproutlet', 'mimi', 'billy', 'neko', 'ribbit',
  'piyo', 'usa', 'tato', 'devi', 'rex',
]

/* The slop rubric (mirrors SLOP_CATEGORIES in lib/types.ts): label + max slop
   points per dimension. Drives the per-PR breakdown bars in the inspector. */
export const SLOP_CATEGORY_META = [
  { key: 'scopeDiscipline', label: 'Scope discipline', max: 25 },
  { key: 'specificity', label: 'Specificity & intent', max: 20 },
  { key: 'dependencyRestraint', label: 'Dependency restraint', max: 20 },
  { key: 'testThoughtfulness', label: 'Test thoughtfulness', max: 20 },
  { key: 'maintainability', label: 'Maintainability', max: 15 },
]

/* Verdict → accent colour for badges in the inspector. */
export const VERDICT_COLOR = {
  clean: 'var(--health-thriving)',
  minor: 'var(--health-ok)',
  sloppy: 'var(--health-warning)',
  severe: 'var(--health-dead)',
}

/**
 * Maps a pet-state record to a creature mood. Thresholds mirror the local
 * engine's deriveMood() so real and simulated pets share a vocabulary.
 * An un-scored pet ("no diagnoses yet") is content, not sick.
 */
export function moodFromPet(pet) {
  if (!pet) return 'happy'
  const h = clampHealth(pet.health)
  if (h <= 0) return 'dead'
  if (pet.state === 'no-diagnoses' || pet.band == null) return 'happy'
  if (h < 18) return 'critical'
  if (h < 42) return 'sick'
  if (h < 60) return 'hangry'
  if (h < 82) return 'ok'
  return 'thriving'
}

/** Health (0–100) → HP meter segments (0–4), matching engine.meters(). */
export function healthSegments(health) {
  return Math.round((clampHealth(health) / 100) * 4)
}

/**
 * A slop indicator for the zoo card (the seed roster shows "litres shipped
 * today"; a real pet has no per-day counter, so we surface its current slop
 * level — the inverse of health — which drives the same "heavy slop" styling).
 */
export function slopLevel(pet) {
  if (!pet) return 0
  return Math.round(100 - clampHealth(pet.health))
}

/** Stable species pick from a handle, so a member's creature never flickers. */
export function speciesForHandle(handle) {
  const key = String(handle || '')
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return SPECIES_IDS[h % SPECIES_IDS.length]
}

/** Short display name for a creature derived from a handle (e.g. alice.tngl.sh → alice). */
export function petNameForHandle(handle) {
  const base = String(handle || 'pet').split('.')[0].replace(/^@/, '')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/** Build a zoo row (the shape ZooCard renders) from a backend member. */
export function rowFromMember(member, { you = false } = {}) {
  const pet = member?.pet ?? null
  const mood = moodFromPet(pet)
  return {
    id: member.handle,
    you,
    name: member.handle,
    role: 'Tangled',
    pet: petNameForHandle(member.handle),
    species: speciesForHandle(member.handle),
    mood,
    health: pet ? healthSegments(pet.health) : 4,
    slopToday: slopLevel(pet),
    handle: member.handle,
    real: true,
  }
}

function clampHealth(health) {
  const n = typeof health === 'number' && Number.isFinite(health) ? health : 100
  return Math.max(0, Math.min(100, n))
}
