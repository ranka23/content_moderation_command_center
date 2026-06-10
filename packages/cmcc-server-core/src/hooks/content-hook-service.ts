/**
 * ContentHookService
 *
 * Manages platform-specific content hooks that automatically import
 * content into the moderation queue when new content is created.
 *
 * Each platform registers hooks for its native content types
 * (e.g., Strapi Collection Types, Shopify Products/Reviews).
 *
 * Usage:
 *   const service = new ContentHookService(addToQueueFn)
 *   service.registerHook({ name: 'Comment Hook', contentType: 'comment', ... })
 *   await service.processContent('comment', { itemId, authorName, content, ... })
 */

/**
 * Defines a content hook that listens for new content of a specific type.
 */
export interface ContentHook {
  /** Unique hook name */
  name: string
  /** Content type this hook handles (e.g., 'comment', 'post', 'review') */
  contentType: string
  /** Human-readable description */
  description: string
  /** Whether this hook is currently active */
  enabled: boolean
}

/**
 * Data for a content item to be processed by a hook.
 */
export interface ContentData {
  /** Original content ID */
  itemId: string
  /** Author display name */
  authorName: string
  /** Author email */
  authorEmail?: string
  /** Author IP address */
  authorIP?: string
  /** The content text/body */
  content: string
  /** Content title */
  title?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Function signature for adding an item to the moderation queue.
 */
export type AddToQueueFn = (
  contentType: string,
  itemId: string,
  authorName: string,
  authorEmail: string,
  authorIP: string,
  content: string,
  title: string,
) => Promise<unknown>

/**
 * Service for managing content hooks that auto-import content
 * into the moderation queue.
 */
export class ContentHookService {
  private hooks: ContentHook[] = []
  private addToQueue: AddToQueueFn

  /**
   * @param addToQueueFn - Platform function to add an item to the queue
   */
  constructor(addToQueueFn: AddToQueueFn) {
    this.addToQueue = addToQueueFn
  }

  /**
   * Register a new content hook.
   *
   * @param hook - The hook definition
   */
  registerHook(hook: ContentHook): void {
    this.hooks.push(hook)
  }

  /**
   * Get all registered hooks.
   */
  getHooks(): ContentHook[] {
    return [...this.hooks]
  }

  /**
   * Enable a hook by name.
   */
  enableHook(name: string): void {
    const hook = this.hooks.find((h) => h.name === name)
    if (hook) hook.enabled = true
  }

  /**
   * Disable a hook by name.
   */
  disableHook(name: string): void {
    const hook = this.hooks.find((h) => h.name === name)
    if (hook) hook.enabled = false
  }

  /**
   * Process incoming content through registered hooks.
   * If a matching enabled hook is found, the content is
   * added to the moderation queue.
   *
   * @param contentType - The type of content being processed
   * @param data        - The content data
   */
  async processContent(
    contentType: string,
    data: ContentData,
  ): Promise<void> {
    const normalizedType = contentType.toLowerCase()

    const matchingHook = this.hooks.find(
      (h) => h.contentType.toLowerCase() === normalizedType && h.enabled,
    )

    if (!matchingHook) {
      return // No active hook for this content type
    }

    await this.addToQueue(
      contentType,
      data.itemId,
      data.authorName,
      data.authorEmail || '',
      data.authorIP || '',
      data.content,
      data.title || '',
    )
  }

  /**
   * Remove all registered hooks.
   */
  clearHooks(): void {
    this.hooks = []
  }
}
