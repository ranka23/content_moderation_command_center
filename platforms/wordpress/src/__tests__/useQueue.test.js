/**
 * Tests for the CMCC WordPress useQueue hook
 */

import { renderHook, act } from '@testing-library/react'
import { useQueue } from '../hooks/useQueue'

// Mock apiFetch
jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}))

const { apiFetch } = require('../lib/api')

describe('useQueue', () => {
  const addToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.window = Object.create(window)
    Object.assign(global.window, {
      cmccData: {
        restUrl: '/wp-json/cmcc/v1/',
        nonce: 'test-nonce',
      },
    })
  })

  it('initializes with default state', async () => {
    // The hook triggers fetchQueue on mount via useEffect.
    // We resolve the fetch so loading goes back to false.
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useQueue({ addToast }))

    // Flush the mount effect (the deferred fetchQueue call)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.queueItems).toEqual([])
    expect(result.current.queueTotal).toBe(0)
    expect(result.current.isQueueLoading).toBe(false)
    expect(result.current.queuePage).toBe(1)
    expect(result.current.filters).toEqual({
      contentType: 'all',
      status: 'all',
      dateRange: 'all',
      search: '',
    })
  })

  it('fetchQueue fetches items from API', async () => {
    // Mock data should match the shape the hook normalizer expects
    const mockItem = {
      item_id: '1',
      content_type: 'comment',
      status: 'pending',
      spam_score: '0.1',
      author_id: '5',
      date_gmt: '2023-06-15T10:30:00Z',
      title: 'Test',
      excerpt: 'A test comment',
    }
    apiFetch.mockResolvedValue({ items: [mockItem], total: 1 })

    const { result } = renderHook(() => useQueue({ addToast }))

    await act(async () => {
      await result.current.fetchQueue()
    })

    // Verify the hook normalizes the API response correctly
    expect(result.current.queueItems).toHaveLength(1)
    expect(result.current.queueItems[0]).toMatchObject({
      id: '1',
      contentType: 'comment',
      status: 'pending',
      title: 'Test',
    })
    expect(result.current.queueTotal).toBe(1)
  })

  it('fetchQueue handles API errors', async () => {
    // Resolve mount effect fetch first
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useQueue({ addToast }))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Now test the error case
    addToast.mockClear()
    apiFetch.mockReset()
    apiFetch.mockRejectedValue(new Error('API error'))

    await act(async () => {
      await result.current.fetchQueue()
    })

    expect(result.current.isQueueLoading).toBe(false)
    // The hook calls addToast with 'Failed to fetch queue items', not 'Failed to fetch queue'
    expect(addToast).toHaveBeenCalledWith(
      'Failed to fetch queue items',
      'error',
    )
  })

  it('handleFilterChange changes filter values', () => {
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useQueue({ addToast }))

    // The hook exposes handleFilterChange, not updateFilters
    act(() => {
      result.current.handleFilterChange({
        status: 'spam',
        contentType: 'comment',
      })
    })

    expect(result.current.filters.status).toBe('spam')
    expect(result.current.filters.contentType).toBe('comment')
    // Other filters unchanged
    expect(result.current.filters.search).toBe('')
  })

  it('setQueuePage changes page', () => {
    apiFetch.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(() => useQueue({ addToast }))

    act(() => {
      result.current.setQueuePage(3)
    })

    expect(result.current.queuePage).toBe(3)
  })

  it('handleItemAction sends request and refreshes queue', async () => {
    apiFetch
      .mockResolvedValueOnce({ items: [], total: 0 }) // mount fetch
      .mockResolvedValueOnce({ success: true }) // action request
      .mockResolvedValueOnce({ items: [], total: 0 }) // refresh fetch

    const { result } = renderHook(() => useQueue({ addToast }))

    // Flush mount effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    apiFetch.mockClear()

    await act(async () => {
      await result.current.handleItemAction('approve', 'item-1')
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'queue/item-1/action',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('approve'),
      }),
    )
  })

  it('handleBulkAction sends request for multiple items', async () => {
    apiFetch
      .mockResolvedValueOnce({ items: [], total: 0 }) // mount fetch
      .mockResolvedValueOnce({ success: true }) // bulk action

    const { result } = renderHook(() => useQueue({ addToast }))

    // Flush mount effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    apiFetch.mockClear()

    await act(async () => {
      await result.current.handleBulkAction('spam', ['1', '2', '3'])
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'queue/bulk-action',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"1","2","3"'),
      }),
    )
  })
})
