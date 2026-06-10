/**
 * Tests for useAnalytics, useActivityLog, useSettings, useCollaboration, useReports hooks
 */

import { renderHook, act } from '@testing-library/react'
import { useAnalytics } from '../hooks/useAnalytics'
import { useActivityLog } from '../hooks/useActivityLog'
import { useSettings } from '../hooks/useSettings'
import { useCollaboration } from '../hooks/useCollaboration'
import { useReports } from '../hooks/useReports'

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}))
const { apiFetch } = require('../lib/api')

// ── useAnalytics ─────────────────────────────────────────────────────

describe('useAnalytics', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, { cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' } })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAnalytics({ addToast }))
    expect(result.current.analyticsData.heatmap).toBeDefined()
    expect(result.current.analyticsData.spamRatio).toBeDefined()
    expect(result.current.isAnalyticsLoading).toBe(false)
  })

  it('fetchAnalytics fetches and processes data', async () => {
    apiFetch.mockResolvedValue({
      heatmap: { data: [[1, 2], [3, 4]], maxCount: 4 },
      spam_ratio: { spam_count: 5, total_count: 100, ratio: 0.05 },
      content_type_breakdown: [{ type: 'comment', count: 50 }],
      queue_stats: { pending: 10, spam: 5, flagged: 3, total: 18 },
    })

    const { result } = renderHook(() => useAnalytics({ addToast }))

    await act(async () => {
      await result.current.fetchAnalytics()
    })

    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('analytics'))
  })
})

// ── useActivityLog ───────────────────────────────────────────────────

describe('useActivityLog', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, {
      cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test', userDisplay: 'Admin', userId: '1' },
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useActivityLog({ addToast }))
    expect(result.current.activityLog).toEqual([])
    expect(result.current.logPage).toBe(1)
    expect(result.current.isLogLoading).toBe(false)
  })

  it('fetchActivityLog fetches from API', async () => {
    apiFetch.mockResolvedValue({
      items: [{ id: '1', action: 'approve', moderator_id: '1' }],
      total: 1,
    })

    const { result } = renderHook(() => useActivityLog({ addToast }))

    await act(async () => {
      await result.current.fetchActivityLog(1)
    })

    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('activity-log'))
    expect(result.current.activityLog).toHaveLength(1)
  })

  it('handles API errors gracefully', async () => {
    apiFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useActivityLog({ addToast }))

    await act(async () => {
      await result.current.fetchActivityLog(1)
    })

    expect(result.current.isLogLoading).toBe(false)
    expect(addToast).toHaveBeenCalled()
  })

  it('maps moderator IDs to display names', async () => {
    apiFetch.mockResolvedValue({
      items: [{ id: '1', action: 'approve', moderator_id: '1' }],
      total: 1,
    })

    const { result } = renderHook(() => useActivityLog({ addToast }))

    await act(async () => {
      await result.current.fetchActivityLog(1)
    })

    // The current user (userId '1') should be mapped to 'Admin'
    expect(result.current.activityLog[0].moderator_name).toBe('Admin')
  })
})

// ── useSettings ──────────────────────────────────────────────────────

describe('useSettings', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, { cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' } })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSettings({ addToast }))
    expect(result.current.settingsSections).toEqual([])
    expect(result.current.isSettingsLoading).toBe(false)
  })

  it('fetchSettings fetches and builds sections', async () => {
    apiFetch.mockResolvedValue({
      general: { auto_moderate: true, queue_page_size: 25 },
      spam_firewall: { max_links: 5 },
      notifications: { email: 'admin@test.com' },
    })

    const { result } = renderHook(() => useSettings({ addToast }))

    await act(async () => {
      await result.current.fetchSettings()
    })

    expect(result.current.settingsSections.length).toBeGreaterThan(0)
    expect(result.current.settingsSections[0].title).toBe('General')
  })

  it('handleSaveSettings sends data to API', async () => {
    apiFetch.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useSettings({ addToast }))

    await act(async () => {
      await result.current.handleSaveSettings({ auto_moderate: true })
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'settings',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(addToast).toHaveBeenCalledWith('Settings saved', 'success')
  })
})

// ── useCollaboration ─────────────────────────────────────────────────

describe('useCollaboration', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, { cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' } })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCollaboration({ addToast }))
    expect(result.current.detailItem).toBeNull()
    expect(result.current.itemHistory).toEqual([])
    expect(result.current.itemNotes).toEqual([])
    expect(result.current.activityFeed).toEqual([])
  })

  it('fetchItemHistory fetches history from API', async () => {
    apiFetch.mockResolvedValue({ items: [{ id: 'h1', action: 'approve' }] })

    const { result } = renderHook(() => useCollaboration({ addToast }))

    await act(async () => {
      await result.current.fetchItemHistory('item-1')
    })

    expect(apiFetch).toHaveBeenCalledWith('queue/item-1/history')
    expect(result.current.itemHistory).toHaveLength(1)
  })

  it('fetchItemNotes fetches notes from API', async () => {
    apiFetch.mockResolvedValue({ notes: [{ id: 'n1', text: 'Note text' }] })

    const { result } = renderHook(() => useCollaboration({ addToast }))

    await act(async () => {
      await result.current.fetchItemNotes('item-1')
    })

    expect(apiFetch).toHaveBeenCalledWith('queue/item-1/notes')
    expect(result.current.itemNotes).toHaveLength(1)
  })

  it('fetchActivityFeed fetches feed from API', async () => {
    apiFetch.mockResolvedValue({ events: [{ type: 'action', description: 'Approved' }] })

    const { result } = renderHook(() => useCollaboration({ addToast }))

    await act(async () => {
      await result.current.fetchActivityFeed()
    })

    expect(apiFetch).toHaveBeenCalledWith('activity-feed?limit=20')
    expect(result.current.activityFeed).toHaveLength(1)
  })

  it('addItemNote sends note to API', async () => {
    apiFetch.mockResolvedValue({ success: true, note: { id: 'n1', text: 'New note' } })

    const { result } = renderHook(() => useCollaboration({ addToast }))

    // Set a detail item first
    act(() => {
      result.current.setDetailItem({ id: 'item-1' })
    })

    await act(async () => {
      await result.current.addItemNote('New note', false, 'comment')
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'queue/item-1/note',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

// ── useReports ───────────────────────────────────────────────────────

describe('useReports', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, { cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' } })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useReports({ addToast }))
    expect(result.current.reputationUsers).toEqual([])
    expect(result.current.activityFeed).toEqual([])
    expect(result.current.isReputationLoading).toBe(false)
  })

  it('fetchUserReputation fetches from API', async () => {
    apiFetch.mockResolvedValue({ users: [{ userId: '1', userName: 'Alice', trustLevel: 'high' }] })

    const { result } = renderHook(() => useReports({ addToast }))

    await act(async () => {
      await result.current.fetchUserReputation()
    })

    expect(apiFetch).toHaveBeenCalledWith('users/reputation')
    expect(result.current.reputationUsers).toHaveLength(1)
  })

  it('fetchActivityFeed fetches from API', async () => {
    apiFetch.mockResolvedValue({ events: [{ type: 'action' }] })

    const { result } = renderHook(() => useReports({ addToast }))

    await act(async () => {
      await result.current.fetchActivityFeed()
    })

    expect(result.current.activityFeed).toHaveLength(1)
  })

  it('handles fetchActivityFeed errors', async () => {
    apiFetch.mockRejectedValue(new Error('Feed error'))

    const { result } = renderHook(() => useReports({ addToast }))

    await act(async () => {
      await result.current.fetchActivityFeed()
    })

    expect(result.current.feedError).toBe('Failed to load activity feed')
    expect(result.current.isFeedLoading).toBe(false)
  })
})
