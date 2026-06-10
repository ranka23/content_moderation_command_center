'use strict'

const { describe, it, expect } = require('@jest/globals')

const mockEmailServiceInstance = {
  sendNotification: jest.fn(),
  sendDigest: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  EmailService: jest.fn(() => mockEmailServiceInstance),
}))

const mockEntityService = {
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
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
      getSettings: jest.fn(),
    })),
  })),
}

describe('CMCC Notification Service', () => {
  let notificationService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.isolateModules(() => {
      notificationService = require('../services/notification-service')({
        strapi: mockStrapi,
      })
    })
  })

  describe('sendNotification', () => {
    it('sends a notification and logs it', async () => {
      mockEmailServiceInstance.sendNotification.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      })
      mockEntityService.create.mockResolvedValue({ id: 1 })

      const result = await notificationService.sendNotification(
        'new_item',
        { title: 'Test', content_type: 'comment' },
        ['mod@example.com'],
      )

      expect(mockEmailServiceInstance.sendNotification).toHaveBeenCalledWith(
        'new_item',
        { title: 'Test', content_type: 'comment' },
        ['mod@example.com'],
      )
      expect(mockEntityService.create).toHaveBeenCalledWith(
        'plugin::cmcc.notification-log',
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'new_item',
            status: 'sent',
          }),
        }),
      )
      expect(result.success).toBe(true)
    })

    it('returns success false when no recipients', async () => {
      mockEmailServiceInstance.sendNotification.mockResolvedValue({
        success: false,
        error: 'No recipients specified',
      })

      const result = await notificationService.sendNotification(
        'new_item',
        {},
        [],
      )

      expect(result.success).toBe(false)
    })

    it('handles send failure gracefully', async () => {
      mockEmailServiceInstance.sendNotification.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      })
      mockEntityService.create.mockResolvedValue({ id: 1 })

      const result = await notificationService.sendNotification(
        'new_item',
        {},
        ['mod@example.com'],
      )

      expect(result.success).toBe(false)
      expect(mockEntityService.create).toHaveBeenCalledWith(
        'plugin::cmcc.notification-log',
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      )
    })
  })

  describe('sendDigest', () => {
    it('sends a digest notification', async () => {
      mockEmailServiceInstance.sendDigest.mockResolvedValue({
        success: true,
        messageId: 'digest-1',
      })
      mockEntityService.create.mockResolvedValue({ id: 1 })

      const result = await notificationService.sendDigest(['mod@example.com'], {
        pending_count: 10,
        spam_count: 5,
      })

      expect(mockEmailServiceInstance.sendDigest).toHaveBeenCalledWith(
        ['mod@example.com'],
        { pending_count: 10, spam_count: 5 },
      )
      expect(result.success).toBe(true)
    })
  })

  describe('getSettings', () => {
    it('returns notification settings', async () => {
      mockEntityService.findMany.mockResolvedValue([
        {
          id: 1,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          notifyOnApprove: true,
          notifyOnReject: true,
          notifyOnSpam: false,
          recipients: ['admin@example.com'],
        },
      ])

      const settings = await notificationService.getSettings()

      expect(settings).toBeDefined()
      expect(settings.smtpHost).toBe('smtp.example.com')
    })

    it('returns default settings when none exist', async () => {
      mockEntityService.findMany.mockResolvedValue([])

      const settings = await notificationService.getSettings()

      expect(settings).toBeDefined()
      expect(settings.notifyOnSpam).toBe(true)
    })
  })

  describe('updateSettings', () => {
    it('updates notification settings', async () => {
      mockEntityService.findMany.mockResolvedValue([{ id: 1 }])
      mockEntityService.update.mockResolvedValue({ id: 1 })

      const result = await notificationService.updateSettings({
        smtpHost: 'new.smtp.com',
      })

      expect(result.success).toBe(true)
      expect(mockEntityService.update).toHaveBeenCalledWith(
        'plugin::cmcc.notification-log',
        1,
        expect.any(Object),
      )
    })
  })
})
