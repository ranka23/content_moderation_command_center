/**
 * CMCC Platform Registry
 *
 * Central registry for all supported CMS platform metadata.
 * Previously duplicated across every platform's app code,
 * server code, and settings forms. Single source of truth.
 *
 * When a new platform is added, only this file needs to change —
 * every consumer gets the update automatically.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/**
 * Unique platform identifier.
 */
export type PlatformId = 'shopify' | 'storyblok' | 'strapi' | 'wix' | 'wordpress'

/**
 * Connection status for a platform integration.
 */
export type PlatformConnectionStatus =
  | 'connected'
  | 'available'
  | 'unavailable'
  | 'error'

/**
 * Metadata describing a single CMS platform.
 */
export interface PlatformDefinition {
  /** Unique machine-readable ID */
  id: PlatformId
  /** Human-readable display name */
  name: string
  /** Emoji icon for UI display */
  icon: string
  /** Whether this platform ships as a first-party package */
  isFirstParty: boolean
  /** Default connection status */
  defaultStatus: PlatformConnectionStatus
  /** Supported content types this platform can moderate */
  contentTypes: string[]
}

// --------------------------------------------------------------------------
// Registry
// --------------------------------------------------------------------------

const PLATFORMS: PlatformDefinition[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    isFirstParty: true,
    defaultStatus: 'available',
    contentTypes: ['product_review', 'blog_comment', 'forum_post'],
  },
  {
    id: 'storyblok',
    name: 'Storyblok',
    icon: '🖼️',
    isFirstParty: true,
    defaultStatus: 'available',
    contentTypes: ['story', 'comment'],
  },
  {
    id: 'strapi',
    name: 'Strapi',
    icon: '🟣',
    isFirstParty: true,
    defaultStatus: 'connected',
    contentTypes: ['comment', 'post', 'review'],
  },
  {
    id: 'wix',
    name: 'Wix',
    icon: '🎪',
    isFirstParty: true,
    defaultStatus: 'available',
    contentTypes: ['blog_comment', 'forum_post', 'site_comment'],
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: '🌐',
    isFirstParty: true,
    defaultStatus: 'available',
    contentTypes: ['comment', 'post'],
  },
]

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Get the full list of known platforms.
 */
export function getPlatforms(): PlatformDefinition[] {
  return PLATFORMS
}

/**
 * Get metadata for a single platform by ID.
 */
export function getPlatform(id: PlatformId): PlatformDefinition | undefined {
  return PLATFORMS.find((p) => p.id === id)
}

/**
 * Get only the first-party platforms (those shipped as packages).
 */
export function getFirstPartyPlatforms(): PlatformDefinition[] {
  return PLATFORMS.filter((p) => p.isFirstParty)
}

/**
 * Get all platform IDs.
 */
export function getPlatformIds(): PlatformId[] {
  return PLATFORMS.map((p) => p.id)
}
