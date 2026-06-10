'use strict'

const { describe, it, expect } = require('@jest/globals')

const mockContentHookServiceInstance = {
  registerHook: jest.fn(),
  getHooks: jest.fn(),
  enableHook: jest.fn(),
  disableHook: jest.fn(),
  processContent: jest.fn(),
  clearHooks: jest.fn(),
}

jest.mock('@cmcc/server-core', () => ({
  ContentHookService: jest.fn(() => mockContentHookServiceInstance),
}))

const mockEntityService = {
  create: jest.fn(),
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

describe('CMCC Content Hook Service', () => {
  let hookService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.isolateModules(() => {
      hookService = require('../services/content-hook-service')({
        strapi: mockStrapi,
      })
    })
  })

  describe('getHooks', () => {
    it('returns all registered hooks', () => {
      mockContentHookServiceInstance.getHooks.mockReturnValue([
        { name: 'Comment Hook', contentType: 'comment', enabled: true },
        { name: 'Post Hook', contentType: 'post', enabled: true },
      ])

      const hooks = hookService.getHooks()
      expect(hooks).toHaveLength(2)
      expect(hooks[0].name).toBe('Comment Hook')
    })

    it('returns empty array when no hooks registered', () => {
      mockContentHookServiceInstance.getHooks.mockReturnValue([])
      const hooks = hookService.getHooks()
      expect(hooks).toEqual([])
    })
  })

  describe('registerHook', () => {
    it('registers a new content hook', () => {
      hookService.registerHook({
        name: 'Review Hook',
        contentType: 'review',
        description: 'Auto-import reviews',
        enabled: true,
      })

      expect(mockContentHookServiceInstance.registerHook).toHaveBeenCalledWith({
        name: 'Review Hook',
        contentType: 'review',
        description: 'Auto-import reviews',
        enabled: true,
      })
    })
  })

  describe('toggleHook', () => {
    it('enables a hook by name', () => {
      hookService.toggleHook('Comment Hook', true)
      expect(mockContentHookServiceInstance.enableHook).toHaveBeenCalledWith(
        'Comment Hook',
      )
    })

    it('disables a hook by name', () => {
      hookService.toggleHook('Post Hook', false)
      expect(mockContentHookServiceInstance.disableHook).toHaveBeenCalledWith(
        'Post Hook',
      )
    })
  })

  describe('processContent', () => {
    it('processes content through matching hooks', async () => {
      mockContentHookServiceInstance.processContent.mockResolvedValueOnce()

      await hookService.processContent('comment', {
        itemId: 'ext-1',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        content: 'Great post!',
        title: 'My Comment',
      })

      expect(
        mockContentHookServiceInstance.processContent,
      ).toHaveBeenCalledWith(
        'comment',
        expect.objectContaining({
          itemId: 'ext-1',
          authorName: 'Alice',
        }),
      )
    })
  })

  describe('initializeDefaultHooks', () => {
    it('registers default hooks for comments, posts, and reviews', () => {
      hookService.initializeDefaultHooks()

      expect(mockContentHookServiceInstance.registerHook).toHaveBeenCalledTimes(
        3,
      )
      expect(mockContentHookServiceInstance.registerHook).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'comment' }),
      )
      expect(mockContentHookServiceInstance.registerHook).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'post' }),
      )
      expect(mockContentHookServiceInstance.registerHook).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'review' }),
      )
    })
  })
})
