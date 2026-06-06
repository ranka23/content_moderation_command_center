'use strict'

const { describe, it, expect, beforeEach } = require('@jest/globals')

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockService = {
  getQueue: jest.fn(),
  moderateItem: jest.fn(),
  bulkAction: jest.fn(),
  getAnalytics: jest.fn(),
  getActivityLog: jest.fn(),
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}

const mockStrapi = {
  plugin: jest.fn(() => ({
    service: jest.fn(() => mockService),
    config: jest.fn(() => ({
      autoModerate: false,
      moderationBehavior: 'flag',
      maxLinks: 5,
      blacklistedKeywords: [],
      duplicateDetection: true,
      notifyOnSpam: true,
    })),
  })),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}

// Build a minimal mock Koa context
function buildCtx(overrides = {}) {
  return {
    params: {},
    query: {},
    request: { body: {} },
    state: { user: { id: 'mod-1' } },
    send: jest.fn(),
    badRequest: jest.fn(),
    ...overrides,
  }
}

const controller = require('../controllers/cmcc-controller')({
  strapi: mockStrapi,
})

describe('CMCC Strapi Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // getQueue
  // -----------------------------------------------------------------------

  describe('getQueue', () => {
    it('returns paginated queue items', async () => {
      const expected = {
        results: [{ id: 1, title: 'Test' }],
        pagination: { page: 1, pageSize: 20, total: 1 },
      }
      mockService.getQueue.mockResolvedValue(expected)
      const ctx = buildCtx({ query: { page: '1', pageSize: '20' } })

      await controller.getQueue(ctx)

      expect(mockService.getQueue).toHaveBeenCalledWith(ctx.query)
      expect(ctx.send).toHaveBeenCalledWith({
        data: expected.results,
        pagination: expected.pagination,
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.getQueue.mockRejectedValue(new Error('DB error'))
      const ctx = buildCtx()

      await controller.getQueue(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to fetch queue items',
        { error: 'DB error' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // moderateItem
  // -----------------------------------------------------------------------

  describe('moderateItem', () => {
    it('moderates an item successfully', async () => {
      const updated = { id: 1, status: 'approved' }
      mockService.moderateItem.mockResolvedValue(updated)
      const ctx = buildCtx({
        params: { id: '1' },
        request: { body: { action: 'approve' } },
      })

      await controller.moderateItem(ctx)

      expect(mockService.moderateItem).toHaveBeenCalledWith('1', 'approve', 'mod-1')
      expect(ctx.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Item approved successfully',
      })
    })

    it('returns 400 when action is missing', async () => {
      const ctx = buildCtx({
        params: { id: '1' },
        request: { body: {} },
      })

      await controller.moderateItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Action is required')
    })

    it('returns 400 for invalid action', async () => {
      const ctx = buildCtx({
        params: { id: '1' },
        request: { body: { action: 'invalid' } },
      })

      await controller.moderateItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Action must be one of: approve, reject, spam, defer',
      )
    })

    it('handles service errors gracefully', async () => {
      mockService.moderateItem.mockRejectedValue(new Error('Not found'))
      const ctx = buildCtx({
        params: { id: '999' },
        request: { body: { action: 'approve' } },
      })

      await controller.moderateItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to moderate item', {
        error: 'Not found',
      })
    })
  })

  // -----------------------------------------------------------------------
  // bulkAction
  // -----------------------------------------------------------------------

  describe('bulkAction', () => {
    it('performs bulk action successfully', async () => {
      const result = {
        succeeded: [{ id: 1 }, { id: 2 }],
        failed: [],
      }
      mockService.bulkAction.mockResolvedValue(result)
      const ctx = buildCtx({
        request: {
          body: { itemIds: ['1', '2'], action: 'approve' },
        },
      })

      await controller.bulkAction(ctx)

      expect(mockService.bulkAction).toHaveBeenCalledWith(
        ['1', '2'],
        'approve',
        'mod-1',
      )
      expect(ctx.send).toHaveBeenCalledWith({
        data: result,
        message: 'Bulk action completed: 2 succeeded, 0 failed',
      })
    })

    it('returns 400 when itemIds is missing', async () => {
      const ctx = buildCtx({
        request: { body: { action: 'approve' } },
      })

      await controller.bulkAction(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'itemIds must be a non-empty array',
      )
    })

    it('returns 400 when itemIds is empty', async () => {
      const ctx = buildCtx({
        request: { body: { itemIds: [], action: 'approve' } },
      })

      await controller.bulkAction(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'itemIds must be a non-empty array',
      )
    })
  })

  // -----------------------------------------------------------------------
  // getAnalytics
  // -----------------------------------------------------------------------

  describe('getAnalytics', () => {
    it('returns analytics data', async () => {
      const analytics = {
        totalItems: 100,
        statusCounts: [
          { status: 'pending', count: 50 },
          { status: 'approved', count: 30 },
        ],
        recentActivity: [],
        topContentTypes: [],
      }
      mockService.getAnalytics.mockResolvedValue(analytics)
      const ctx = buildCtx()

      await controller.getAnalytics(ctx)

      expect(ctx.send).toHaveBeenCalledWith({ data: analytics })
    })

    it('handles service errors gracefully', async () => {
      mockService.getAnalytics.mockRejectedValue(new Error('Query failed'))
      const ctx = buildCtx()

      await controller.getAnalytics(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to fetch analytics',
        { error: 'Query failed' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // getActivityLog
  // -----------------------------------------------------------------------

  describe('getActivityLog', () => {
    it('returns paginated activity log', async () => {
      const result = {
        results: [{ id: 1, action: 'approved' }],
        pagination: { page: 1, pageSize: 20, total: 1 },
      }
      mockService.getActivityLog.mockResolvedValue(result)
      const ctx = buildCtx({ query: { page: '1' } })

      await controller.getActivityLog(ctx)

      expect(mockService.getActivityLog).toHaveBeenCalledWith(ctx.query)
      expect(ctx.send).toHaveBeenCalledWith({
        data: result.results,
        pagination: result.pagination,
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.getActivityLog.mockRejectedValue(
        new Error('Log fetch failed'),
      )
      const ctx = buildCtx()

      await controller.getActivityLog(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to fetch activity log',
        { error: 'Log fetch failed' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // getSettings
  // -----------------------------------------------------------------------

  describe('getSettings', () => {
    it('returns settings when they exist', async () => {
      const settings = {
        autoModerate: true,
        moderationBehavior: 'flag',
      }
      mockService.getSettings.mockResolvedValue(settings)
      const ctx = buildCtx()

      await controller.getSettings(ctx)

      expect(ctx.send).toHaveBeenCalledWith({ data: settings })
    })

    it('returns defaults when no settings exist', async () => {
      mockService.getSettings.mockResolvedValue(null)
      const ctx = buildCtx()

      await controller.getSettings(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          autoModerate: false,
          moderationBehavior: 'flag',
          maxLinks: 5,
          blacklistedKeywords: [],
          duplicateDetection: true,
          notifyOnSpam: true,
        },
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.getSettings.mockRejectedValue(new Error('Settings error'))
      const ctx = buildCtx()

      await controller.getSettings(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to fetch settings',
        { error: 'Settings error' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // updateSettings
  // -----------------------------------------------------------------------

  describe('updateSettings', () => {
    it('updates and returns settings', async () => {
      const updated = {
        id: 1,
        autoModerate: true,
        moderationBehavior: 'flag',
      }
      mockService.updateSettings.mockResolvedValue(updated)
      const ctx = buildCtx({
        request: {
          body: { autoModerate: true, moderationBehavior: 'flag' },
        },
      })

      await controller.updateSettings(ctx)

      expect(mockService.updateSettings).toHaveBeenCalledWith(ctx.request.body)
      expect(ctx.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Settings updated successfully',
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.updateSettings.mockRejectedValue(
        new Error('Update failed'),
      )
      const ctx = buildCtx({
        request: { body: { autoModerate: true } },
      })

      await controller.updateSettings(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to update settings',
        { error: 'Update failed' },
      )
    })
  })
})
