// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use strict'

const { describe, it, expect } = require('@jest/globals')

const mockSyncReceiverInstance = {
  receiveSync: jest.fn(),
  onFirewallSync: jest.fn(),
  onSettingsSync: jest.fn(),
  getLastSyncPayload: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  SyncReceiver: jest.fn(() => mockSyncReceiverInstance),
}))

describe('CMCC Sync Receiver Integration', () => {
  let _controller
  const mockCtx = {
    params: {},
    request: { body: {} },
    state: { user: { id: 'admin' } },
    send: jest.fn(),
    badRequest: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('receivePlatformSync', () => {
    it('processes a valid sync payload successfully', async () => {
      mockSyncReceiverInstance.receiveSync.mockResolvedValue({
        success: true,
        platform: 'Strapi',
        timestamp: new Date().toISOString(),
        rulesVersion: 'abc123',
      })

      // Wire up the service chain: controller -> cmccService -> syncReceiver
      const strapi = {
        entityService: { findMany: jest.fn(), create: jest.fn() },
        log: {
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
        plugin: jest.fn(() => ({
          service: jest.fn((name) => {
            if (name === 'syncReceiver') {
              return mockSyncReceiverInstance
            }
            // cmccService delegates receivePlatformSync to syncReceiver
            if (name === 'cmccService') {
              return {
                receivePlatformSync: (payload) =>
                  mockSyncReceiverInstance.receiveSync(payload),
              }
            }
            return { updateSettings: jest.fn() }
          }),
          config: jest.fn(() => ({})),
        })),
      }

      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = {
        ...mockCtx,
        request: {
          body: {
            firewall_rules: { max_links: 3, blacklisted_keywords: 'spam,bad' },
            auto_moderation: { behavior: 'flag' },
            timestamp: new Date().toISOString(),
            source: 'wordpress-hub',
          },
        },
      }

      await ctrl.receivePlatformSync(ctx)

      expect(mockSyncReceiverInstance.receiveSync).toHaveBeenCalledWith(
        ctx.request.body,
      )
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: true }),
        }),
      )
    })

    it('returns 400 when cmccService errors', async () => {
      const strapi = {
        entityService: { findMany: jest.fn(), create: jest.fn() },
        log: {
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
        plugin: jest.fn(() => ({
          service: jest.fn((name) => {
            if (name === 'cmccService') {
              return {
                receivePlatformSync: jest
                  .fn()
                  .mockRejectedValue(new Error('Sync failed')),
              }
            }
            return { updateSettings: jest.fn() }
          }),
          config: jest.fn(() => ({})),
        })),
      }

      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = {
        ...mockCtx,
        request: { body: {} },
      }

      await ctrl.receivePlatformSync(ctx)

      expect(ctx.badRequest).toHaveBeenCalled()
    })
  })
})
