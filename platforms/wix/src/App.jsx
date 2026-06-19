import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from 'react'
import {
  NotificationBadge,
  useKeyboardShortcuts,
  useSavedFilters,
} from '@cmcc/ui'
import {
  processAnalytics,
  getEmptyAnalytics,
  getQueueBadgeCount,
} from '@cmcc/core'
import { OfflineBanner } from '@cmcc/ui'
import { useToast } from './hooks/useToast'
import {
  BarChart3,
  CheckCircle,
  FileText,
  Heart,
  History,
  Info,
  Keyboard,
  ListChecks,
  Moon,
  Settings,
  Sun,
  XCircle,
} from 'lucide-react'
import { OnboardingWizard } from './components/OnboardingWizard'
import { ItemDetailPanel } from './components/ItemDetailPanel'
import { ReportsTab } from './components/ReportsTab'
import { SettingsTab } from './components/SettingsTab'
import { QueueTab } from './components/QueueTab'
import { AnalyticsTab } from './components/AnalyticsTab'
import { ActivityTab } from './components/ActivityTab'

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
  { id: 'queue', label: 'Queue', icon: <ListChecks size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
  { id: 'activity', label: 'Activity Log', icon: <History size={16} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
]

const POLL_INTERVAL_MS = 30000

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
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  })

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
  const { toasts, setToasts, addToast } = useToast()

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
        key: 'a',
        description: 'Approve selected item',
        handler: () => {
          if (queueItems.length > 0) {
            const itemId = queueItems[0]._id || queueItems[0].id
            handleQueueItemAction('approve', itemId)
          }
        },
      },
      {
        key: 'r',
        description: 'Reject selected item',
        handler: () => {
          if (queueItems.length > 0) {
            const itemId = queueItems[0]._id || queueItems[0].id
            handleQueueItemAction('reject', itemId)
          }
        },
      },
      {
        key: 's',
        description: 'Mark as Spam',
        handler: () => {
          if (queueItems.length > 0) {
            const itemId = queueItems[0]._id || queueItems[0].id
            handleQueueItemAction('spam', itemId)
          }
        },
      },
      {
        key: 'd',
        description: 'Defer selected item',
        handler: () => {
          if (queueItems.length > 0) {
            const itemId = queueItems[0]._id || queueItems[0].id
            handleQueueItemAction('defer', itemId)
          }
        },
      },
      {
        key: 'v',
        description: 'View item details',
        handler: () => {
          if (queueItems.length > 0) {
            handleViewItem(queueItems[0])
          }
        },
      },
      {
        key: 'f',
        description: 'Focus search',
        handler: () => {
          const searchInput = document.querySelector('input[type="text"]')
          searchInput?.focus()
        },
      },
      {
        key: 'Escape',
        description: 'Close panel / Cancel',
        handler: () => {
          if (showShortcuts) setShowShortcuts(false)
          if (detailOpen) setDetailOpen(false)
        },
      },
      {
        key: '?',
        description: 'Toggle keyboard shortcut help',
        handler: () => setShowShortcuts((p) => !p),
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
      setPage(1)
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
      setPage(1)
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
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className={`cmcc-wix-app cmcc-theme-${theme}`}>
      {/* Onboarding Wizard */}
      <OnboardingWizard />

      <OfflineBanner />

      <header className="cmcc-app-header">
        <h1 className="cmcc-app-title">CMCC Content Moderation</h1>
        <div className="cmcc-app-badges">
          <button
            className="cmcc-shortcuts-btn"
            onClick={() => setShowShortcuts((p) => !p)}
            title="Keyboard shortcuts"
          >
            <Keyboard size={18} />
          </button>
          <button
            className="cmcc-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
            <Heart size={14} style={{ display: 'inline' }} /> Donate $1
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
        {activeTab === 'queue' && (
          <QueueTab
            queueItems={queueItems}
            queueLoading={queueLoading}
            queueError={queueError}
            onRetry={fetchQueue}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            page={page}
            setPage={setPage}
            perPage={perPage}
            activeQuickPreset={activeQuickPreset}
            setActiveQuickPreset={setActiveQuickPreset}
            savedFilters={savedFilters}
            saveFilter={saveFilter}
            onBulkAction={handleQueueBulkAction}
            onItemAction={handleQueueItemAction}
            onViewItem={handleViewItem}
            onAiEvaluate={handleAiEvaluate}
            aiConfig={aiConfig}
            aiEvaluatingId={aiEvaluatingId}
            aiEvaluationResult={aiEvaluationResult}
            aiEvaluationError={aiEvaluationError}
            evaluatedItemId={evaluatedItemId}
            addToast={addToast}
            filters={filters}
            onFilterChange={(newFilters) =>
              setFilters((prev) => ({ ...prev, ...newFilters }))
            }
            showShortcuts={showShortcuts}
            setShowShortcuts={setShowShortcuts}
            onPerPageChange={setPerPage}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
            onRetry={fetchAnalytics}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            activityEntries={activityEntries}
            activityLoading={activityLoading}
            activityError={activityError}
            activityFilters={activityFilters}
            setActivityFilters={setActivityFilters}
            onRetry={fetchActivity}
          />
        )}
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
                {toast.type === 'success' ? (
                  <CheckCircle size={16} />
                ) : toast.type === 'error' ? (
                  <XCircle size={16} />
                ) : (
                  <Info size={16} />
                )}
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
              <h2>
                <Keyboard size={20} /> Keyboard Shortcuts
              </h2>
              <button
                className="cmcc-modal-close"
                onClick={() => setShowShortcuts(false)}
              >
                <XCircle size={18} />
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
