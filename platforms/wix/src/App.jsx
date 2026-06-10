import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from 'react'
import {
  QueueTable,
  HeatmapChart,
  ActionButton,
  NotificationBadge,
  useKeyboardShortcuts,
  useSavedFilters,
  QuickFilterBar,
  AiEvaluationResult,
} from '@cmcc/ui'
import {
  processAnalytics,
  filterActivityLog,
  getEmptyAnalytics,
} from '@cmcc/core'
import { OnboardingWizard } from './components/OnboardingWizard'
import { ItemDetailPanel } from './components/ItemDetailPanel'
import { ReportsTab } from './components/ReportsTab'
import { SettingsTab } from './components/SettingsTab'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEYBOARD_SHORTCUTS = [
  { key: 'a', description: 'Approve selected item' },
  { key: 'r', description: 'Reject selected item' },
  { key: 's', description: 'Mark as Spam' },
  { key: 'd', description: 'Defer selected item' },
  { key: 'v', description: 'View item details' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

const TABS = [
  { id: 'queue', label: 'Queue', icon: '\u{1F4CB}' },
  { id: 'analytics', label: 'Analytics', icon: '\u{1F4CA}' },
  { id: 'activity', label: 'Activity Log', icon: '\u{1F4DD}' },
  { id: 'reports', label: 'Reports', icon: '\u{1F4C4}' },
  { id: 'settings', label: 'Settings', icon: '\u{2699}\u{FE0F}' },
]

const POLL_INTERVAL_MS = 30000

/** Quick filter presets for the queue tab. */
const QUICK_PRESETS = [
  {
    id: 'last-hour',
    label: 'Last Hour',
    icon: '\u{1F550}',
    filters: { dateRange: 'last-hour', status: 'all' },
  },
  {
    id: 'today',
    label: 'Today',
    icon: '\u{1F4C5}',
    filters: { dateRange: 'today', status: 'all' },
  },
  {
    id: 'this-week',
    label: 'This Week',
    icon: '\u{1F4C6}',
    filters: { dateRange: 'this-week', status: 'all' },
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: '\u{23F3}',
    filters: { status: 'pending', dateRange: 'all' },
  },
  {
    id: 'high-spam',
    label: 'High Spam',
    icon: '\u{1F4E5}',
    filters: { status: 'spam', dateRange: 'all' },
  },
  {
    id: 'flagged',
    label: 'Flagged',
    icon: '\u{26A0}\u{FE0F}',
    filters: { status: 'flagged', dateRange: 'all' },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQueueBadgeCount(items, status) {
  return items.filter((i) => i.status === status).length
}

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

export function App({ wixContext, backendUrl }) {
  const [activeTab, setActiveTab] = useState('queue')

  // Queue state
  const [queueItems, setQueueItems] = useState([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState(null)
  const [activeQuickPreset, setActiveQuickPreset] = useState(null)

  // Analytics state
  const [analytics, setAnalytics] = useState(getEmptyAnalytics())
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(null)

  // Activity log state
  const [activityEntries, setActivityEntries] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState(null)
  const [activityFilters, setActivityFilters] = useState({
    action: '',
    contentType: '',
    search: '',
  })

  // Reports tab state
  const [reputationUsers, setReputationUsers] = useState([])
  const [reputationLoading, setReputationLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cmcc-wix-theme') || 'light'
  })

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('cmcc-wix-theme', next)
      return next
    })
  }, [])

  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Settings state
  const [settingsSaving, setSettingsSaving] = useState(false)

  // AI Moderation state
  const DEFAULT_AI_CONFIG = {
    engine: 'none',
    apiKey: '',
    model: '',
    autoModerate: false,
    spamThreshold: 50,
    enableLanguageDetection: false,
    enableSentimentAnalysis: false,
  }
  const [aiConfig, setAiConfig] = useState(DEFAULT_AI_CONFIG)
  const [aiEvaluatingId, setAiEvaluatingId] = useState(null)
  const [aiEvaluationResult, setAiEvaluationResult] = useState(null)
  const [aiEvaluationError, setAiEvaluationError] = useState(null)
  const [evaluatedItemId, setEvaluatedItemId] = useState(null)
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // Item detail panel state
  const [detailItem, setDetailItem] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [itemHistory, setItemHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [itemNotes, setItemNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [itemAssignment, setItemAssignment] = useState(null)

  // Track initial mount to avoid fetching all data in effect
  const initialMount = useRef(true)

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('cmcc-wix-theme', theme)
  }, [theme])

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: '?',
        description: 'Toggle keyboard shortcut help',
        handler: () => setShowShortcuts((p) => !p),
      },
      {
        key: 'f',
        description: 'Focus search',
        handler: () => {
          const searchInput = document.querySelector('input[type="text"]')
          searchInput?.focus()
        },
      },
    ].filter(Boolean),
  )

  // Saved filters for queue
  const { savedFilters, saveFilter } = useSavedFilters('wix-queue', {
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  })

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchFromAPI = useCallback(
    async (endpoint, options = {}) => {
      const headers = { 'Content-Type': 'application/json' }
      if (wixContext.token) {
        headers['Authorization'] = `Bearer ${wixContext.token}`
      }
      const url = `${backendUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        body: options.body ? options.body : undefined,
      })
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      return response.json()
    },
    [backendUrl, wixContext.token],
  )

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true)
    setQueueError(null)
    try {
      const data = await fetchFromAPI('queue')
      setQueueItems(data.items || [])
    } catch (err) {
      setQueueError(err.message)
    } finally {
      setQueueLoading(false)
    }
  }, [fetchFromAPI])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    try {
      const data = await fetchFromAPI('analytics')
      if (data.processed) {
        setAnalytics(data.processed)
      } else if (data.events && data.queueItems) {
        const processed = processAnalytics(
          data.events,
          data.queueItems,
          data.moderatorNames || {},
          data.options || {},
        )
        setAnalytics(processed)
      } else {
        setAnalytics(getEmptyAnalytics())
      }
    } catch (err) {
      setAnalyticsError(err.message)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [fetchFromAPI])

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true)
    setActivityError(null)
    try {
      const data = await fetchFromAPI('activity')
      setActivityEntries(data.entries || [])
    } catch (err) {
      setActivityError(err.message)
    } finally {
      setActivityLoading(false)
    }
  }, [fetchFromAPI])

  const fetchUserReputation = useCallback(async () => {
    setReputationLoading(true)
    try {
      const data = await fetchFromAPI('reputation')
      setReputationUsers(data.users || [])
    } catch {
      setReputationUsers([])
    } finally {
      setReputationLoading(false)
    }
  }, [fetchFromAPI])

  const fetchActivityFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeedError(null)
    try {
      const data = await fetchFromAPI('activity-feed?limit=20')
      setActivityFeed(data.events || [])
    } catch {
      setFeedError('Failed to load activity feed')
    } finally {
      setFeedLoading(false)
    }
  }, [fetchFromAPI])

  /** Fetch history for a specific queue item. */
  const fetchItemHistory = useCallback(
    async (itemId) => {
      setHistoryLoading(true)
      try {
        const data = await fetchFromAPI(`queue/${itemId}/history`)
        setItemHistory(Array.isArray(data) ? data : data.entries || [])
      } catch {
        setItemHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [fetchFromAPI],
  )

  /** Fetch notes for a specific queue item. */
  const fetchItemNotes = useCallback(
    async (itemId) => {
      setNotesLoading(true)
      try {
        const data = await fetchFromAPI(`queue/${itemId}/notes`)
        setItemNotes(data.notes || [])
      } catch {
        setItemNotes([])
      } finally {
        setNotesLoading(false)
      }
    },
    [fetchFromAPI],
  )

  /** Fetch assignment for a specific queue item. */
  const fetchItemAssignment = useCallback(
    async (itemId) => {
      try {
        const data = await fetchFromAPI(`queue/${itemId}/assignments`)
        setItemAssignment(data.assignment || null)
      } catch {
        setItemAssignment(null)
      }
    },
    [fetchFromAPI],
  )

  // Fetch data when tab changes
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
    }
    startTransition(() => {
      if (activeTab === 'queue') {
        fetchQueue()
      } else if (activeTab === 'analytics') {
        fetchAnalytics()
      } else if (activeTab === 'activity') {
        fetchActivity()
      } else if (activeTab === 'reports') {
        fetchAnalytics()
        fetchUserReputation()
        fetchActivityFeed()
      }
    })
  }, [
    activeTab,
    fetchQueue,
    fetchAnalytics,
    fetchActivity,
    fetchUserReputation,
    fetchActivityFeed,
  ])

  // Polling for queue data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchQueue])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  const handleQueueBulkAction = async (actionType, selectedIds) => {
    try {
      await fetch(`${backendUrl}/queue/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, ids: selectedIds }),
      })
      await fetchQueue()
      addToast('Bulk action completed')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const handleQueueItemAction = async (actionType, itemId) => {
    try {
      await fetch(`${backendUrl}/queue/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      })
      await fetchQueue()
      addToast('Item moderated successfully')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const handleSettingsSubmit = async (formData) => {
    setSettingsSaving(true)
    try {
      const payload = { ...formData, aiConfig }
      await fetch(`${backendUrl}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      addToast('Settings saved successfully')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSettingsSaving(false)
    }
  }

  // AI evaluate handler
  const handleAiEvaluate = useCallback(
    async (itemId) => {
      setAiEvaluatingId(itemId)
      setEvaluatedItemId(itemId)
      setAiEvaluationResult(null)
      setAiEvaluationError(null)
      try {
        const data = await fetchFromAPI(`queue/${itemId}/ai-evaluate`, {
          method: 'POST',
          body: JSON.stringify(aiConfig.engine !== 'none' ? { aiConfig } : {}),
        })
        setAiEvaluationResult(data)
        addToast('AI evaluation completed')
      } catch (err) {
        setAiEvaluationError(err.message)
        addToast(err.message, 'error')
      }
    },
    [aiConfig, fetchFromAPI, addToast],
  )

  /** Open the item detail panel for a queue item. */
  const handleViewItem = useCallback(
    (item) => {
      const itemId = item._id || item.id
      setDetailItem(item)
      setDetailOpen(true)
      fetchItemHistory(itemId)
      fetchItemNotes(itemId)
      fetchItemAssignment(itemId)
    },
    [fetchItemHistory, fetchItemNotes, fetchItemAssignment],
  )

  /** Add a note to the currently viewed detail item. */
  const handleAddNote = useCallback(
    async (content, isInternal, type) => {
      if (!detailItem) return
      const itemId = detailItem._id || detailItem.id
      try {
        const data = await fetchFromAPI(`queue/${itemId}/notes`, {
          method: 'POST',
          body: JSON.stringify({
            content,
            isInternal,
            type: type || 'general',
            authorName: 'Moderator',
          }),
        })
        if (data.note) {
          setItemNotes((prev) => [data.note, ...prev])
          addToast('Note added', 'success')
        }
      } catch (err) {
        addToast(err.message || 'Failed to add note', 'error')
      }
    },
    [detailItem, fetchFromAPI, addToast],
  )

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const pendingCount = getQueueBadgeCount(queueItems, 'pending')
  const spamCount = getQueueBadgeCount(queueItems, 'spam')

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderLoading(message) {
    return <div className="cmcc-loading">{message}</div>
  }

  function renderEmpty(icon, text, sub) {
    return (
      <div className="cmcc-empty">
        <div className="cmcc-empty-icon">{icon}</div>
        <p className="cmcc-empty-text">{text}</p>
        {sub && <p className="cmcc-empty-sub">{sub}</p>}
      </div>
    )
  }

  function renderError(icon, text, detail) {
    return (
      <div className="cmcc-error">
        <div className="cmcc-error-icon">{icon}</div>
        <p className="cmcc-error-text">{text}</p>
        {detail && <p className="cmcc-error-detail">{detail}</p>}
        <ActionButton variant="secondary" size="sm" onClick={fetchQueue}>
          Retry
        </ActionButton>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Tab renders
  // -----------------------------------------------------------------------

  function renderQueueTab() {
    if (queueLoading) return renderLoading('Loading queue...')
    if (queueError)
      return renderError('\u{26A0}\u{FE0F}', 'Failed to load queue', queueError)

    if (!queueLoading && queueItems.length === 0) {
      return renderEmpty(
        '\u{2705}',
        'All clear!',
        'No items in the moderation queue.',
      )
    }

    return (
      <div>
        {/* Quick Filters */}
        <div style={{ marginBottom: 12 }}>
          <QuickFilterBar
            presets={QUICK_PRESETS}
            activePreset={activeQuickPreset}
            onSelectPreset={setActiveQuickPreset}
          />
        </div>

        {/* Saved Filters Bar */}
        <div className="cmcc-queue-toolbar">
          <div className="cmcc-queue-toolbar-left">
            {savedFilters.length > 0 && (
              <select
                className="cmcc-saved-filters-select"
                onChange={(e) => {
                  if (e.target.value) {
                    const found = savedFilters.find(
                      (f) => f.name === e.target.value,
                    )
                    if (found) {
                      addToast('Filter applied: ' + found.name, 'success')
                    }
                  }
                }}
                defaultValue=""
              >
                <option value="">Saved Filters...</option>
                {savedFilters.map((sf) => (
                  <option key={sf.name} value={sf.name}>
                    {sf.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="cmcc-queue-toolbar-right">
            <input
              type="text"
              className="cmcc-save-filter-input"
              placeholder="Name this filter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  saveFilter(e.target.value.trim(), {
                    contentType: 'all',
                    status: 'all',
                    dateRange: 'all',
                    search: '',
                  })
                  addToast('Filter saved: ' + e.target.value.trim(), 'success')
                  e.target.value = ''
                }
              }}
            />
            <button
              className="cmcc-save-filter-btn"
              onClick={() => {
                const input = document.querySelector('.cmcc-save-filter-input')
                if (input && input.value.trim()) {
                  saveFilter(input.value.trim(), {
                    contentType: 'all',
                    status: 'all',
                    dateRange: 'all',
                    search: '',
                  })
                  addToast('Filter saved: ' + input.value.trim(), 'success')
                  input.value = ''
                }
              }}
            >
              + Save Filter
            </button>
            <button
              className="cmcc-save-filter-btn"
              onClick={() =>
                handleAiEvaluate(queueItems[0]?._id || queueItems[0]?.id)
              }
              disabled={
                aiConfig.engine === 'none' ||
                queueItems.length === 0 ||
                !!aiEvaluatingId
              }
              title={
                aiConfig.engine === 'none'
                  ? 'Enable an AI engine in Settings first'
                  : 'Evaluate with AI'
              }
            >
              {'\u{1F916}'} AI Eval
            </button>
            <button
              className="cmcc-shortcuts-btn"
              onClick={() => setShowShortcuts((p) => !p)}
              title="Keyboard shortcuts"
            >
              {'\u{2328}\u{FE0F}'}
            </button>
          </div>
        </div>

        <QueueTable
          items={queueItems}
          onBulkAction={handleQueueBulkAction}
          onItemAction={handleQueueItemAction}
          onViewItem={handleViewItem}
          filters={{
            contentType: 'all',
            status: 'all',
            dateRange: 'all',
            search: '',
          }}
          onFilterChange={() => {}}
          isLoading={queueLoading}
          totalCount={queueItems.length}
        />

        {/* AI Evaluation Result */}
        {(aiEvaluationResult || aiEvaluationError || aiEvaluatingId) && (
          <div className="cmcc-card" style={{ marginTop: 16, padding: 16 }}>
            <h3 className="cmcc-card-title">{'\u{1F916}'} AI Moderation</h3>
            <AiEvaluationResult
              result={aiEvaluationResult}
              isLoading={
                !!aiEvaluatingId && !aiEvaluationResult && !aiEvaluationError
              }
              error={aiEvaluationError}
              onReEvaluate={
                !evaluatedItemId || aiEvaluatingId
                  ? undefined
                  : () => handleAiEvaluate(evaluatedItemId)
              }
            />
          </div>
        )}
      </div>
    )
  }

  function renderAnalyticsTab() {
    if (analyticsLoading) return renderLoading('Loading analytics...')
    if (analyticsError)
      return renderError(
        '\u{26A0}\u{FE0F}',
        'Failed to load analytics',
        analyticsError,
      )

    const hasData =
      analytics.heatmap.data.some((row) => row.some((v) => v > 0)) ||
      analytics.contentTypeBreakdown.length > 0

    if (!hasData) {
      return renderEmpty(
        '\u{1F4CA}',
        'No analytics data yet',
        'Data will appear once content is moderated.',
      )
    }

    return (
      <div>
        <div className="cmcc-card">
          <h3 className="cmcc-card-title">Moderation Activity Heatmap</h3>
          <HeatmapChart data={analytics.heatmap} showTooltip />
        </div>

        <div className="cmcc-analytics-summary">
          <div className="cmcc-stat-card">
            <p className="cmcc-stat-label">Spam Ratio</p>
            <p
              className={
                'cmcc-stat-value' +
                (analytics.spamRatio.percentage > 50 ? ' danger' : '')
              }
            >
              {analytics.spamRatio.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="cmcc-stat-card">
            <p className="cmcc-stat-label">Total Items</p>
            <p className="cmcc-stat-value">{analytics.spamRatio.totalCount}</p>
          </div>
          <div className="cmcc-stat-card">
            <p className="cmcc-stat-label">Spam Items</p>
            <p className="cmcc-stat-value">{analytics.spamRatio.spamCount}</p>
          </div>
        </div>

        {analytics.contentTypeBreakdown.length > 0 && (
          <div className="cmcc-card" style={{ marginTop: 16 }}>
            <h3 className="cmcc-card-title">Content Type Breakdown</h3>
            <ul className="cmcc-activity-list">
              {analytics.contentTypeBreakdown.map((item) => (
                <li key={item.type} className="cmcc-activity-item">
                  <span className="cmcc-activity-icon">{'\u{1F4C4}'}</span>
                  <div className="cmcc-activity-body">
                    <p className="cmcc-activity-action">
                      {item.type}: {item.count} items (
                      {item.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  function renderActivityTab() {
    const filtered = filterActivityLog(activityEntries, activityFilters)
    const hasMore = filtered.length > 50
    const visibleEntries = filtered.slice(0, 50)

    return (
      <div>
        <div className="cmcc-activity-filters">
          <select
            value={activityFilters.action}
            onChange={(e) =>
              setActivityFilters((prev) => ({
                ...prev,
                action: e.target.value,
              }))
            }
          >
            <option value="">All actions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="spammed">Spammed</option>
            <option value="flagged">Flagged</option>
            <option value="deferred">Deferred</option>
          </select>
          <select
            value={activityFilters.contentType}
            onChange={(e) =>
              setActivityFilters((prev) => ({
                ...prev,
                contentType: e.target.value,
              }))
            }
          >
            <option value="">All types</option>
            <option value="comment">Comment</option>
            <option value="post">Post</option>
            <option value="user">User</option>
          </select>
          <input
            type="text"
            placeholder="Search entries..."
            value={activityFilters.search}
            onChange={(e) =>
              setActivityFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
          />
        </div>

        {activityLoading && renderLoading('Loading activity log...')}
        {activityError &&
          renderError(
            '\u{26A0}\u{FE0F}',
            'Failed to load activity log',
            activityError,
          )}

        {!activityLoading &&
          !activityError &&
          visibleEntries.length === 0 &&
          renderEmpty(
            '\u{1F4DD}',
            'No activity entries',
            'Moderation actions will appear here.',
          )}

        {!activityLoading && visibleEntries.length > 0 && (
          <ul className="cmcc-activity-list">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="cmcc-activity-item">
                <span className="cmcc-activity-icon">
                  {entry.action === 'approved' ? '\u{2705}' : ''}
                  {entry.action === 'rejected' || entry.action === 'trashed'
                    ? '\u{1F5D1}\u{FE0F}'
                    : ''}
                  {entry.action === 'spammed' ? '\u{1F4E5}' : ''}
                  {entry.action === 'flagged' ? '\u{1F6A9}' : ''}
                  {entry.action === 'deferred' ? '\u{23F3}' : ''}
                </span>
                <div className="cmcc-activity-body">
                  <p className="cmcc-activity-action">
                    <strong>
                      {entry.moderatorName || `Mod #${entry.moderatorId}`}
                    </strong>{' '}
                    {entry.action}{' '}
                    <em>
                      {entry.itemTitle ||
                        `${entry.contentType} #${entry.itemId}`}
                    </em>
                    {entry.previousStatus &&
                      entry.newStatus &&
                      ` (${entry.previousStatus} \u{2192} ${entry.newStatus})`}
                  </p>
                  <p className="cmcc-activity-time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Showing 50 of {filtered.length} entries
            </span>
          </div>
        )}
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className={`cmcc-wix-app cmcc-theme-${theme}`}>
      {/* Onboarding Wizard */}
      <OnboardingWizard />

      <header className="cmcc-app-header">
        <h1 className="cmcc-app-title">CMCC Content Moderation</h1>
        <div className="cmcc-app-badges">
          <button
            className="cmcc-shortcuts-btn"
            onClick={() => setShowShortcuts((p) => !p)}
            title="Keyboard shortcuts"
          >
            {'\u{2328}\u{FE0F}'}
          </button>
          <button
            className="cmcc-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </button>
          <NotificationBadge count={pendingCount} type="pending" size="sm" />
          <NotificationBadge count={spamCount} type="spam" size="sm" />
          <a
            className="cmcc-donate-link"
            href="https://rzp.io/rzp/IbvR3pMx"
            target="_blank"
            rel="noopener noreferrer"
            title="Support the creator — Donate $1"
          >
            {'\u{2764}\u{FE0F}'} Donate $1
          </a>
        </div>
      </header>

      <nav className="cmcc-tab-bar" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={'cmcc-tab-btn' + (activeTab === tab.id ? ' active' : '')}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <main className="cmcc-tab-content">
        {activeTab === 'queue' && renderQueueTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'reports' && (
          <ReportsTab
            reputationUsers={reputationUsers}
            reputationLoading={reputationLoading}
            activityFeed={activityFeed}
            feedLoading={feedLoading}
            feedError={feedError}
            onFetchActivityFeed={fetchActivityFeed}
            moderatorPerformance={analytics.moderatorPerformance || []}
            backendUrl={backendUrl}
            fetchFromAPI={fetchFromAPI}
            addToast={addToast}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            onSubmit={handleSettingsSubmit}
            isSaving={settingsSaving}
            backendUrl={backendUrl}
            fetchFromAPI={fetchFromAPI}
            addToast={addToast}
            aiConfig={aiConfig}
            onAiConfigChange={setAiConfig}
          />
        )}
      </main>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="cmcc-toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`cmcc-toast cmcc-toast-${toast.type}`}
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
            >
              <span className="cmcc-toast-icon">
                {toast.type === 'success'
                  ? '\u{2713}'
                  : toast.type === 'error'
                    ? '\u{2715}'
                    : '\u{2139}'}
              </span>
              <span className="cmcc-toast-message">{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Panel */}
      <ItemDetailPanel
        open={detailOpen}
        item={detailItem}
        history={itemHistory}
        historyLoading={historyLoading}
        notes={itemNotes}
        notesLoading={notesLoading}
        assignment={itemAssignment}
        onAddNote={handleAddNote}
        onClose={() => setDetailOpen(false)}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <div
          className="cmcc-modal-overlay"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="cmcc-shortcuts-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cmcc-shortcuts-header">
              <h2>{'\u{2328}\u{FE0F}'} Keyboard Shortcuts</h2>
              <button
                className="cmcc-modal-close"
                onClick={() => setShowShortcuts(false)}
              >
                {'\u{2715}'}
              </button>
            </div>
            <div className="cmcc-shortcuts-body">
              {KEYBOARD_SHORTCUTS.map((sk) => (
                <div key={sk.key} className="cmcc-shortcut-row">
                  <span className="cmcc-shortcut-desc">{sk.description}</span>
                  <kbd className="cmcc-shortcut-key">
                    {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
