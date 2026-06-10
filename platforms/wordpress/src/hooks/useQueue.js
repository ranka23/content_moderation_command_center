import { useState, useCallback, useEffect } from 'react'
import { startTransition } from 'react'
import { apiFetch } from '../lib/api'
import { useSavedFilters } from '@cmcc/ui'

/**
 * Queue management hook.
 *
 * Manages all queue-related state (items, filters, pagination, sorting,
 * item history, item notes, assignment) and provides action handlers.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Queue state + action handlers.
 */
export function useQueue({ addToast }) {
  const [queueItems, setQueueItems] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [isQueueLoading, setIsQueueLoading] = useState(false)

  // Note: queueStats is managed by useAnalytics because it comes from the analytics endpoint.
  // This hook provides the fetch / action functions needed by the queue page.

  // Queue filters
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  })

  // Queue pagination
  const [queuePage, setQueuePage] = useState(1)
  const [queuePerPage, setQueuePerPage] = useState(25)

  // Sorting
  const [sortField, setSortField] = useState('dateGmt')
  const [sortDirection, setSortDirection] = useState('desc')

  // Quick filter presets
  const [activeQuickPreset, setActiveQuickPreset] = useState(null)

  // Saved filters
  const { savedFilters, saveFilter } = useSavedFilters('queue', filters)

  // ── Item Detail Panel ──────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // ── Notes ──────────────────────────────────────────────────────────
  const [itemNotes, setItemNotes] = useState([])
  const [isNotesLoading, setIsNotesLoading] = useState(false)

  // ── Bulk Progress ──────────────────────────────────────────────────
  const [bulkProgress] = useState({
    active: false,
    current: 0,
    total: 0,
  })

  // ── Build URL params helper ────────────────────────────────────────
  const buildQueueParams = useCallback(
    (page = 1) => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(queuePerPage),
      })
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status)
      }
      if (filters.contentType && filters.contentType !== 'all') {
        params.set('content_type', filters.contentType)
      }
      if (filters.search) {
        params.set('search', filters.search)
      }
      if (sortField) {
        params.set('sort_field', sortField)
        params.set('sort_direction', sortDirection)
      }
      return params
    },
    [filters, queuePerPage, sortField, sortDirection],
  )

  // ── Fetch Queue ────────────────────────────────────────────────────
  const fetchQueue = useCallback(
    async (page = 1) => {
      setIsQueueLoading(true)
      try {
        const params = buildQueueParams(page)
        const data = await apiFetch('queue?' + params.toString())

        const deriveAuthorName = (authorId) => {
          if (!authorId) return 'Unknown'
          if (authorId.startsWith('spammer-'))
            return 'Spammer ' + authorId.replace('spammer-', '')
          if (authorId.startsWith('user-'))
            return 'User ' + authorId.replace('user-', '')
          if (authorId === 'admin') return 'Administrator'
          return authorId
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        }

        const mapped = (data.items || []).map((item) => ({
          id: item.item_id,
          contentType: item.content_type,
          originalId: item.item_id,
          status: item.status,
          spamScore: parseFloat(item.spam_score) || 0,
          authorId: item.author_id,
          authorName: deriveAuthorName(item.author_id || ''),
          dateGmt: item.date_gmt,
          title: item.title || '',
          excerpt: item.excerpt || '',
          typeIcon: '',
          statusLabel: '',
          statusColor: '',
        }))
        setQueueItems(mapped)
        setQueueTotal(data.total || 0)
        setQueuePage(data.page || 1)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch queue:', err)
        addToast('Failed to fetch queue items', 'error')
      } finally {
        setIsQueueLoading(false)
      }
    },
    [buildQueueParams, addToast],
  )

  // ── Handle Single Item Action ──────────────────────────────────────
  const handleItemAction = useCallback(
    async (actionType, itemId) => {
      try {
        await apiFetch(`queue/${encodeURIComponent(itemId)}/action`, {
          method: 'POST',
          body: JSON.stringify({ action: actionType }),
        })
        fetchQueue(queuePage)
        addToast(`Item ${actionType}d successfully`, 'success')
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Action failed:', err)
        addToast(
          `Failed to ${actionType} item: ${err?.message || 'Unknown error'}`,
          'error',
        )
      }
    },
    [fetchQueue, queuePage, addToast],
  )

  // ── Bulk actions ───────────────────────────────────────────────────
  const BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION = ['deactivate-users']

  const handleBulkAction = useCallback(
    async (actionType, selectedIds) => {
      try {
        // B4 Fix: For 'deactivate-users', first deactivate WordPress user accounts
        if (BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION.includes(actionType)) {
          await apiFetch('users/deactivate', {
            method: 'POST',
            body: JSON.stringify({ ids: selectedIds }),
          })
        }
        await apiFetch('queue/bulk-action', {
          method: 'POST',
          body: JSON.stringify({ ids: selectedIds, action: actionType }),
        })
        fetchQueue(queuePage)
        addToast(
          `Bulk action "${actionType}" applied to ${selectedIds.length} items`,
          'success',
        )
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Bulk action failed:', err)
        addToast(
          `Bulk action failed: ${err?.message || 'Unknown error'}`,
          'error',
        )
      }
    },
    [fetchQueue, queuePage, addToast],
  )

  // ── Fetch Item History ─────────────────────────────────────────────
  const fetchItemHistory = useCallback(async (itemId) => {
    setIsHistoryLoading(true)
    try {
      const data = await apiFetch(`queue/${encodeURIComponent(itemId)}/history`)
      setItemHistory(data.timeline || data.history || data.items || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch item history:', err)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  // ── Fetch Item Notes ───────────────────────────────────────────────
  const fetchItemNotes = useCallback(async (itemId) => {
    setIsNotesLoading(true)
    try {
      const data = await apiFetch(`queue/${encodeURIComponent(itemId)}/notes`)
      setItemNotes(data.notes || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch notes:', err)
    } finally {
      setIsNotesLoading(false)
    }
  }, [])

  // ── Add Note ───────────────────────────────────────────────────────
  const addItemNote = useCallback(
    async (content, isInternal, type) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        const data = await apiFetch(
          `queue/${encodeURIComponent(itemId)}/note`,
          {
            method: 'POST',
            body: JSON.stringify({ content, is_internal: isInternal, type }),
          },
        )
        if (data.success) {
          setItemNotes((prev) => [data.note, ...prev])
          addToast('Note added', 'success')
        }
      } catch {
        addToast('Failed to add note', 'error')
      }
    },
    [detailItem, addToast],
  )

  // ── Assign Item ────────────────────────────────────────────────────
  const handleAssignItem = useCallback(
    async (assignee, dueDate, priority) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        const data = await apiFetch(
          `queue/${encodeURIComponent(itemId)}/assign`,
          {
            method: 'POST',
            body: JSON.stringify({ assignee, due_date: dueDate, priority }),
          },
        )
        if (data.success) {
          addToast(`Item assigned to ${assignee || 'unassigned'}`, 'success')
        }
      } catch {
        addToast('Failed to assign item', 'error')
      }
    },
    [detailItem, addToast],
  )

  // ── Handlers ───────────────────────────────────────────────────────
  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setQueuePage(1)
  }, [])

  const handleSort = useCallback((field, direction) => {
    setSortField(field)
    setSortDirection(direction)
  }, [])

  const handleQuickFilter = useCallback((presetId) => {
    setActiveQuickPreset(presetId)
    if (presetId === null) {
      setFilters({
        contentType: 'all',
        status: 'all',
        dateRange: 'all',
        search: '',
      })
    } else {
      const presets = [
        { id: 'last-hour', filters: { dateRange: 'last-hour', status: 'all' } },
        { id: 'today', filters: { dateRange: 'today', status: 'all' } },
        { id: 'this-week', filters: { dateRange: 'this-week', status: 'all' } },
        { id: 'pending', filters: { status: 'pending', dateRange: 'all' } },
        { id: 'high-spam', filters: { status: 'spam', dateRange: 'all' } },
        { id: 'flagged', filters: { status: 'flagged', dateRange: 'all' } },
      ]
      const preset = presets.find((p) => p.id === presetId)
      if (preset) {
        setFilters((prev) => ({ ...prev, ...preset.filters }))
      }
    }
    setQueuePage(1)
  }, [])

  // Load on mount when queue page changes
  useEffect(() => {
    startTransition(() => {
      fetchQueue(queuePage)
    })
  }, [])

  return {
    // State
    queueItems,
    queueTotal,
    isQueueLoading,
    filters,
    queuePage,
    setQueuePage,
    queuePerPage,
    setQueuePerPage,
    sortField,
    sortDirection,
    activeQuickPreset,
    savedFilters,
    detailItem,
    setDetailItem,
    itemHistory,
    isHistoryLoading,
    itemNotes,
    isNotesLoading,
    bulkProgress,
    // Operations
    fetchQueue,
    handleItemAction,
    handleBulkAction,
    handleQuickFilter,
    handleFilterChange,
    handleSort,
    fetchItemHistory,
    fetchItemNotes,
    addItemNote,
    handleAssignItem,
    saveFilter,
  }
}
