import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { joinTeam, getStatus, getZoo, getPet } from './client.js'

const realFetch = global.fetch

function mockFetch(impl) {
  global.fetch = vi.fn(impl)
}

beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  global.fetch = realFetch
})

describe('client', () => {
  it('POSTs join with a JSON body and returns the ok envelope', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, did: 'did:plc:dev', state: 'backfilling' }),
    }))
    const res = await joinTeam({ handle: 'alice.tngl.sh', team: 'acme' })
    expect(res).toEqual({
      ok: true,
      status: 200,
      data: { ok: true, did: 'did:plc:dev', state: 'backfilling' },
      error: null,
    })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/join')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ handle: 'alice.tngl.sh', team: 'acme' })
  })

  it('surfaces a non-ok response with its error message', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many joins' }),
    }))
    const res = await joinTeam({ handle: 'a', team: 'b' })
    expect(res.ok).toBe(false)
    expect(res.status).toBe(429)
    expect(res.error).toBe('Too many joins')
  })

  it('encodes the handle in status + pet URLs', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    await getStatus('alice.tngl.sh')
    await getPet('a/b')
    expect(global.fetch.mock.calls[0][0]).toBe('/api/status/alice.tngl.sh')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/pet/a%2Fb')
  })

  it('hits the zoo endpoint for a team', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ members: [] }) }))
    const res = await getZoo('acme')
    expect(global.fetch.mock.calls[0][0]).toBe('/api/zoo/acme')
    expect(res.ok).toBe(true)
  })

  it('never throws on a network failure — returns a soft error envelope', async () => {
    mockFetch(async () => {
      throw new Error('Failed to fetch')
    })
    const res = await getZoo('acme')
    expect(res).toEqual({ ok: false, status: 0, data: {}, error: 'Failed to fetch' })
  })

  it('tolerates a non-JSON body without throwing', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected end of JSON input')
      },
    }))
    const res = await getStatus('alice')
    expect(res.ok).toBe(true)
    expect(res.data).toEqual({})
  })
})
