import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../api/client.js', async () => {
  const actual = await vi.importActual('../api/client.js')
  return { ...actual, getPet: vi.fn() }
})

import VitalsPanel from './VitalsPanel.jsx'
import { PetProvider } from '../game/store.jsx'
import * as engine from '../game/engine.js'
import { getPet } from '../api/client.js'

/** Seed a hatched pet (optionally connected) into storage so PetProvider hydrates it. */
function seedPet(over = {}) {
  const pet = { ...engine.createPet({ name: 'Mo', species: 'blip', shell: 'sky' }), ...over }
  localStorage.setItem('slop.state', JSON.stringify(pet))
}

const renderPanel = () =>
  render(
    <PetProvider>
      <VitalsPanel />
    </PetProvider>,
  )

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('VitalsPanel', () => {
  it('shows the local slop tally and never fetches for a local-only pet', () => {
    seedPet({ handle: '', team: '' })
    renderPanel()
    expect(screen.getByText('Slop shipped today')).toBeInTheDocument()
    expect(screen.getByText(/no slop incidents yet/i)).toBeInTheDocument()
    expect(getPet).not.toHaveBeenCalled()
  })

  it('renders real scored PRs as incidents and a PRs-scored tally for a connected pet', async () => {
    seedPet({ handle: 'alice.tngl.sh', team: 'acme', source: 'tangled' })
    getPet.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        handle: 'alice.tngl.sh',
        pet: { health: 64, band: 'mild' },
        prs: [
          {
            prUri: 'at://did/sh.tangled.repo.pull/abc',
            prTitle: 'Add billing webhook',
            latestScore: 71,
            latestVerdict: 'sloppy',
            createdAt: '2026-06-25T00:00:00.000Z',
          },
        ],
        latestReasons: [],
        latestMedicine: [],
      },
    })

    renderPanel()

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('alice.tngl.sh'))
    expect(await screen.findByText('PRs scored')).toBeInTheDocument()
    expect(screen.getByText(/Add billing webhook · slop 71/)).toBeInTheDocument()
    expect(screen.getByText(/“sloppy”/)).toBeInTheDocument()
  })

  it('looks up a standalone GitHub pet by its github:<login> subject', async () => {
    seedPet({ handle: 'octocat', team: '', source: 'github' })
    getPet.mockResolvedValue({ ok: true, status: 200, data: { prs: [] } })

    renderPanel()

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('github:octocat'))
    expect(await screen.findByText(/no pull requests scored yet/i)).toBeInTheDocument()
  })

  it('falls back to the local tally while a connected pet is still backfilling (404)', async () => {
    seedPet({ handle: 'newbie.tngl.sh', team: 'acme', source: 'tangled' })
    getPet.mockResolvedValue({ ok: false, status: 404, data: { error: 'unknown handle' } })

    renderPanel()

    await waitFor(() => expect(getPet).toHaveBeenCalled())
    expect(await screen.findByText('Slop shipped today')).toBeInTheDocument()
  })
})
