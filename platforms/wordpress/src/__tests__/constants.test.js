/**
 * Tests for CMCC WordPress constants and utilities (lib/constants.js)
 */

import { TABS, KEYBOARD_SHORTCUTS, mapInitialTab } from '../lib/constants'

describe('TABS', () => {
  it('defines all 5 tabs', () => {
    expect(TABS).toHaveLength(5)
    const ids = TABS.map((t) => t.id)
    expect(ids).toEqual(['queue', 'analytics', 'activity-log', 'reports', 'settings'])
  })

  it('each tab has an id and label', () => {
    TABS.forEach((tab) => {
      expect(tab.id).toBeDefined()
      expect(tab.label).toBeDefined()
      expect(typeof tab.id).toBe('string')
      expect(typeof tab.label).toBe('string')
    })
  })
})

describe('KEYBOARD_SHORTCUTS', () => {
  it('defines 8 shortcuts', () => {
    expect(KEYBOARD_SHORTCUTS).toHaveLength(8)
  })

  it('each shortcut has a key and description', () => {
    KEYBOARD_SHORTCUTS.forEach((sc) => {
      expect(sc.key).toBeDefined()
      expect(sc.description).toBeDefined()
    })
  })

  it('includes common moderation actions', () => {
    const descriptions = KEYBOARD_SHORTCUTS.map((s) => s.description)
    expect(descriptions).toContain('Approve selected item')
    expect(descriptions).toContain('Reject selected item')
    expect(descriptions).toContain('Mark as Spam')
  })
})

describe('mapInitialTab()', () => {
  it('returns "queue" for cmcc page', () => {
    expect(mapInitialTab('cmcc')).toBe('queue')
  })

  it('returns "analytics" for cmcc-analytics page', () => {
    expect(mapInitialTab('cmcc-analytics')).toBe('analytics')
  })

  it('returns "settings" for cmcc-settings page', () => {
    expect(mapInitialTab('cmcc-settings')).toBe('settings')
  })

  it('returns "reports" for cmcc-reports page', () => {
    expect(mapInitialTab('cmcc-reports')).toBe('reports')
  })

  it('defaults to "queue" for unknown page', () => {
    expect(mapInitialTab('unknown-page')).toBe('queue')
  })

  it('defaults to "queue" for empty string', () => {
    expect(mapInitialTab('')).toBe('queue')
  })
})
