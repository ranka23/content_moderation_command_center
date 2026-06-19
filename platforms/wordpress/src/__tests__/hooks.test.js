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
    Object.assign(global.window, {
      cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' },
    })
  })

  it('initializes with default state', async () => {
    // The hook triggers fetchAnalytics on mount via useEffect.
    // Resolve the raw-events fetch (first call) cleanly.
    apiFetch.mockResolvedValue([])
    const { result } = renderHook(() => useAnalytics({ addToast }))
    // Flush any deferred transition updates from mount effects
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // Clears the mount fetch so addToast isn't polluted
    addToast.mockClear()

    expect(result.current.analyticsData.heatmap).toBeDefined()
    expect(result.current.analyticsData.spamRatio).toBeDefined()
    expect(result.current.isAnalyticsLoading).toBe(false)
  })

  it('fetchAnalytics fetches and processes data via raw-events', async () => {
    // Mock raw-events to return an empty array (valid raw format)
    apiFetch
      .mockResolvedValueOnce([]) // raw-events (mount fetch)
      .mockResolvedValueOnce({ items: [], total: 0 }) // queue (mount fetch)
      .mockResolvedValueOnce([]) // raw-events (explicit fetchAnalytics call)
      .mockResolvedValueOnce({ items: [], total: 0 }) // queue

    const { result } = renderHook(() => useAnalytics({ addToast }))

    // Flush mount effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    apiFetch.mockClear()

    await act(async () => {
      await result.current.fetchAnalytics()
    })

    // Should call the new raw-events endpoint
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('raw-events'))
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('queue'))
  })

  it('fetchAnalytics falls back to old analytics endpoint if raw-events fails', async () => {
    // Mount effect: raw-events fails, falls back to analytics endpoint
    apiFetch
      .mockRejectedValueOnce(new Error('raw-events not available')) // raw-events fails
      .mockRejectedValueOnce(new Error('queue items failed')) // queue fetch also fails in the same try block
      .mockResolvedValueOnce({
        // fallback analytics
        heatmap: {
          data: [
            [1, 2],
            [3, 4],
          ],
          maxCount: 4,
        },
        spam_ratio: { spam_count: 5, total_count: 100, ratio: 0.05 },
        content_type_breakdown: [{ type: 'comment', count: 50 }],
        queue_stats: { pending: 10, spam: 5, flagged: 3, total: 18 },
      })

    renderHook(() => useAnalytics({ addToast }))

    // Flush mount effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Should have called the old analytics endpoint as fallback
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
      cmccData: {
        restUrl: '/wp-json/cmcc/v1/',
        nonce: 'test',
        userDisplay: 'Admin',
        userId: '1',
      },
    })
  })

  it('initializes with default state', async () => {
    // The hook triggers fetchActivityLog on mount via useEffect
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useActivityLog({ addToast }))
    // Flush any deferred transition updates from mount effects
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
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

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('activity-log'),
    )
    expect(result.current.activityLog).toHaveLength(1)
  })

  it('handles API errors gracefully', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useActivityLog({ addToast }))
    // Flush mount effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    addToast.mockClear()
    apiFetch.mockReset()
    apiFetch.mockRejectedValue(new Error('Network error'))

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
    Object.assign(global.window, {
      cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' },
    })
  })

  it('initializes with default state', () => {
    apiFetch.mockResolvedValue({})
    const { result } = renderHook(() => useSettings({ addToast }))
    expect(result.current.settingsSections).toEqual([])
    expect(result.current.isSettingsLoading).toBeUndefined()
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

  it('handleSettingsSave sends data to API', async () => {
    apiFetch.mockResolvedValue({ success: true })
    const { result } = renderHook(() => useSettings({ addToast }))

    await act(async () => {
      await result.current.handleSettingsSave({ auto_moderate: true })
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'settings',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(addToast).toHaveBeenCalledWith(
      'Settings saved successfully',
      'success',
    )
  })
})

// ── useCollaboration ─────────────────────────────────────────────────

describe('useCollaboration', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, {
      cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' },
    })
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
    apiFetch.mockResolvedValue({
      events: [{ type: 'action', description: 'Approved' }],
    })

    const { result } = renderHook(() => useCollaboration({ addToast }))

    await act(async () => {
      await result.current.fetchActivityFeed()
    })

    expect(apiFetch).toHaveBeenCalledWith('activity-feed?limit=20')
    expect(result.current.activityFeed).toHaveLength(1)
  })

  it('addItemNote sends note to API', async () => {
    apiFetch.mockResolvedValue({
      success: true,
      note: { id: 'n1', text: 'New note' },
    })

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
    Object.assign(global.window, {
      cmccData: { restUrl: '/wp-json/cmcc/v1/', nonce: 'test' },
    })
  })

  it('initializes with default state', async () => {
    apiFetch.mockResolvedValue({ data: [], total: 0 })
    const { result } = renderHook(() => useReports({ addToast }))
    // Flush any deferred transition updates from mount effects
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(result.current.reputationUsers).toEqual([])
    expect(result.current.activityFeed).toEqual([])
    expect(result.current.isReputationLoading).toBe(false)
  })

  it('fetchUserReputation fetches from reputation-raw endpoint', async () => {
    apiFetch.mockResolvedValue({
      data: [
        {
          authorId: 'user-1',
          totalItems: 10,
          spamCount: 2,
          approvedCount: 5,
          flaggedCount: 1,
          rejectedCount: 2,
          lastSeen: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 25,
      total_pages: 1,
    })

    const { result } = renderHook(() => useReports({ addToast }))

    // Flush mount effect so it doesn't consume the mock
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    apiFetch.mockClear()
    apiFetch.mockResolvedValue({
      data: [
        {
          authorId: 'user-1',
          totalItems: 10,
          spamCount: 2,
          approvedCount: 5,
          flaggedCount: 1,
          rejectedCount: 2,
          lastSeen: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 25,
      total_pages: 1,
    })

    await act(async () => {
      await result.current.fetchUserReputation()
    })

    // Wait for deferred updates to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('reputation-raw'),
    )
    expect(result.current.reputationUsers).toHaveLength(1)
    expect(result.current.reputationUsers[0]).toHaveProperty(
      'authorId',
      'user-1',
    )
    expect(result.current.reputationUsers[0]).toHaveProperty('riskLevel')
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
