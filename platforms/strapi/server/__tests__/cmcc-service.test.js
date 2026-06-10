'use strict'

const { describe, it, expect } = require('@jest/globals')

// Mock strapi
const mockEntityService = {
  findPage: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockStrapi = {
  entityService: mockEntityService,
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}

const service = require('../services/cmcc-service')

// Create the service with the mock strapi
const cmccService = service({ strapi: mockStrapi })

describe('CMCC Strapi Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getQueue', () => {
    it('returns paginated queue items with default params', async () => {
      const mockResults = {
        results: [{ id: 1, title: 'Test' }],
        pagination: { page: 1, pageSize: 20, total: 1 },
      }
      mockEntityService.findPage.mockResolvedValue(mockResults)

      const result = await cmccService.getQueue()

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          sort: { createdAt: 'desc' },
          populate: '*',
        }),
      )
      expect(result).toEqual(mockResults)
    })

    it('applies status filter when provided', async () => {
      mockEntityService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 20, total: 0 },
      })

      await cmccService.getQueue({ status: 'pending' })

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        expect.objectContaining({
          filters: { status: { $eq: 'pending' } },
        }),
      )
    })

    it('applies contentType filter when provided', async () => {
      mockEntityService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 20, total: 0 },
      })

      await cmccService.getQueue({ contentType: 'comment' })

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        expect.objectContaining({
          filters: { contentType: { $eq: 'comment' } },
        }),
      )
    })

    it('applies search filter correctly', async () => {
      mockEntityService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 20, total: 0 },
      })

      await cmccService.getQueue({ search: 'test' })

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        expect.objectContaining({
          filters: {
            $or: [
              { title: { $containsi: 'test' } },
              { excerpt: { $containsi: 'test' } },
            ],
          },
        }),
      )
    })
  })

  describe('moderateItem', () => {
    it('throws error when item is not found', async () => {
      mockEntityService.findOne.mockResolvedValue(null)

      await expect(
        cmccService.moderateItem(999, 'approve', 'mod-1'),
      ).rejects.toThrow('Queue item not found')
    })

    it('updates item status and logs activity on approve', async () => {
      const mockItem = {
        id: 1,
        contentType: 'comment',
        itemId: 'ext-1',
        status: 'pending',
      }
      const updatedItem = { ...mockItem, status: 'approved' }

      mockEntityService.findOne.mockResolvedValue(mockItem)
      mockEntityService.update.mockResolvedValue(updatedItem)
      mockEntityService.create.mockResolvedValue({ id: 1 })
      mockEntityService.count.mockResolvedValue(0)

      const result = await cmccService.moderateItem(1, 'approve', 'mod-1')

      expect(mockEntityService.update).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        1,
        { data: { status: 'approved' } },
      )
      expect(mockEntityService.create).toHaveBeenCalledWith(
        'plugin::cmcc.activity-log',
        expect.objectContaining({
          data: expect.objectContaining({
            moderatorId: 'mod-1',
            action: 'approved',
          }),
        }),
      )
      expect(result).toEqual(updatedItem)
    })

    it('throws error for invalid action', async () => {
      mockEntityService.findOne.mockResolvedValue({
        id: 1,
        contentType: 'comment',
        itemId: 'ext-1',
        status: 'pending',
      })

      await expect(
        cmccService.moderateItem(1, 'invalid-action', 'mod-1'),
      ).rejects.toThrow('Invalid action')
    })
  })

  describe('bulkAction', () => {
    it('processes all items and returns success/failure counts', async () => {
      mockEntityService.findOne
        .mockResolvedValueOnce({
          id: 1,
          contentType: 'comment',
          itemId: 'ext-1',
          status: 'pending',
        })
        .mockResolvedValueOnce({
          id: 2,
          contentType: 'post',
          itemId: 'ext-2',
          status: 'pending',
        })
      mockEntityService.update.mockResolvedValue({})
      mockEntityService.create.mockResolvedValue({})
      mockEntityService.count.mockResolvedValue(0)

      const result = await cmccService.bulkAction([1, 2], 'approve', 'mod-1')

      expect(result.succeeded).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
    })
  })

  describe('getItemHistory', () => {
    it('returns activity log entries for an item', async () => {
      mockEntityService.findMany.mockResolvedValue([
        { id: 1, action: 'approved', itemId: 'ext-1' },
      ])

      const result = await cmccService.getItemHistory('ext-1')

      expect(mockEntityService.findMany).toHaveBeenCalledWith(
        'plugin::cmcc.activity-log',
        expect.objectContaining({
          filters: { itemId: { $eq: 'ext-1' } },
        }),
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('getNotes / addNote', () => {
    it('returns empty array when no notes exist', async () => {
      const notes = await cmccService.getNotes('unknown-item')
      expect(notes).toEqual([])
    })

    it('adds and retrieves notes', async () => {
      const note = await cmccService.addNote('item-1', {
        content: 'Test note',
        authorId: 'mod-1',
        authorName: 'Admin',
        isInternal: false,
        type: 'general',
      })

      expect(note.content).toBe('Test note')
      expect(note.id).toBeDefined()

      const notes = await cmccService.getNotes('item-1')
      expect(notes).toHaveLength(1)
      expect(notes[0].content).toBe('Test note')
    })
  })

  describe('assignItem', () => {
    it('creates an assignment', async () => {
      const result = await cmccService.assignItem('item-1', {
        assigneeId: 'mod-2',
        teamId: null,
        assignedById: 'mod-1',
        dueDate: '2024-12-31',
        priority: 'high',
      })

      expect(result.itemId).toBe('item-1')
      expect(result.assigneeId).toBe('mod-2')
      expect(result.priority).toBe('high')
      expect(result.status).toBe('pending')
    })
  })

  describe('getActivityFeed', () => {
    it('returns recent feed events', async () => {
      // Add some events first
      cmccService.addFeedEvent({
        type: 'action',
        actorId: 'mod-1',
        actorName: 'Admin',
        description: 'Approved item',
        itemId: 'ext-1',
        itemTitle: 'Test',
      })

      const events = await cmccService.getActivityFeed(10)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0].type).toBe('action')
    })
  })

  describe('getActivityLog', () => {
    it('returns paginated activity log with filters', async () => {
      const mockLog = {
        results: [{ id: 1, action: 'approved' }],
        pagination: { page: 1, pageSize: 20, total: 1 },
      }
      mockEntityService.findPage.mockResolvedValue(mockLog)

      const result = await cmccService.getActivityLog({
        action: 'approved',
      })

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.activity-log',
        expect.objectContaining({
          filters: { action: { $eq: 'approved' } },
        }),
      )
      expect(result).toEqual(mockLog)
    })

    it('applies moderatorId and contentType filters', async () => {
      mockEntityService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 20, total: 0 },
      })

      await cmccService.getActivityLog({
        moderatorId: 'mod-1',
        contentType: 'comment',
      })

      expect(mockEntityService.findPage).toHaveBeenCalledWith(
        'plugin::cmcc.activity-log',
        expect.objectContaining({
          filters: {
            moderatorId: { $eq: 'mod-1' },
            contentType: { $eq: 'comment' },
          },
        }),
      )
    })
  })

  describe('getAnalytics', () => {
    it('returns analytics with status counts and recent activity', async () => {
      mockEntityService.count.mockResolvedValue(10)
      mockEntityService.count
        .mockResolvedValueOnce(10) // totalItems
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // approved
        .mockResolvedValueOnce(1) // rejected
        .mockResolvedValueOnce(1) // spam
        .mockResolvedValueOnce(1) // deferred
      mockEntityService.findPage.mockResolvedValue({
        results: [{ id: 1 }],
      })
      mockEntityService.findMany.mockResolvedValue([
        { contentType: 'comment' },
        { contentType: 'comment' },
        { contentType: 'post' },
      ])

      const result = await cmccService.getAnalytics()

      expect(result.totalItems).toBe(10)
      expect(result.statusCounts).toHaveLength(5)
      expect(result.recentActivity).toBeDefined()
      expect(result.topContentTypes).toBeDefined()
    })
  })

  describe('getSettings', () => {
    it('returns null when no settings exist', async () => {
      mockEntityService.findMany.mockResolvedValue([])

      const result = await cmccService.getSettings()

      expect(result).toBeNull()
    })

    it('returns settings with parsed JSON fields', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          id: 1,
          autoModerate: true,
          blacklistedKeywords: '["spam","bad"]',
        },
      ])

      const result = await cmccService.getSettings()

      expect(result.autoModerate).toBe(true)
      expect(result.blacklistedKeywords).toEqual(['spam', 'bad'])
    })
  })

  describe('updateSettings', () => {
    it('creates new settings when none exist', async () => {
      mockEntityService.findMany.mockResolvedValue([])
      mockEntityService.create.mockResolvedValue({ id: 1 })

      await cmccService.updateSettings({
        autoModerate: true,
        moderationBehavior: 'flag',
        maxLinks: 3,
        blacklistedKeywords: ['spam'],
        duplicateDetection: true,
        notifyOnSpam: true,
      })

      expect(mockEntityService.create).toHaveBeenCalledWith(
        'plugin::cmcc.settings',
        expect.any(Object),
      )
    })

    it('updates existing settings', async () => {
      mockEntityService.findMany.mockResolvedValue([{ id: 1 }])
      mockEntityService.update.mockResolvedValue({ id: 1 })

      await cmccService.updateSettings({
        autoModerate: false,
        moderationBehavior: 'flag',
        maxLinks: 5,
        blacklistedKeywords: [],
        duplicateDetection: false,
        notifyOnSpam: false,
      })

      expect(mockEntityService.update).toHaveBeenCalledWith(
        'plugin::cmcc.settings',
        1,
        expect.any(Object),
      )
    })
  })

  describe('getUserReputation', () => {
    it('returns user reputation scores from logs', async () => {
      mockEntityService.findMany.mockResolvedValue([
        { itemId: 'user-1', action: 'approved', createdAt: '2024-01-01' },
        { itemId: 'user-1', action: 'approved', createdAt: '2024-01-02' },
        { itemId: 'user-1', action: 'spam', createdAt: '2024-01-03' },
        { itemId: 'user-2', action: 'rejected', createdAt: '2024-01-01' },
      ])

      const result = await cmccService.getUserReputation()

      expect(result).toHaveLength(2)
      const user1 = result.find((u) => u.userId === 'user-1')
      expect(user1).toBeDefined()
      expect(user1.totalItems).toBe(3)
      expect(user1.approvedCount).toBe(2)
      expect(user1.spamCount).toBe(1)
    })
  })

  describe('getUserReputationDetail', () => {
    it('returns detail for a user with history', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          id: 1,
          action: 'approved',
          contentType: 'comment',
          createdAt: '2024-01-01',
          moderatorId: 'mod-1',
        },
      ])

      const result = await cmccService.getUserReputationDetail('user-1')

      expect(result).not.toBeNull()
      expect(result.userId).toBe('user-1')
      expect(result.totalActions).toBe(1)
      expect(result.history).toHaveLength(1)
    })

    it('returns null for unknown user', async () => {
      mockEntityService.findMany.mockResolvedValue([])
      const result = await cmccService.getUserReputationDetail('unknown')
      expect(result).toBeNull()
    })
  })

  describe('getModerationReport', () => {
    it('generates a CSV report', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          createdAt: '2024-01-01',
          moderatorId: 'mod-1',
          action: 'approved',
          contentType: 'comment',
          itemId: 'ext-1',
          previousStatus: 'pending',
          newStatus: 'approved',
        },
      ])

      const result = await cmccService.getModerationReport({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        format: 'csv',
      })

      expect(result.success).toBe(true)
      expect(result.filename).toContain('cmcc-moderation')
      expect(result.data.length).toBeGreaterThan(0)
    })
  })

  describe('getComplianceAudit', () => {
    it('generates a compliance audit', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          createdAt: '2024-01-01',
          moderatorId: 'mod-1',
          action: 'approved',
          contentType: 'comment',
          itemId: 'ext-1',
          previousStatus: 'pending',
          newStatus: 'approved',
        },
      ])

      const result = await cmccService.getComplianceAudit({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      expect(result.success).toBe(true)
      expect(result.filename).toContain('cmcc-compliance')
      expect(result.data).toHaveLength(1)
    })
  })

  describe('scheduleReport', () => {
    it('creates a scheduled report', async () => {
      const result = await cmccService.scheduleReport({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@test.com'],
        createdBy: 'admin',
      })

      expect(result.success).toBe(true)
      expect(result.schedule.type).toBe('moderation_activity')
      expect(result.schedule.frequency).toBe('daily')
    })
  })

  describe('getPlatformStatus', () => {
    it('returns platform statuses with counts', async () => {
      mockEntityService.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // total (moderatedCount)
        .mockResolvedValueOnce(2) // spam

      const result = await cmccService.getPlatformStatus()

      expect(result.platforms).toHaveLength(5)
      const strapi = result.platforms.find((p) => p.id === 'strapi')
      expect(strapi).toBeDefined()
      expect(strapi.connected).toBe(true)
    })
  })

  describe('syncSettings', () => {
    it('returns success with synced platforms', async () => {
      const result = await cmccService.syncSettings({
        targetPlatforms: ['wordpress', 'shopify'],
        settings: { autoModerate: true },
      })

      expect(result.success).toBe(true)
      expect(result.syncedPlatforms).toEqual(['wordpress', 'shopify'])
    })
  })

  describe('getUnifiedQueue', () => {
    it('delegates to getQueue', async () => {
      mockEntityService.findPage.mockResolvedValue({
        results: [{ id: 1 }],
        pagination: { page: 1, pageSize: 20, total: 1 },
      })

      const result = await cmccService.getUnifiedQueue({ status: 'pending' })

      expect(result.results).toHaveLength(1)
    })
  })

  describe('exportSettings / importSettings', () => {
    it('exports settings with timestamp', async () => {
      mockEntityService.findMany.mockResolvedValue([{ autoModerate: true }])

      const result = await cmccService.exportSettings()

      expect(result.data).toBeDefined()
      expect(result.exportedAt).toBeDefined()
    })

    it('imports settings', async () => {
      // importSettings calls update for each key
      mockEntityService.update.mockResolvedValue({})

      const result = await cmccService.importSettings({
        autoModerate: true,
        maxLinks: 3,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('cleans up in-memory stores', async () => {
      // Add some data first
      await cmccService.addNote('item-1', {
        content: 'test',
        authorId: 'mod-1',
        authorName: 'Admin',
        isInternal: false,
        type: 'general',
      })
      await cmccService.assignItem('item-1', {
        assigneeId: 'mod-2',
        assignedById: 'mod-1',
        priority: 'normal',
      })

      await cmccService.cleanup()

      const notes = await cmccService.getNotes('item-1')
      expect(notes).toEqual([])
    })
  })
})
