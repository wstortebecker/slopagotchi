import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api/client.js', async (orig) => ({
  ...(await orig()),
  getPet: vi.fn(),
  joinTeam: vi.fn(),
  connectGithubStandalone: vi.fn(),
}))

import Zoo from './Zoo.jsx'
import { PetProvider } from '../game/store.jsx'
import * as engine from '../game/engine.js'
import { getPet, joinTeam, connectGithubStandalone } from '../api/client.js'

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
  getPet.mockResolvedValue({ ok: true, status: 200, data: { pet: null, prs: [], latestReasons: [], latestMedicine: [] } })
})

describe('Zoo screen (personal roster)', () => {
  it('shows your pet and never the old demo roster', () => {
    seedPet({ handle: '', team: '' })
    renderZoo()
    expect(screen.getByRole('heading', { name: /your zoo/i })).toBeInTheDocument()
    expect(screen.queryByText(/Jess Moreau/)).not.toBeInTheDocument()
    // No team-slug gate.
    expect(screen.queryByText(/start a team zoo/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('acme')).not.toBeInTheDocument()
  })

  it('adds a GitHub developer with no team slug', async () => {
    seedPet({ handle: '', team: '' })
    connectGithubStandalone.mockResolvedValue({ ok: true, status: 200, data: { ok: true, state: 'backfilling' } })

    renderZoo()
    const input = screen.getByPlaceholderText('octocat') // GitHub is the default tab
    fireEvent.change(input, { target: { value: '@OctoCat' } })
    fireEvent.click(screen.getByRole('button', { name: /add to zoo/i }))

    await waitFor(() =>
      expect(connectGithubStandalone).toHaveBeenCalledWith({ githubUsername: 'octocat' }),
    )
    await waitFor(() => expect(getPet).toHaveBeenCalledWith('github:octocat'))
    expect(joinTeam).not.toHaveBeenCalled()
    expect(await screen.findByText(/scoring their pull requests/i)).toBeInTheDocument()
  })

  it('adds a Tangled developer without requiring a team', async () => {
    seedPet({ handle: '', team: '' })
    joinTeam.mockResolvedValue({ ok: true, status: 200, data: { ok: true, state: 'backfilling' } })

    renderZoo()
    fireEvent.click(screen.getByRole('button', { name: /tangled\.org/i })) // switch source tab
    const input = screen.getByPlaceholderText('filipstal.tngl.sh')
    fireEvent.change(input, { target: { value: '@Dana.tngl.sh' } })
    fireEvent.click(screen.getByRole('button', { name: /add to zoo/i }))

    await waitFor(() => expect(joinTeam).toHaveBeenCalledWith({ handle: 'dana.tngl.sh' }))
    await waitFor(() => expect(getPet).toHaveBeenCalledWith('dana.tngl.sh'))
    expect(connectGithubStandalone).not.toHaveBeenCalled()
  })

  it('opens the inspector when a roster member is clicked', async () => {
    seedPet({ handle: 'me.tngl.sh', team: '', source: 'tangled' })
    localStorage.setItem('slop.roster', JSON.stringify([{ kind: 'github', id: 'octocat' }]))
    getPet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { handle: 'github:octocat', pet: { health: 40, band: 'mild', state: 'active', diagnosticCount: 2 }, prs: [], latestReasons: [], latestMedicine: [] },
    })

    renderZoo()
    const card = await screen.findByText('Octocat') // petNameForHandle('octocat')
    fireEvent.click(card)

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('github:octocat'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('removes a roster member', async () => {
    seedPet({ handle: 'me.tngl.sh', team: '', source: 'tangled' })
    localStorage.setItem('slop.roster', JSON.stringify([{ kind: 'github', id: 'octocat' }]))
    renderZoo()
    const remove = await screen.findByRole('button', { name: /remove octocat/i })
    fireEvent.click(remove)
    await waitFor(() => expect(screen.queryByText('Octocat')).not.toBeInTheDocument())
    expect(JSON.parse(localStorage.getItem('slop.roster'))).toEqual([])
  })
})
