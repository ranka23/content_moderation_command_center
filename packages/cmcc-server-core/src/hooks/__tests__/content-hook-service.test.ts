/**
 * Content Hook Service — Unit Tests
 */
import { ContentHookService } from '../content-hook-service'

describe('ContentHookService', () => {
  let service: ContentHookService
  const mockAddToQueue = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ContentHookService(mockAddToQueue)
  })

  describe('registerHook / getHooks', () => {
    it('registers a new content hook', () => {
      service.registerHook({
        name: 'Strapi Comment Hook',
        contentType: 'comment',
        description: 'Auto-import Strapi comments',
        enabled: true,
      })

      const hooks = service.getHooks()
      expect(hooks).toHaveLength(1)
      expect(hooks[0].name).toBe('Strapi Comment Hook')
      expect(hooks[0].contentType).toBe('comment')
    })

    it('registers multiple hooks for different content types', () => {
      service.registerHook({ name: 'Comment Hook', contentType: 'comment', description: '', enabled: true })
      service.registerHook({ name: 'Post Hook', contentType: 'post', description: '', enabled: true })
      service.registerHook({ name: 'Review Hook', contentType: 'review', description: '', enabled: true })

      expect(service.getHooks()).toHaveLength(3)
    })
  })

  describe('processContent', () => {
    it('adds content to queue through the adapter function', async () => {
      service.registerHook({
        name: 'Comment Hook',
        contentType: 'comment',
        description: 'Auto-import comments',
        enabled: true,
      })

      await service.processContent('comment', {
        itemId: 'ext-123',
        authorName: 'John Doe',
        authorEmail: 'john@example.com',
        authorIP: '192.168.1.1',
        content: 'Great article!',
        title: 'Comment on Post 1',
      })

      expect(mockAddToQueue).toHaveBeenCalledWith(
        'comment',
        'ext-123',
        'John Doe',
        'john@example.com',
        '192.168.1.1',
        'Great article!',
        'Comment on Post 1',
      )
    })

    it('does not process content when no hook matches the content type', async () => {
      await service.processContent('unknown_type', {
        itemId: 'ext-123',
        authorName: 'John',
        content: 'Test',
      })

      expect(mockAddToQueue).not.toHaveBeenCalled()
    })

    it('does not process content when the matching hook is disabled', async () => {
      service.registerHook({
        name: 'Disabled Hook',
        contentType: 'comment',
        description: '',
        enabled: false,
      })

      await service.processContent('comment', {
        itemId: 'ext-123',
        authorName: 'John',
        content: 'Test',
      })

      expect(mockAddToQueue).not.toHaveBeenCalled()
    })

    it('handles errors from the addToQueue function gracefully', async () => {
      mockAddToQueue.mockRejectedValue(new Error('Queue insert failed'))

      service.registerHook({
        name: 'Comment Hook',
        contentType: 'comment',
        description: '',
        enabled: true,
      })

      await expect(
        service.processContent('comment', {
          itemId: 'ext-123',
          authorName: 'John',
          content: 'Test',
        }),
      ).rejects.toThrow('Queue insert failed')
    })

    it('normalizes the content type to lowercase', async () => {
      service.registerHook({
        name: 'Post Hook',
        contentType: 'post',
        description: '',
        enabled: true,
      })

      await service.processContent('POST', {
        itemId: 'ext-456',
        authorName: 'Jane',
        content: 'A post',
      })

      expect(mockAddToQueue).toHaveBeenCalled()
    })
  })

  describe('enableHook / disableHook', () => {
    it('enables and disables hooks by name', () => {
      service.registerHook({ name: 'Test Hook', contentType: 'comment', description: '', enabled: false })

      service.enableHook('Test Hook')
      expect(service.getHooks()[0].enabled).toBe(true)

      service.disableHook('Test Hook')
      expect(service.getHooks()[0].enabled).toBe(false)
    })
  })
})
