/**
 * Keyboard shortcut reference for power moderators.
 * @type {Array<{key: string, description: string}>}
 */
export const KEYBOARD_SHORTCUTS = [
  { key: 'a', description: 'Approve selected item' },
  { key: 'r', description: 'Reject selected item' },
  { key: 's', description: 'Mark as Spam' },
  { key: 'd', description: 'Defer selected item' },
  { key: 'v', description: 'View item details' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

/**
 * Application tab definitions.
 * @type {Array<{id: string, label: string}>}
 */
export const TABS = [
  { id: 'queue', label: 'Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'activity-log', label: 'Activity Log' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

/**
 * Map a WordPress admin page slug to its corresponding tab ID.
 * @param {string} page - The WP admin page slug.
 * @returns {string} The corresponding tab ID, defaulting to 'queue'.
 */
export function mapInitialTab(page) {
  switch (page) {
    case 'cmcc':
      return 'queue'
    case 'cmcc-analytics':
      return 'analytics'
    case 'cmcc-activity':
      return 'activity-log'
    case 'cmcc-reports':
      return 'reports'
    case 'cmcc-settings':
      return 'settings'
    default:
      return 'queue'
  }
}
