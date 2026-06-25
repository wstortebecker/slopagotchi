import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('../api/client.js', () => ({
  joinTeam: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true, state: 'backfilling' } })),
}))

import { PetProvider, usePet } from './store.jsx'
import { joinTeam } from '../api/client.js'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('PetProvider connect action', () => {
  it('normalises handle/team, stores them on the pet, and registers with the backend', async () => {
    const { result } = renderHook(() => usePet(), { wrapper: PetProvider })

    act(() => {
      result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })

    await act(async () => {
      await result.current.actions.connect({ handle: '@Alice.tngl.sh', team: 'Acme' })
    })

    expect(joinTeam).toHaveBeenCalledWith({ handle: 'Alice.tngl.sh', team: 'acme' })
    await waitFor(() => {
      expect(result.current.pet.handle).toBe('Alice.tngl.sh')
      expect(result.current.pet.team).toBe('acme')
      expect(result.current.pet.source).toBe('tangled')
    })
  })

  it('does not call the backend when handle or team is missing', async () => {
    const { result } = renderHook(() => usePet(), { wrapper: PetProvider })
    act(() => {
      result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })

    let res
    await act(async () => {
      res = await result.current.actions.connect({ handle: 'alice', team: '' })
    })

    expect(joinTeam).not.toHaveBeenCalled()
    expect(res.ok).toBe(false)
  })

  it('setTeam sets the zoo team without touching handle/source', async () => {
    const { result } = renderHook(() => usePet(), { wrapper: PetProvider })
    act(() => {
      result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })
    act(() => {
      result.current.actions.setTeam('Acme')
    })
    await waitFor(() => expect(result.current.pet.team).toBe('acme'))
    expect(result.current.pet.handle).toBe('')
    expect(joinTeam).not.toHaveBeenCalled()
  })

  it('addTeammate registers another handle into the team (normalised)', async () => {
    const { result } = renderHook(() => usePet(), { wrapper: PetProvider })
    act(() => {
      result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })
    let res
    await act(async () => {
      res = await result.current.actions.addTeammate({ handle: '@Dana.tngl.sh', team: 'Acme' })
    })
    expect(joinTeam).toHaveBeenCalledWith({ handle: 'Dana.tngl.sh', team: 'acme' })
    expect(res.ok).toBe(true)
  })

  it('addTeammate refuses a missing handle or team', async () => {
    const { result } = renderHook(() => usePet(), { wrapper: PetProvider })
    act(() => {
      result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })
    let res
    await act(async () => {
      res = await result.current.actions.addTeammate({ handle: 'dana', team: '' })
    })
    expect(joinTeam).not.toHaveBeenCalled()
    expect(res.ok).toBe(false)
  })

  it('persists the connected account across reloads (localStorage)', async () => {
    const first = renderHook(() => usePet(), { wrapper: PetProvider })
    act(() => {
      first.result.current.actions.hatch({ name: 'Mo', species: 'blip', shell: 'sky' })
    })
    await act(async () => {
      await first.result.current.actions.connect({ handle: 'bob.tngl.sh', team: 'beta' })
    })
    first.unmount()

    // A fresh provider should hydrate the same connected pet from storage.
    const second = renderHook(() => usePet(), { wrapper: PetProvider })
    expect(second.result.current.pet.handle).toBe('bob.tngl.sh')
    expect(second.result.current.pet.team).toBe('beta')
  })
})
