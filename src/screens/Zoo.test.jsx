import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api/client.js', () => ({
  getZoo: vi.fn(),
}))

import Zoo from './Zoo.jsx'
import { PetProvider } from '../game/store.jsx'
import * as engine from '../game/engine.js'
import { getZoo } from '../api/client.js'

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
