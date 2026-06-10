'use strict'

const { WebhookService: CoreWebhookService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi webhook service wrapping @cmcc/server-core WebhookService.
 * Manages webhook endpoint configurations and dispatches events
 * to configured endpoints on moderation actions.
 */
module.exports = ({ strapi }) => {
  const coreService = new CoreWebhookService()
  const whUid = `plugin::${PLUGIN_ID}.webhook-config`

  return {
    /**
     * Get all configured webhook endpoints.
     */
    async getEndpoints() {
      const endpoints = await strapi.entityService.findMany(whUid)
      return endpoints || []
    },

    /**
     * Register a new webhook endpoint.
     */
    async registerEndpoint({ url, events, secret, headers }) {
      return strapi.entityService.create(whUid, {
        data: {
          url,
          events: events || [],
          secret: secret || '',
          headers: headers || {},
          active: true,
        },
      })
    },

    /**
     * Update a webhook endpoint configuration.
     */
    async updateEndpoint(id, data) {
      return strapi.entityService.update(whUid, id, { data })
    },

    /**
     * Delete a webhook endpoint.
     */
    async deleteEndpoint(id) {
      return strapi.entityService.delete(whUid, id)
    },

    /**
     * Test a webhook endpoint by sending a test payload.
     */
    async testEndpoint(url, headers = {}) {
      return coreService.dispatch(
        url,
        {
          event: 'test',
          data: {
            message: 'CMCC webhook test',
            timestamp: new Date().toISOString(),
          },
        },
        headers,
      )
    },

    /**
     * Dispatch an event to all active endpoints that subscribe to it.
     */
    async dispatchEvent(eventType, payload) {
      const endpoints = await strapi.entityService.findMany(whUid)

      if (!endpoints || endpoints.length === 0) return []

      const targets = endpoints.filter(
        (ep) =>
          ep.active &&
          ep.events &&
          ep.events.includes(eventType),
      )

      if (targets.length === 0) return []

      const results = await Promise.allSettled(
        targets.map((target) => {
          const headers = {}
          if (target.secret) {
            headers['X-CMCC-Secret'] = target.secret
          }
          if (target.headers && typeof target.headers === 'object') {
            Object.assign(headers, target.headers)
          }
          return coreService.dispatch(target.url, payload, headers)
        }),
      )

      return results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value
        return {
          success: false,
          url: targets[i]?.url || 'unknown',
          error: r.reason?.message || 'Unknown error',
        }
      })
    },
  }
}
