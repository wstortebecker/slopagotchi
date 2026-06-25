import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../api/client.js', () => ({
  getPet: vi.fn(),
}))

import ReceiptPanel from './ReceiptPanel.jsx'
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
      <ReceiptPanel />
    </PetProvider>,
  )

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ReceiptPanel', () => {
  it('nudges the player to connect when the pet is local-only', () => {
    seedPet({ handle: '', team: '' })
    renderPanel()
    expect(screen.getByText(/plays locally/i)).toBeInTheDocument()
    expect(getPet).not.toHaveBeenCalled()
  })

  it('renders scored pull requests, reasons, and medicine for a connected pet', async () => {
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
            latestScore: 41,
            latestVerdict: 'minor',
            delta: -8,
            rounds: 2,
            createdAt: '2026-06-25T00:00:00.000Z',
          },
        ],
        latestReasons: ['scope crept into unrelated files'],
        latestMedicine: ['split the refactor into its own PR'],
      },
    })

    renderPanel()

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('alice.tngl.sh'))
    expect(await screen.findByText('Add billing webhook')).toBeInTheDocument()
    expect(screen.getByText('41')).toBeInTheDocument()
    expect(screen.getByText(/scope crept into unrelated files/i)).toBeInTheDocument()
    expect(screen.getByText(/split the refactor/i)).toBeInTheDocument()
    expect(screen.getByText(/64\/100/)).toBeInTheDocument()
  })

  it('shows a backfilling message when the dev is registered but unscored (404)', async () => {
    seedPet({ handle: 'newbie.tngl.sh', team: 'acme', source: 'tangled' })
    getPet.mockResolvedValue({ ok: false, status: 404, data: { error: 'unknown handle' } })

    renderPanel()

    expect(await screen.findByText(/backfilling and scoring/i)).toBeInTheDocument()
  })
})
