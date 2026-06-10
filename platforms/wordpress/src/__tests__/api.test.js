/**
 * Tests for the CMCC WordPress API utility (lib/api.js)
 */

import { apiFetch } from '../lib/api'

describe('apiFetch()', () => {
  const mockJson = jest.fn()
  const mockFetch = jest.fn()

  beforeAll(() => {
    global.fetch = mockFetch
    global.window = Object.create(window)
    Object.assign(global.window, {
      cmccData: {
        restUrl: '/wp-json/cmcc/v1/',
        nonce: 'test-nonce-abc',
      },
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds the correct URL from cmccData.restUrl + path', async () => {
    mockJson.mockResolvedValue({ success: true })
    mockFetch.mockResolvedValue({ ok: true, json: mockJson })

    await apiFetch('queue')

    expect(mockFetch).toHaveBeenCalledWith(
      '/wp-json/cmcc/v1/queue',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-WP-Nonce': 'test-nonce-abc',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('includes custom headers passed in options', async () => {
    mockJson.mockResolvedValue({ success: true })
    mockFetch.mockResolvedValue({ ok: true, json: mockJson })

    await apiFetch('settings', {
      headers: { 'X-Custom': 'value' },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value',
        }),
      }),
    )
  })

  it('passes method and body options through to fetch', async () => {
    mockJson.mockResolvedValue({ success: true })
    mockFetch.mockResolvedValue({ ok: true, json: mockJson })

    const body = JSON.stringify({ action: 'approve' })
    await apiFetch('queue/123/moderate', {
      method: 'POST',
      body,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body,
      }),
    )
  })

  it('rejects with error object on non-ok response', async () => {
    const errResponse = { code: 'cmcc_error', message: 'Something went wrong' }
    mockJson.mockResolvedValue(errResponse)
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: mockJson })

    await expect(apiFetch('queue')).rejects.toEqual(errResponse)
  })

  it('handles 403 with rest_cookie_invalid_nonce gracefully', async () => {
    const errResponse = {
      code: 'rest_cookie_invalid_nonce',
      message: 'Nonce invalid',
    }
    mockJson.mockResolvedValue(errResponse)
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: mockJson })

    await expect(apiFetch('some-path')).rejects.toEqual(errResponse)
  })

  it('falls back to default URL when cmccData is missing', async () => {
    const originalCmccData = global.window.cmccData
    delete global.window.cmccData
    mockJson.mockResolvedValue({ success: true })
    mockFetch.mockResolvedValue({ ok: true, json: mockJson })

    await apiFetch('test')

    expect(mockFetch).toHaveBeenCalledWith(
      '/wp-json/cmcc/v1/test',
      expect.any(Object),
    )

    global.window.cmccData = originalCmccData
  })
})
