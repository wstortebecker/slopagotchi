import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api/client.js', () => ({
  getZoo: vi.fn(),
  joinTeam: vi.fn(),
  getPet: vi.fn(),
}))

import Zoo from './Zoo.jsx'
import { PetProvider } from '../game/store.jsx'
import * as engine from '../game/engine.js'
import { getZoo, joinTeam, getPet } from '../api/client.js'

function seedPet(over = {}) {
  const pet = { ...engine.createPet({ name: 'Mo', species: 'blip', shell: 'sky' }), ...over }
  localStorage.setItem('slop.state', JSON.stringify(pet))
}

const renderZoo = () =>
  render(
    <MemoryRouter>
      <PetProvider>
        <Zoo />
      </PetProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('Zoo screen', () => {
  it('falls back to the demo roster when the pet has no team', () => {
    seedPet({ handle: '', team: '' })
    renderZoo()
    expect(screen.getByText('the team zoo')).toBeInTheDocument()
    // A seed teammate from game/zoo.js.
    expect(screen.getByText(/Jess Moreau/)).toBeInTheDocument()
    expect(getZoo).not.toHaveBeenCalled()
  })

  it('renders the real team when the backend returns configured members', async () => {
    seedPet({ handle: 'me.tngl.sh', team: 'acme', source: 'tangled' })
    getZoo.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        team: 'acme',
        configured: true,
        members: [
          { handle: 'dana.tngl.sh', pet: { health: 90, band: 'sharp', state: 'active' } },
          { handle: 'me.tngl.sh', pet: { health: 30, band: 'sick', state: 'active' } },
        ],
      },
    })

    renderZoo()

    await waitFor(() => expect(getZoo).toHaveBeenCalledWith('acme'))
    // Real member's creature name (derived from handle) shows up...
    expect(await screen.findByText('Dana')).toBeInTheDocument()
    // ...and the demo roster does not.
    expect(screen.queryByText(/Jess Moreau/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /acme zoo/i })).toBeInTheDocument()
  })

  it('adds a teammate to the team and refreshes the zoo', async () => {
    seedPet({ handle: 'me.tngl.sh', team: 'acme', source: 'tangled' })
    getZoo.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        team: 'acme',
        configured: true,
        members: [{ handle: 'me.tngl.sh', pet: { health: 90, band: 'sharp', state: 'active' } }],
      },
    })
    joinTeam.mockResolvedValue({ ok: true, status: 200, data: { ok: true, state: 'backfilling' } })

    renderZoo()
    await waitFor(() => expect(getZoo).toHaveBeenCalled())
    const callsBefore = getZoo.mock.calls.length

    const input = await screen.findByPlaceholderText('filipstal.tngl.sh')
    fireEvent.change(input, { target: { value: '@Dana.tngl.sh' } })
    fireEvent.click(screen.getByRole('button', { name: /add to zoo/i }))

    await waitFor(() => expect(joinTeam).toHaveBeenCalledWith({ handle: 'dana.tngl.sh', team: 'acme' }))
    await waitFor(() => expect(getZoo.mock.calls.length).toBeGreaterThan(callsBefore))
    expect(await screen.findByText(/scoring their pull requests/i)).toBeInTheDocument()
  })

  it('opens the inspector when a real teammate is clicked', async () => {
    seedPet({ handle: 'me.tngl.sh', team: 'acme', source: 'tangled' })
    getZoo.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        team: 'acme',
        configured: true,
        members: [
          { handle: 'me.tngl.sh', pet: { health: 90, band: 'sharp', state: 'active' } },
          { handle: 'dana.tngl.sh', pet: { health: 40, band: 'mild', state: 'active' } },
        ],
      },
    })
    getPet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { handle: 'dana.tngl.sh', pet: { health: 40, band: 'mild', state: 'active', diagnosticCount: 3 }, prs: [], latestReasons: [], latestMedicine: [] },
    })

    renderZoo()
    // Dana's creature name (derived from handle) renders on her card.
    const danaCard = await screen.findByText('Dana')
    fireEvent.click(danaCard)

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('dana.tngl.sh'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('offers a create-zoo form when the player has no team, then reveals add', async () => {
    seedPet({ handle: '', team: '' })
    getZoo.mockResolvedValue({ ok: true, status: 200, data: { team: 'beta', configured: true, members: [] } })

    renderZoo()
    expect(screen.getByText(/start a team zoo/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('acme'), { target: { value: 'Beta' } })
    fireEvent.click(screen.getByRole('button', { name: /create zoo/i }))

    expect(await screen.findByPlaceholderText('filipstal.tngl.sh')).toBeInTheDocument()
  })

  it('keeps the demo roster when the backend is unconfigured', async () => {
    seedPet({ handle: 'me.tngl.sh', team: 'acme', source: 'tangled' })
    getZoo.mockResolvedValue({
      ok: true,
      status: 200,
      data: { team: 'acme', configured: false, members: [] },
    })

    renderZoo()

    await waitFor(() => expect(getZoo).toHaveBeenCalled())
    expect(await screen.findByText(/Jess Moreau/)).toBeInTheDocument()
    expect(screen.getByText(/Backend not connected yet/i)).toBeInTheDocument()
  })
})
