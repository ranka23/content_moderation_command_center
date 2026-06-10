'use strict'

const { describe, it, expect } = require('@jest/globals')

const mockWebhookServiceInstance = {
  dispatch: jest.fn(),
  dispatchMulti: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  WebhookService: jest.fn(() => mockWebhookServiceInstance),
}))

const mockEntityService = {
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockStrapi = {
  entityService: mockEntityService,
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  plugin: jest.fn(() => ({
    service: jest.fn(() => ({
      addFeedEvent: jest.fn(),
    })),
  })),
}

describe('CMCC Webhook Service', () => {
  let webhookService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.isolateModules(() => {
      webhookService = require('../services/webhook-service')({
        strapi: mockStrapi,
      })
    })
  })

  describe('getEndpoints', () => {
    it('returns all configured webhook endpoints', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          id: 1,
          url: 'https://hook.example.com/1',
          events: ['new_item', 'approved'],
          active: true,
        },
        {
          id: 2,
          url: 'https://hook.example.com/2',
          events: ['spam'],
          active: false,
        },
      ])

      const endpoints = await webhookService.getEndpoints()

      expect(endpoints).toHaveLength(2)
      expect(endpoints[0].url).toBe('https://hook.example.com/1')
    })

    it('returns empty array when no endpoints configured', async () => {
      mockEntityService.findMany.mockResolvedValue([])
      const endpoints = await webhookService.getEndpoints()
      expect(endpoints).toEqual([])
    })
  })

  describe('registerEndpoint', () => {
    it('creates a new webhook endpoint', async () => {
      mockEntityService.create.mockResolvedValue({
        id: 1,
        url: 'https://hook.example.com',
        events: ['new_item'],
        active: true,
      })

      const result = await webhookService.registerEndpoint({
        url: 'https://hook.example.com',
        events: ['new_item'],
        secret: 'abc123',
      })

      expect(mockEntityService.create).toHaveBeenCalledWith(
        'plugin::cmcc.webhook-config',
        expect.objectContaining({
          data: expect.objectContaining({
            url: 'https://hook.example.com',
          }),
        }),
      )
      expect(result.active).toBe(true)
    })
  })

  describe('testEndpoint', () => {
    it('dispatches a test webhook and returns the result', async () => {
      mockWebhookServiceInstance.dispatch.mockResolvedValue({
        success: true,
        url: 'https://hook.example.com',
        statusCode: 200,
      })

      const result = await webhookService.testEndpoint(
        'https://hook.example.com',
        { 'X-Test': 'true' },
      )

      expect(mockWebhookServiceInstance.dispatch).toHaveBeenCalledWith(
        'https://hook.example.com',
        expect.objectContaining({
          event: 'test',
          data: expect.objectContaining({ message: 'CMCC webhook test' }),
        }),
        { 'X-Test': 'true' },
      )
      expect(result.success).toBe(true)
    })
  })

  describe('dispatchEvent', () => {
    it('dispatches event to all active endpoints matching the event type', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          id: 1,
          url: 'https://hook1.example.com',
          events: ['new_item', 'approved'],
          secret: 'sec1',
          active: true,
          headers: {},
        },
        {
          id: 2,
          url: 'https://hook2.example.com',
          events: ['new_item'],
          secret: '',
          active: true,
          headers: { 'X-Custom': 'val' },
        },
        {
          id: 3,
          url: 'https://hook3.example.com',
          events: ['spam'],
          active: false,
          headers: {},
        },
      ])

      mockWebhookServiceInstance.dispatch
        .mockResolvedValueOnce({
          success: true,
          url: 'https://hook1.example.com',
          statusCode: 200,
        })
        .mockResolvedValueOnce({
          success: true,
          url: 'https://hook2.example.com',
          statusCode: 200,
        })

      const results = await webhookService.dispatchEvent('new_item', {
        itemId: 'ext-1',
        title: 'Test',
      })

      expect(results).toHaveLength(2)
      expect(mockWebhookServiceInstance.dispatch).toHaveBeenCalledTimes(2)
    })

    it('returns empty array when no matching endpoints', async () => {
      mockEntityService.findMany.mockResolvedValue([])

      const results = await webhookService.dispatchEvent('new_item', {})

      expect(results).toEqual([])
    })
  })
})
