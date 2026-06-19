/**
 * Unit tests for CMCC WebhookService (server-core)
 */

import { WebhookService } from '../../notifications/webhook-service'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WebhookService', () => {
  let service: WebhookService

  beforeEach(() => {
    service = new WebhookService(5000) // 5s timeout for tests
    mockFetch.mockReset()
  })

  it('dispatches a webhook and returns success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)

    const result = await service.dispatch('https://hooks.example.com/cmcc', {
      event: 'test',
      data: { id: '123' },
    })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/cmcc',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CMCC-Webhook': 'true',
        }),
      }),
    )
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network timeout'))

    const result = await service.dispatch('https://hooks.example.com/cmcc', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network timeout')
  })

  it('dispatches to multiple targets via dispatchMulti', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)

    const results = await service.dispatchMulti([
      { url: 'https://hook1.example.com', payload: { a: 1 } },
      { url: 'https://hook2.example.com', payload: { b: 2 } },
    ])

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('buildPayload creates standard webhook payload', () => {
    const payload = WebhookService.buildPayload('item.created', {
      id: '123',
      status: 'pending',
    })

    expect(payload['event']).toBe('item.created')
    expect(payload['data']).toEqual({ id: '123', status: 'pending' })
    expect(payload['version']).toBe('1.0')
    expect(payload['timestamp']).toBeDefined()
  })
})
