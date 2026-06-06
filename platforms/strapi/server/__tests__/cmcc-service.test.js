'use strict'

const { describe, it, expect, beforeEach } = require('@jest/globals')

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
        moderationBehavior: 'strict',
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
        moderationBehavior: 'moderate',
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
})
