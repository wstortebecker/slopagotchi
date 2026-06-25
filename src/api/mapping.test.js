import { describe, it, expect } from 'vitest'
import {
  moodFromPet,
  healthSegments,
  slopLevel,
  speciesForHandle,
  petNameForHandle,
  rowFromMember,
  SPECIES_IDS,
} from './mapping.js'

describe('moodFromPet', () => {
  it('treats a missing pet as content', () => {
    expect(moodFromPet(null)).toBe('happy')
  })

  it('maps an un-scored (no-diagnoses) pet to happy, not sick', () => {
    expect(moodFromPet({ health: 100, band: null, state: 'no-diagnoses' })).toBe('happy')
  })

  it('maps health bands across the mood spectrum', () => {
    expect(moodFromPet({ health: 95, band: 'sharp', state: 'active' })).toBe('thriving')
    expect(moodFromPet({ health: 70, band: 'sharp', state: 'active' })).toBe('ok')
    expect(moodFromPet({ health: 50, band: 'mild', state: 'active' })).toBe('hangry')
    expect(moodFromPet({ health: 30, band: 'sick', state: 'active' })).toBe('sick')
    expect(moodFromPet({ health: 10, band: 'sick', state: 'active' })).toBe('critical')
  })

  it('is dead at zero health regardless of band', () => {
    expect(moodFromPet({ health: 0, band: 'sick', state: 'active' })).toBe('dead')
    expect(moodFromPet({ health: 0, band: null, state: 'no-diagnoses' })).toBe('dead')
  })
})

describe('healthSegments', () => {
  it('maps 0–100 onto 0–4 segments', () => {
    expect(healthSegments(100)).toBe(4)
    expect(healthSegments(75)).toBe(3)
    expect(healthSegments(50)).toBe(2)
    expect(healthSegments(0)).toBe(0)
  })

  it('clamps out-of-range and non-numeric input', () => {
    expect(healthSegments(140)).toBe(4)
    expect(healthSegments(-5)).toBe(0)
    expect(healthSegments(undefined)).toBe(4) // defaults to 100
  })
})

describe('slopLevel', () => {
  it('is the inverse of health', () => {
    expect(slopLevel({ health: 80 })).toBe(20)
    expect(slopLevel({ health: 20 })).toBe(80)
    expect(slopLevel(null)).toBe(0)
  })
})

describe('speciesForHandle', () => {
  it('is deterministic and always a known species', () => {
    const a = speciesForHandle('alice.tngl.sh')
    expect(a).toBe(speciesForHandle('alice.tngl.sh'))
    expect(SPECIES_IDS).toContain(a)
  })

  it('spreads different handles across species', () => {
    const picks = new Set(
      ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'].map(speciesForHandle),
    )
    expect(picks.size).toBeGreaterThan(1)
  })
})

describe('petNameForHandle', () => {
  it('capitalises the local part of a handle', () => {
    expect(petNameForHandle('alice.tngl.sh')).toBe('Alice')
    expect(petNameForHandle('@bob')).toBe('Bob')
    expect(petNameForHandle('')).toBe('Pet')
  })
})

describe('rowFromMember', () => {
  it('builds a zoo row from a scored member', () => {
    const row = rowFromMember(
      { handle: 'alice.tngl.sh', pet: { health: 88, band: 'sharp', state: 'active' } },
      { you: true },
    )
    expect(row).toMatchObject({
      id: 'alice.tngl.sh',
      you: true,
      pet: 'Alice',
      mood: 'thriving',
      health: 4,
      slopToday: 12,
      real: true,
    })
    expect(SPECIES_IDS).toContain(row.species)
  })

  it('renders a member with no pet record as a full-health newcomer', () => {
    const row = rowFromMember({ handle: 'newbie.tngl.sh', pet: null })
    expect(row.mood).toBe('happy')
    expect(row.health).toBe(4)
    expect(row.slopToday).toBe(0)
  })
})
