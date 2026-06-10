'use strict'

const { describe, it, expect } = require('@jest/globals')

// Mock @cmcc/server-core
const mockFirewallServiceInstance = {
  evaluateContent: jest.fn(),
  getStats: jest.fn(),
  resetStats: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  FirewallService: jest.fn(() => mockFirewallServiceInstance),
  getDefaultFirewallConfig: jest.fn(() => ({
    maxLinks: 5,
    blacklistedKeywords: [],
    blacklistedIPs: [],
    blacklistedEmailDomains: [],
    blockedCountries: [],
    minSubmitTime: 3,
    enableDuplicateDetection: true,
    duplicateLookbackDays: 7,
    duplicateThreshold: 3,
    globalAction: 'flag',
    ruleActions: {},
  })),
}))

const mockEntityService = {
  findOne: jest.fn(),
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
      logActivity: jest.fn(),
    })),
  })),
}

describe('CMCC Firewall Service', () => {
  let firewallService

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear module cache so each test gets fresh instance
    jest.isolateModules(() => {
      firewallService = require('../services/firewall-service')({
        strapi: mockStrapi,
      })
    })
  })

  describe('evaluate', () => {
    it('evaluates a queue item against firewall rules', async () => {
      const mockItem = {
        id: 1,
        itemId: 'ext-1',
        contentType: 'comment',
        title: 'Test content',
        excerpt: 'Some text here with a link https://example.com',
        status: 'pending',
        authorId: 'user-1',
      }

      mockEntityService.findOne.mockResolvedValue(mockItem)
      mockFirewallServiceInstance.evaluateContent.mockResolvedValue({
        triggered: false,
        action: 'approve',
        reason: 'Content passed all checks',
        evaluatedAt: new Date().toISOString(),
        isSpam: false,
        spamScore: 0.1,
        triggeredRules: [],
      })
      mockEntityService.update.mockResolvedValue({
        ...mockItem,
        status: 'approved',
      })

      const result = await firewallService.evaluate(1)

      expect(mockEntityService.findOne).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        1,
      )
      expect(mockFirewallServiceInstance.evaluateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String),
          contentId: 'ext-1',
        }),
      )
      expect(result.triggered).toBe(false)
    })

    it('triggers firewall and updates item status when content is spam', async () => {
      const mockItem = {
        id: 2,
        itemId: 'ext-2',
        contentType: 'comment',
        title: 'Buy now!',
        excerpt: 'Check out this amazing deal at https://spam.example.com',
        status: 'pending',
        authorId: 'spammer-1',
      }

      mockEntityService.findOne.mockResolvedValue(mockItem)
      mockFirewallServiceInstance.evaluateContent.mockResolvedValue({
        triggered: true,
        action: 'spam',
        reason: 'Blacklisted keyword matched',
        evaluatedAt: new Date().toISOString(),
        isSpam: true,
        spamScore: 0.95,
        triggeredRules: ['blacklisted_keywords'],
      })
      mockEntityService.update.mockResolvedValue({
        ...mockItem,
        status: 'spam',
      })

      const result = await firewallService.evaluate(2)

      expect(mockEntityService.update).toHaveBeenCalledWith(
        'plugin::cmcc.queue-item',
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            spamScore: 0.95,
          }),
        }),
      )
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('spam')
    })

    it('throws error when queue item is not found', async () => {
      mockEntityService.findOne.mockResolvedValue(null)

      await expect(firewallService.evaluate(999)).rejects.toThrow(
        'Queue item not found',
      )
    })

    it('handles firewall evaluation errors gracefully', async () => {
      mockEntityService.findOne.mockResolvedValue({
        id: 1,
        itemId: 'ext-1',
        contentType: 'comment',
        title: 'Test',
        excerpt: 'Content',
        status: 'pending',
        authorId: 'user-1',
      })
      mockFirewallServiceInstance.evaluateContent.mockRejectedValue(
        new Error('Firewall error'),
      )

      await expect(firewallService.evaluate(1)).rejects.toThrow(
        'Firewall error',
      )
    })
  })

  describe('getConfig / updateConfig', () => {
    it('returns the current firewall config', () => {
      mockFirewallServiceInstance.getConfig.mockReturnValue({
        maxLinks: 5,
        globalAction: 'flag',
      })
      const config = firewallService.getConfig()
      expect(config).toBeDefined()
      expect(config.maxLinks).toBe(5)
    })

    it('updates firewall config', () => {
      firewallService.updateConfig({ maxLinks: 3 })
      expect(mockFirewallServiceInstance.updateConfig).toHaveBeenCalledWith({
        maxLinks: 3,
      })
    })
  })

  describe('getStats / resetStats', () => {
    it('returns stats from the underlying service', () => {
      mockFirewallServiceInstance.getStats.mockReturnValue({
        blacklisted_keywords: 5,
        max_links: 2,
      })
      const stats = firewallService.getStats()
      expect(stats.blacklisted_keywords).toBe(5)
    })

    it('resets stats', () => {
      firewallService.resetStats()
      expect(mockFirewallServiceInstance.resetStats).toHaveBeenCalled()
    })
  })
})
