/**
 * WebhookService
 *
 * Dispatches outbound webhooks to configured URLs when moderation events occur.
 * Supports custom headers, timeouts, and dispatching to multiple endpoints.
 *
 * Usage:
 *   const service = new WebhookService()
 *   await service.dispatch(url, payload, { 'X-Custom': 'value' })
 *   await service.dispatchMulti([{ url, payload }])
 */

/**
 * Result of a single webhook dispatch.
 */
export interface WebhookDispatchResult {
  success: boolean
  url: string
  statusCode?: number
  error?: string
}

/**
 * A webhook dispatch target with payload.
 */
export interface WebhookTarget {
  /** Target URL */
  url: string
  /** JSON-serializable payload */
  payload: Record<string, unknown>
  /** Optional custom headers */
  headers?: Record<string, string>
}

/**
 * Service for dispatching outbound webhooks to configured URLs.
 */
export class WebhookService {
  private defaultTimeout: number

  /**
   * @param defaultTimeout - Request timeout in ms (default: 10000)
   */
  constructor(defaultTimeout: number = 10000) {
    this.defaultTimeout = defaultTimeout
  }

  /**
   * Dispatch a single webhook.
   *
   * @param url      - Target webhook URL
   * @param payload  - JSON payload to send
   * @param headers  - Optional custom headers
   * @param timeout  - Request timeout in ms
   */
  async dispatch(
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string> = {},
    timeout?: number,
  ): Promise<WebhookDispatchResult> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout || this.defaultTimeout)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CMCC-Webhook': 'true',
          ...headers,
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      return {
        success: response.ok,
        url,
        statusCode: response.status,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook dispatch failed'
      return { success: false, url, error: message }
    }
  }

  /**
   * Dispatch webhooks to multiple endpoints concurrently.
   *
   * @param targets - Array of webhook targets
   * @returns Array of dispatch results
   */
  async dispatchMulti(targets: WebhookTarget[]): Promise<WebhookDispatchResult[]> {
    const results = await Promise.allSettled(
      targets.map((t) =>
        this.dispatch(t.url, t.payload, t.headers),
      ),
    )

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return {
        success: false,
        url: targets[i]?.url || 'unknown',
        error: r.reason?.message || 'Unknown error',
      }
    })
  }

  /**
   * Build a standard webhook payload for a moderation event.
   */
  static buildPayload(
    eventType: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0',
    }
  }
}
