'use strict'

const { describe, it, expect } = require('@jest/globals')

const mockUndoServiceInstance = {
  saveSnapshot: jest.fn(),
  undo: jest.fn(),
  getUndoInfo: jest.fn(),
  cleanExpiredSnapshots: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  UndoService: jest.fn(() => mockUndoServiceInstance),
}))

const mockEntityService = {
  findOne: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  findMany: jest.fn(),
}

const mockCtx = {
  params: {},
  request: { body: {} },
  state: { user: { id: 'mod-1' } },
  send: jest.fn(),
  badRequest: jest.fn(),
}

describe('CMCC Undo Integration', () => {
  let controller

  beforeEach(() => {
    jest.clearAllMocks()
    const mockService = {
      moderateItem: jest.fn(),
      addFeedEvent: jest.fn(),
      logActivity: jest.fn(),
      updateAnalytics: jest.fn(),
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
        service: jest.fn(() => mockService),
        config: jest.fn(() => ({})),
      })),
    }

    controller = require('../controllers/cmcc-controller')({
      strapi: mockStrapi,
    })
  })

  describe('undoItem', () => {
    it('undoes a moderation action successfully', async () => {
      const mockService = {
        undoItem: jest.fn().mockResolvedValue({
          success: true,
          restoredState: { status: 'pending' },
        }),
      }

      const strapi = {
        entityService: mockEntityService,
        log: {
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
        plugin: jest.fn(() => ({
          service: jest.fn((name) => {
            if (name === 'cmccService') return mockService
            return { addFeedEvent: jest.fn(), logActivity: jest.fn() }
          }),
          config: jest.fn(() => ({})),
        })),
      }

      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = {
        ...mockCtx,
        params: { id: '1' },
        request: { body: {} },
      }

      await ctrl.undoItem(ctx)

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Action undone successfully',
        }),
      )
    })

    it('returns error when no undo snapshot exists', async () => {
      const mockService = {
        undoItem: jest.fn().mockRejectedValue(new Error('No snapshot found')),
      }

      const strapi = {
        entityService: mockEntityService,
        log: {
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
        plugin: jest.fn(() => ({
          service: jest.fn((name) => {
            if (name === 'cmccService') return mockService
            return { addFeedEvent: jest.fn(), logActivity: jest.fn() }
          }),
          config: jest.fn(() => ({})),
        })),
      }

      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = {
        ...mockCtx,
        params: { id: '999' },
        request: { body: {} },
      }

      await ctrl.undoItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('undo'),
        expect.any(Object),
      )
    })
  })

  describe('getUndoInfo', () => {
    it('returns undo info for an item', async () => {
      const mockService = {
        getUndoInfo: jest.fn().mockResolvedValue({
          available: true,
          remainingSeconds: 240,
          currentStatus: 'approved',
        }),
      }

      const strapi = {
        entityService: mockEntityService,
        log: {
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
        plugin: jest.fn(() => ({
          service: jest.fn((name) => {
            if (name === 'cmccService') return mockService
            return { addFeedEvent: jest.fn(), logActivity: jest.fn() }
          }),
          config: jest.fn(() => ({})),
        })),
      }

      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = {
        ...mockCtx,
        params: { id: '1' },
      }

      await ctrl.getUndoInfo(ctx)

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            available: true,
            remainingSeconds: 240,
          }),
        }),
      )
    })
  })
})
