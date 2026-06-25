import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('../api/client.js', () => ({ getPet: vi.fn() }))

import PetInspector from './PetInspector.jsx'
import { getPet } from '../api/client.js'

const okPet = {
  ok: true,
  status: 200,
  data: {
    handle: 'oyster.cafe',
    pet: { health: 67, band: 'mild', state: 'active', diagnosticCount: 62 },
    prs: [
      {
        prUri: 'at://did/sh.tangled.repo.pull/aaa',
        prTitle: 'knotserver: stop ingesting member records',
        latestScore: 73,
        latestVerdict: 'severe',
        delta: 2,
        rounds: 1,
        createdAt: '2026-06-24T00:00:00Z',
        reasons: ['Scope sprawl across many handlers', 'Weak test coverage'],
        medicine: ['Split into focused PRs', 'Add real assertions'],
        categories: {
          scopeDiscipline: 22,
          specificity: 15,
          dependencyRestraint: 10,
          testThoughtfulness: 18,
          maintainability: 8,
        },
        confidence: 'high',
      },
    ],
    latestReasons: [],
    latestMedicine: [],
  },
}

beforeEach(() => vi.clearAllMocks())

describe('PetInspector', () => {
  it('fetches and explains a teammate score: health, PR, rubric, reasons, medicine', async () => {
    getPet.mockResolvedValue(okPet)
    render(<PetInspector handle="oyster.cafe" onClose={() => {}} />)

    await waitFor(() => expect(getPet).toHaveBeenCalledWith('oyster.cafe'))
    expect(await screen.findByText(/67\/100/)).toBeInTheDocument()
    expect(screen.getByText(/knotserver: stop ingesting member records/)).toBeInTheDocument()
    // First PR is expanded by default → rubric + reasons + medicine visible.
    expect(screen.getByText('Scope discipline')).toBeInTheDocument()
    expect(screen.getByText('22/25')).toBeInTheDocument()
    expect(screen.getByText(/Scope sprawl across many handlers/)).toBeInTheDocument()
    expect(screen.getByText(/Split into focused PRs/)).toBeInTheDocument()
  })

  it('shows a pending message for a registered-but-unscored handle (404)', async () => {
    getPet.mockResolvedValue({ ok: false, status: 404, data: { error: 'unknown handle' } })
    render(<PetInspector handle="newbie.tngl.sh" onClose={() => {}} />)
    expect(await screen.findByText(/still being scored/i)).toBeInTheDocument()
  })

  it('closes on the close button and on backdrop click', async () => {
    getPet.mockResolvedValue(okPet)
    const onClose = vi.fn()
    render(<PetInspector handle="oyster.cafe" onClose={onClose} />)
    await screen.findByText(/67\/100/)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
