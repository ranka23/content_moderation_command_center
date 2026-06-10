'use strict'

const { describe, it, expect, beforeEach } = require('@jest/globals')

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockService = {
  getQueue: jest.fn(),
  moderateItem: jest.fn(),
  bulkAction: jest.fn(),
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  getItemHistory: jest.fn(),
  getNotes: jest.fn(),
  addNote: jest.fn(),
  assignItem: jest.fn(),
  getActivityFeed: jest.fn(),
  getAnalytics: jest.fn(),
  getActivityLog: jest.fn(),
  getUserReputation: jest.fn(),
  getUserReputationDetail: jest.fn(),
  getModerationReport: jest.fn(),
  getComplianceAudit: jest.fn(),
  scheduleReport: jest.fn(),
  getPlatformStatus: jest.fn(),
  syncSettings: jest.fn(),
  getUnifiedQueue: jest.fn(),
  exportSettings: jest.fn(),
  importSettings: jest.fn(),
  evaluateItem: jest.fn(),
  undoItem: jest.fn(),
  getUndoInfo: jest.fn(),
  sendNotification: jest.fn(),
  getNotificationSettings: jest.fn(),
  testWebhook: jest.fn(),
  getHooks: jest.fn(),
  toggleHook: jest.fn(),
  purgeRetention: jest.fn(),
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
    notFound: jest.fn(),
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

      expect(mockService.moderateItem).toHaveBeenCalledWith(
        '1',
        'approve',
        'mod-1',
      )
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
        'Action must be one of: approve, reject, spam, defer, flag',
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
  // getItemHistory
  // -----------------------------------------------------------------------

  describe('getItemHistory', () => {
    it('returns item history', async () => {
      mockService.getItemHistory.mockResolvedValue([
        { id: 1, action: 'approved' },
      ])
      const ctx = buildCtx({ params: { id: '1' } })

      await controller.getItemHistory(ctx)

      expect(mockService.getItemHistory).toHaveBeenCalledWith('1')
      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ id: 1, action: 'approved' }],
      })
    })
  })

  // -----------------------------------------------------------------------
  // getNotes
  // -----------------------------------------------------------------------

  describe('getNotes', () => {
    it('returns notes for an item', async () => {
      mockService.getNotes.mockResolvedValue([
        { id: 'n1', content: 'Note content' },
      ])
      const ctx = buildCtx({ params: { id: 'item-1' } })

      await controller.getNotes(ctx)

      expect(mockService.getNotes).toHaveBeenCalledWith('item-1')
      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ id: 'n1', content: 'Note content' }],
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.getNotes.mockRejectedValue(new Error('Not found'))
      const ctx = buildCtx({ params: { id: '999' } })

      await controller.getNotes(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to fetch notes', {
        error: 'Not found',
      })
    })
  })

  // -----------------------------------------------------------------------
  // addNote
  // -----------------------------------------------------------------------

  describe('addNote', () => {
    it('adds a note successfully', async () => {
      mockService.addNote.mockResolvedValue({ id: 'n1', content: 'New note' })
      const ctx = buildCtx({
        params: { id: 'item-1' },
        request: {
          body: { content: 'New note', isInternal: false, type: 'general' },
        },
      })

      await controller.addNote(ctx)

      expect(mockService.addNote).toHaveBeenCalledWith('item-1', {
        content: 'New note',
        authorId: 'mod-1',
        authorName: 'Anonymous',
        isInternal: false,
        type: 'general',
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: { id: 'n1', content: 'New note' },
        message: 'Note added successfully',
      })
    })

    it('returns 400 when content is missing', async () => {
      const ctx = buildCtx({
        params: { id: 'item-1' },
        request: { body: {} },
      })

      await controller.addNote(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Note content is required')
    })
  })

  // -----------------------------------------------------------------------
  // assignItem
  // -----------------------------------------------------------------------

  describe('assignItem', () => {
    it('assigns an item successfully', async () => {
      mockService.assignItem.mockResolvedValue({
        itemId: 'item-1',
        assigneeId: 'mod-2',
        priority: 'high',
      })
      const ctx = buildCtx({
        params: { id: 'item-1' },
        request: { body: { assigneeId: 'mod-2', priority: 'high' } },
      })

      await controller.assignItem(ctx)

      expect(mockService.assignItem).toHaveBeenCalledWith('item-1', {
        assigneeId: 'mod-2',
        teamId: undefined,
        assignedById: 'mod-1',
        dueDate: undefined,
        priority: 'high',
      })
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Item assigned successfully' }),
      )
    })

    it('handles service errors gracefully', async () => {
      mockService.assignItem.mockRejectedValue(new Error('Item not found'))
      const ctx = buildCtx({
        params: { id: '999' },
        request: { body: { assigneeId: 'mod-2' } },
      })

      await controller.assignItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to assign item', {
        error: 'Item not found',
      })
    })
  })

  // -----------------------------------------------------------------------
  // getActivityFeed
  // -----------------------------------------------------------------------

  describe('getActivityFeed', () => {
    it('returns activity feed events', async () => {
      mockService.getActivityFeed.mockResolvedValue([
        { id: 'evt-1', type: 'action' },
      ])
      const ctx = buildCtx({ query: { limit: '10' } })

      await controller.getActivityFeed(ctx)

      expect(mockService.getActivityFeed).toHaveBeenCalledWith(10)
      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ id: 'evt-1', type: 'action' }],
      })
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

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to fetch analytics', {
        error: 'Query failed',
      })
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
  // getUserReputation
  // -----------------------------------------------------------------------

  describe('getUserReputation', () => {
    it('returns user reputation data', async () => {
      mockService.getUserReputation.mockResolvedValue([
        { userId: 'user-1', totalItems: 10, trustLevel: 'trusted' },
      ])
      const ctx = buildCtx()

      await controller.getUserReputation(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ userId: 'user-1', totalItems: 10, trustLevel: 'trusted' }],
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.getUserReputation.mockRejectedValue(new Error('Query failed'))
      const ctx = buildCtx()

      await controller.getUserReputation(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Failed to fetch user reputation',
        { error: 'Query failed' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // getUserReputationDetail
  // -----------------------------------------------------------------------

  describe('getUserReputationDetail', () => {
    it('returns detail for a specific user', async () => {
      mockService.getUserReputationDetail.mockResolvedValue({
        userId: 'user-1',
        totalActions: 5,
        history: [],
      })
      const ctx = buildCtx({ params: { id: 'user-1' } })

      await controller.getUserReputationDetail(ctx)

      expect(mockService.getUserReputationDetail).toHaveBeenCalledWith('user-1')
      expect(ctx.send).toHaveBeenCalledWith({
        data: { userId: 'user-1', totalActions: 5, history: [] },
      })
    })

    it('returns 404 when user not found', async () => {
      mockService.getUserReputationDetail.mockResolvedValue(null)
      const ctx = buildCtx({ params: { id: 'unknown' } })

      await controller.getUserReputationDetail(ctx)

      expect(ctx.notFound).toHaveBeenCalledWith('User not found')
    })
  })

  // -----------------------------------------------------------------------
  // getModerationReport
  // -----------------------------------------------------------------------

  describe('getModerationReport', () => {
    it('generates a moderation report', async () => {
      mockService.getModerationReport.mockResolvedValue({
        success: true,
        data: ['header', 'row1'],
        filename: 'report.csv',
      })
      const ctx = buildCtx({
        request: {
          body: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            format: 'csv',
          },
        },
      })

      await controller.getModerationReport(ctx)

      expect(mockService.getModerationReport).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        format: 'csv',
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          success: true,
          data: ['header', 'row1'],
          filename: 'report.csv',
        },
      })
    })
  })

  // -----------------------------------------------------------------------
  // getComplianceAudit
  // -----------------------------------------------------------------------

  describe('getComplianceAudit', () => {
    it('generates a compliance audit', async () => {
      mockService.getComplianceAudit.mockResolvedValue({
        success: true,
        data: [],
        filename: 'audit.json',
      })
      const ctx = buildCtx({
        request: { body: { startDate: '2024-01-01', endDate: '2024-12-31' } },
      })

      await controller.getComplianceAudit(ctx)

      expect(mockService.getComplianceAudit).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: { success: true, data: [], filename: 'audit.json' },
      })
    })
  })

  // -----------------------------------------------------------------------
  // scheduleReport
  // -----------------------------------------------------------------------

  describe('scheduleReport', () => {
    it('schedules a recurring report', async () => {
      mockService.scheduleReport.mockResolvedValue({
        success: true,
        schedule: { id: '1', type: 'moderation_activity', frequency: 'daily' },
      })
      const ctx = buildCtx({
        request: {
          body: {
            type: 'moderation_activity',
            frequency: 'daily',
            emails: ['admin@test.com'],
          },
        },
      })

      await controller.scheduleReport(ctx)

      expect(mockService.scheduleReport).toHaveBeenCalledWith({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@test.com'],
        createdBy: 'mod-1',
      })
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Report scheduled successfully' }),
      )
    })

    it('returns 400 when type or frequency missing', async () => {
      const ctx = buildCtx({ request: { body: {} } })

      await controller.scheduleReport(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Report type and frequency are required',
      )
    })
  })

  // -----------------------------------------------------------------------
  // getPlatformStatus
  // -----------------------------------------------------------------------

  describe('getPlatformStatus', () => {
    it('returns platform statuses', async () => {
      mockService.getPlatformStatus.mockResolvedValue({
        platforms: [{ id: 'strapi', status: 'connected' }],
      })
      const ctx = buildCtx()

      await controller.getPlatformStatus(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: { platforms: [{ id: 'strapi', status: 'connected' }] },
      })
    })
  })

  // -----------------------------------------------------------------------
  // syncPlatformSettings
  // -----------------------------------------------------------------------

  describe('syncPlatformSettings', () => {
    it('syncs settings across platforms', async () => {
      mockService.syncSettings.mockResolvedValue({
        success: true,
        syncedPlatforms: ['wordpress'],
      })
      const ctx = buildCtx({
        request: {
          body: {
            targetPlatforms: ['wordpress'],
            settings: { autoModerate: true },
          },
        },
      })

      await controller.syncPlatformSettings(ctx)

      expect(mockService.syncSettings).toHaveBeenCalledWith({
        targetPlatforms: ['wordpress'],
        settings: { autoModerate: true },
      })
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Settings synced across platforms',
        }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // getUnifiedQueue
  // -----------------------------------------------------------------------

  describe('getUnifiedQueue', () => {
    it('returns unified queue', async () => {
      mockService.getUnifiedQueue.mockResolvedValue([
        { id: 1, title: 'Cross-platform item' },
      ])
      const ctx = buildCtx({ query: { status: 'pending' } })

      await controller.getUnifiedQueue(ctx)

      expect(mockService.getUnifiedQueue).toHaveBeenCalledWith(ctx.query)
      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ id: 1, title: 'Cross-platform item' }],
      })
    })
  })

  // -----------------------------------------------------------------------
  // exportSettings
  // -----------------------------------------------------------------------

  describe('exportSettings', () => {
    it('exports settings as JSON', async () => {
      mockService.exportSettings.mockResolvedValue({
        data: { autoModerate: true },
        exportedAt: '2024-01-01T00:00:00.000Z',
      })
      const ctx = buildCtx()

      await controller.exportSettings(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          data: { autoModerate: true },
          exportedAt: '2024-01-01T00:00:00.000Z',
        },
        filename: expect.stringContaining('cmcc-settings-'),
      })
    })
  })

  // -----------------------------------------------------------------------
  // importSettings
  // -----------------------------------------------------------------------

  describe('importSettings', () => {
    it('imports settings from JSON', async () => {
      mockService.importSettings.mockResolvedValue({ success: true })
      const ctx = buildCtx({
        request: { body: { settings: { autoModerate: true } } },
      })

      await controller.importSettings(ctx)

      expect(mockService.importSettings).toHaveBeenCalledWith({
        autoModerate: true,
      })
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Settings imported successfully' }),
      )
    })

    it('returns 400 when no settings provided', async () => {
      const ctx = buildCtx({ request: { body: {} } })

      await controller.importSettings(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Settings data is required')
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

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to fetch settings', {
        error: 'Settings error',
      })
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
      mockService.updateSettings.mockRejectedValue(new Error('Update failed'))
      const ctx = buildCtx({
        request: { body: { autoModerate: true } },
      })

      await controller.updateSettings(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to update settings', {
        error: 'Update failed',
      })
    })
  })

  // -----------------------------------------------------------------------
  // evaluateItem (firewall)
  // -----------------------------------------------------------------------

  describe('evaluateItem', () => {
    it('evaluates an item against firewall', async () => {
      mockService.evaluateItem.mockResolvedValue({
        triggered: false,
        action: 'approve',
        spamScore: 0.05,
      })
      const ctx = buildCtx({ params: { id: '1' } })

      await controller.evaluateItem(ctx)

      expect(mockService.evaluateItem).toHaveBeenCalledWith('1')
      expect(ctx.send).toHaveBeenCalledWith({
        data: { triggered: false, action: 'approve', spamScore: 0.05 },
        message: 'Item evaluated successfully',
      })
    })

    it('handles service errors gracefully', async () => {
      mockService.evaluateItem.mockRejectedValue(new Error('Not found'))
      const ctx = buildCtx({ params: { id: '999' } })

      await controller.evaluateItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to evaluate item', {
        error: 'Not found',
      })
    })
  })

  // -----------------------------------------------------------------------
  // undoItem
  // -----------------------------------------------------------------------

  describe('undoItem', () => {
    it('undoes a moderation action', async () => {
      mockService.undoItem.mockResolvedValue({
        success: true,
        restoredState: { status: 'pending' },
      })
      const ctx = buildCtx({ params: { id: '1' } })

      await controller.undoItem(ctx)

      expect(mockService.undoItem).toHaveBeenCalledWith('1')
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Action undone successfully' }),
      )
    })

    it('handles undo errors gracefully', async () => {
      mockService.undoItem.mockRejectedValue(new Error('No snapshot'))
      const ctx = buildCtx({ params: { id: '999' } })

      await controller.undoItem(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith('Failed to undo action', {
        error: 'No snapshot',
      })
    })
  })

  // -----------------------------------------------------------------------
  // getUndoInfo
  // -----------------------------------------------------------------------

  describe('getUndoInfo', () => {
    it('returns undo info', async () => {
      mockService.getUndoInfo.mockResolvedValue({
        available: true,
        remainingSeconds: 240,
        currentStatus: 'approved',
      })
      const ctx = buildCtx({ params: { id: '1' } })

      await controller.getUndoInfo(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          available: true,
          remainingSeconds: 240,
          currentStatus: 'approved',
        },
      })
    })

    it('returns null when no undo available', async () => {
      mockService.getUndoInfo.mockResolvedValue(null)
      const ctx = buildCtx({ params: { id: '999' } })

      await controller.getUndoInfo(ctx)

      expect(ctx.send).toHaveBeenCalledWith({ data: null })
    })
  })

  // -----------------------------------------------------------------------
  // sendNotification
  // -----------------------------------------------------------------------

  describe('sendNotification', () => {
    it('sends a notification', async () => {
      mockService.sendNotification.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      })
      const ctx = buildCtx({
        request: {
          body: {
            type: 'new_item',
            data: { title: 'Test' },
            recipients: ['mod@example.com'],
          },
        },
      })

      await controller.sendNotification(ctx)

      expect(mockService.sendNotification).toHaveBeenCalledWith(
        'new_item',
        { title: 'Test' },
        ['mod@example.com'],
      )
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Notification sent successfully' }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // getNotificationSettings
  // -----------------------------------------------------------------------

  describe('getNotificationSettings', () => {
    it('returns notification settings', async () => {
      mockService.getNotificationSettings.mockResolvedValue({
        smtpHost: 'smtp.example.com',
        notifyOnSpam: true,
      })
      const ctx = buildCtx()

      await controller.getNotificationSettings(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: { smtpHost: 'smtp.example.com', notifyOnSpam: true },
      })
    })
  })

  // -----------------------------------------------------------------------
  // testWebhook
  // -----------------------------------------------------------------------

  describe('testWebhook', () => {
    it('tests a webhook endpoint', async () => {
      mockService.testWebhook.mockResolvedValue({
        success: true,
        statusCode: 200,
      })
      const ctx = buildCtx({
        request: { body: { url: 'https://hook.example.com', headers: {} } },
      })

      await controller.testWebhook(ctx)

      expect(mockService.testWebhook).toHaveBeenCalledWith(
        'https://hook.example.com',
        {},
      )
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Webhook test completed' }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // getHooks / toggleHook
  // -----------------------------------------------------------------------

  describe('getHooks', () => {
    it('returns registered hooks', async () => {
      mockService.getHooks.mockReturnValue([
        { name: 'Comment Hook', contentType: 'comment', enabled: true },
      ])
      const ctx = buildCtx()

      await controller.getHooks(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: [{ name: 'Comment Hook', contentType: 'comment', enabled: true }],
      })
    })
  })

  describe('toggleHook', () => {
    it('toggles a hook', async () => {
      const ctx = buildCtx({
        params: { name: 'Comment Hook' },
        request: { body: { enabled: false } },
      })

      await controller.toggleHook(ctx)

      expect(mockService.toggleHook).toHaveBeenCalledWith('Comment Hook', false)
      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Hook updated successfully' }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // purgeRetention
  // -----------------------------------------------------------------------

  describe('purgeRetention', () => {
    it('triggers manual purge', async () => {
      mockService.purgeRetention.mockResolvedValue({
        activityLogPurged: { success: true, deletedCount: 10 },
        archivePurged: { success: true, deletedCount: 5 },
      })
      const ctx = buildCtx()

      await controller.purgeRetention(ctx)

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Retention purge completed' }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // receivePlatformSync
  // -----------------------------------------------------------------------

  describe('receivePlatformSync', () => {
    it('processes sync payload and returns result', async () => {
      mockService.receivePlatformSync = jest.fn().mockResolvedValue({
        success: true,
        platform: 'Strapi',
        timestamp: new Date().toISOString(),
      })
      mockService.receivePlatformSync = jest.fn().mockResolvedValue({
        success: true,
        platform: 'Strapi',
        timestamp: new Date().toISOString(),
      })

      // Test using the controller directly with a mock that has receivePlatformSync
      const strapi = {
        plugin: jest.fn(() => ({
          service: jest.fn(() => ({
            receivePlatformSync: jest.fn().mockResolvedValue({
              success: true,
              platform: 'Strapi',
            }),
          })),
          config: jest.fn(() => ({})),
        })),
        log: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
      }
      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      const ctx = buildCtx({
        request: {
          body: {
            firewall_rules: {},
            auto_moderation: {},
            timestamp: new Date().toISOString(),
            source: 'wordpress',
          },
        },
      })

      await ctrl.receivePlatformSync(ctx)

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: true }),
        }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // getActivityFeedEvents (REST fallback)
  // -----------------------------------------------------------------------

  describe('getActivityFeedEvents', () => {
    it('returns recent feed events', async () => {
      mockService.getActivityFeed = jest
        .fn()
        .mockResolvedValue([
          { id: 'evt-1', type: 'action', description: 'Approved item' },
        ])
      const ctx = buildCtx({ query: { limit: '50' } })

      // Use fresh controller
      const strapi = {
        plugin: jest.fn(() => ({
          service: jest.fn(() => mockService),
          config: jest.fn(() => ({})),
        })),
        log: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
      }
      const ctrl = require('../controllers/cmcc-controller')({ strapi })
      await ctrl.getActivityFeedEvents(ctx)

      // The method should return events
      expect(ctx.send).toHaveBeenCalled()
    })
  })
})
