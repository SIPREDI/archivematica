import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHttpClient, HttpError } from '@/shared/http'
import { getStatus } from '@/shared/http'

const mockFetch = vi.fn()

describe('shared http client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('appends query params and cache buster', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    })

    const client = createHttpClient()
    await client.getJson('/status/', {
      query: { foo: 'bar', empty: null },
      cacheBust: true,
    })

    expect(mockFetch).toHaveBeenCalled()
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit?]
    expect(url).toMatch(/^\/status\/\?/)
    expect(url).toContain('foo=bar')
    expect(url).toMatch(/[_]=\d+/)
  })

  it('sends JSON body with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    })

    const client = createHttpClient()
    await client.requestJson('/api/test/', {
      method: 'POST',
      json: { a: 1 },
    })

    expect(mockFetch).toHaveBeenCalled()
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit?]
    const headers = new Headers(init?.headers as HeadersInit)

    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ a: 1 }))
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest')
  })

  it('throws HttpError for non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      url: '/status/',
      text: async () => '<html>error</html>',
    })

    const client = createHttpClient()
    await expect(client.getJson('/status/')).rejects.toBeInstanceOf(HttpError)
  })

  it('returns null for empty responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    })

    const client = createHttpClient()
    const result = await client.getJson('/status/')
    expect(result).toBeNull()
  })

  it('returns null for non-JSON success bodies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<html>ok</html>',
    })

    const client = createHttpClient()
    const result = await client.getJson('/status/')
    expect(result).toBeNull()
  })

  it('getStatus calls /status/ with cache busting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ sip: 0, transfer: 0, dip: 0 }),
    })

    await getStatus()

    expect(mockFetch).toHaveBeenCalled()
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit?]
    expect(url).toMatch(/^\/status\/\?/)
    expect(url).toMatch(/[_]=\d+/)
  })
})
