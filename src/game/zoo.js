/* ============================================================================
   Seed roster for the Team Zoo — every pet in the company, ranked by slop.
   Static, deterministic teammates; the player's own live pet is spliced in by
   the Zoo screen. `mood` drives the creature; `health` is 0–4; `slopToday` is
   "litres" of slop shipped today (the dashboard flags > 50).
   ========================================================================== */

export const TEAM = [
  { id: 't1', name: 'Jess Moreau', role: 'Design Eng', pet: 'Mim', species: 'mimi', mood: 'thriving', health: 4, slopToday: 0 },
  { id: 't2', name: 'Dana Okafor', role: 'Frontend', pet: 'Pixel', species: 'neko', mood: 'thriving', health: 4, slopToday: 3 },
  { id: 't3', name: 'Ravi Anand', role: 'Infra', pet: 'Sprout', species: 'sproutlet', mood: 'happy', health: 3, slopToday: 6 },
  { id: 't4', name: 'Marco Silva', role: 'Backend', pet: 'Gizmo', species: 'rex', mood: 'happy', health: 3, slopToday: 14 },
  { id: 't5', name: 'Aria Chen', role: 'Platform', pet: 'Bug', species: 'devi', mood: 'ok', health: 3, slopToday: 31 },
  { id: 't6', name: 'Tomas Vidal', role: 'Mobile', pet: 'Noodle', species: 'ribbit', mood: 'hangry', health: 2, slopToday: 48 },
  { id: 't7', name: 'Kofi Mensah', role: 'Fullstack', pet: 'Quack', species: 'billy', mood: 'sick', health: 2, slopToday: 124 },
  { id: 't8', name: 'Lena Brandt', role: 'Data', pet: 'Tater', species: 'tato', mood: 'sick', health: 1, slopToday: 96 },
  { id: 't9', name: 'Sam Whitfield', role: 'Growth', pet: 'Yolk', species: 'piyo', mood: 'critical', health: 1, slopToday: 233 },
  { id: 't10', name: 'Nina Costa', role: 'ML', pet: 'Hops', species: 'usa', mood: 'dead', health: 0, slopToday: 472 },
]

/** Build the player's zoo row from live engine state. */
export function playerRow(pet, mood, healthSeg) {
  return {
    id: 'me',
    you: true,
    name: 'You',
    role: 'Engineer',
    pet: pet.name,
    species: pet.species,
    mood,
    health: Math.round(healthSeg),
    slopToday: pet.slopToday,
  }
}

/** Rank: healthiest + least slop on top, the departed at the bottom. */
export function rankZoo(rows) {
  return [...rows].sort((a, b) => {
    if (a.mood === 'dead' && b.mood !== 'dead') return 1
    if (b.mood === 'dead' && a.mood !== 'dead') return -1
    if (b.health !== a.health) return b.health - a.health
    return a.slopToday - b.slopToday
  })
}
