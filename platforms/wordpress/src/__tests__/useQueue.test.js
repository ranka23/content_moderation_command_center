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

  it('initializes with default state', () => {
    const { result } = renderHook(() => useQueue({ addToast }))
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
    const mockItems = [{ id: '1', title: 'Test', status: 'pending' }]
    apiFetch.mockResolvedValue({ items: mockItems, total: 1 })

    const { result } = renderHook(() => useQueue({ addToast }))

    await act(async () => {
      await result.current.fetchQueue()
    })

    expect(result.current.queueItems).toEqual(mockItems)
    expect(result.current.queueTotal).toBe(1)
  })

  it('fetchQueue handles API errors', async () => {
    apiFetch.mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useQueue({ addToast }))

    await act(async () => {
      await result.current.fetchQueue()
    })

    expect(result.current.isQueueLoading).toBe(false)
    expect(addToast).toHaveBeenCalledWith('Failed to fetch queue', 'error')
  })

  it('updateFilters changes filter values', () => {
    const { result } = renderHook(() => useQueue({ addToast }))

    act(() => {
      result.current.updateFilters({ status: 'spam', contentType: 'comment' })
    })

    expect(result.current.filters.status).toBe('spam')
    expect(result.current.filters.contentType).toBe('comment')
    // Other filters unchanged
    expect(result.current.filters.search).toBe('')
  })

  it('setQueuePage changes page', () => {
    const { result } = renderHook(() => useQueue({ addToast }))

    act(() => {
      result.current.setQueuePage(3)
    })

    expect(result.current.queuePage).toBe(3)
  })

  it('handleItemAction sends request and refreshes queue', async () => {
    apiFetch.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useQueue({ addToast }))

    await act(async () => {
      await result.current.handleItemAction('approve', 'item-1')
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'queue/item-1/moderate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('approve'),
      }),
    )
  })

  it('handleBulkAction sends request for multiple items', async () => {
    apiFetch.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useQueue({ addToast }))

    await act(async () => {
      await result.current.handleBulkAction('spam', ['1', '2', '3'])
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'queue/bulk',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"1","2","3"'),
      }),
    )
  })
})
