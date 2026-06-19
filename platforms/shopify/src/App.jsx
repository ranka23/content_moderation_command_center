/**
 * CMCC Shopify App - Content Moderation Command Center
 *
 * Main application component with tab-based navigation.
 * Tab content is delegated to feature-specific components.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from 'react'
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react'
import {
  AppProvider,
  Page,
  Toast,
  Spinner,
  Banner,
  Frame,
} from '@shopify/polaris'

import {
  OfflineBanner,
  NotificationBadge,
  useKeyboardShortcuts,
  useSavedFilters,
  ConfirmationModal,
} from '@cmcc/ui'
import { Keyboard, Heart, ListChecks } from 'lucide-react'

import OnboardingWizard from './components/OnboardingWizard'
import QueueTab from './components/QueueTab'
import AnalyticsTab from './components/AnalyticsTab'
import ActivityLogTab from './components/ActivityLogTab'
import ReportsTab from './components/ReportsTab'
import SettingsTab from './components/SettingsTab'

import {
  processAnalytics,
  getEmptyAnalytics,
  generateContentTypeBreakdown,
} from '@cmcc/core'

import {
  normalizeQueueItemForCore,
  normalizeEventForCore,
} from './lib/normalizers'

const API_BASE = '/api/cmcc'

const TABS = [
  { id: 'queue', content: 'Queue' },
  { id: 'analytics', content: 'Analytics' },
  { id: 'activity-log', content: 'Activity Log' },
  { id: 'reports', content: 'Reports' },
  { id: 'settings', content: 'Settings' },
]

const THEME = {
  colors: {
    primary: '#008060',
    surface: '#ffffff',
    background: '#f6f6f7',
  },
  logo: null,
}

const appBridgeConfig = {
  apiKey: new URLSearchParams(window.location.search).get('apiKey') || '',
  host: new URLSearchParams(window.location.search).get('host') || '',
  forceRedirect: true,
}

const THEME_STORAGE_KEY = 'cmcc-shopify-theme'

/** Entry point for CMCC Shopify App. */
function App() {
  // ── Core state ──────────────────────────────────────────
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastActive, setToastActive] = useState(false)
  const [toastContent, setToastContent] = useState('')
  const [toastError, setToastError] = useState(false)

  const showToast = useCallback((message, isError = false) => {
    setToastContent(message)
    setToastError(isError)
    setToastActive(true)
  }, [])

  const dismissToast = useCallback(() => {
    setToastActive(false)
  }, [])

  // ── Data state ──────────────────────────────────────────
  const [queueItems, setQueueItems] = useState([])

  const [processedAnalytics, setProcessedAnalytics] =
    useState(getEmptyAnalytics())
  const [rawEvents, setRawEvents] = useState([])
  const [moderatorNames, setModeratorNames] = useState({})

  const [activeModerator, setActiveModerator] = useState({
    id: null,
    name: null,
  })

  const [activityLog, setActivityLog] = useState([])

  const [settings, setSettings] = useState({
    autoModerate: false,
    spamThreshold: 0.8,
    notifyOnFlag: true,
    maxQueueSize: 1000,
  })
  const [settingsForm, setSettingsForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  const [reports, setReports] = useState({
    userReputation: [],
    moderatorPerformance: [],
    platformHubs: [],
  })

  // ── AI Moderation state ────────────────────────────
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

  // ── Theme ──────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    } catch {
      // localStorage unavailable
    }
  }, [theme])

  // ── Queue filters ─────────────────────────────────────
  const [queueFilters, setQueueFilters] = useState({
    status: 'all',
    contentType: 'all',
    riskMin: '',
  })

  // ── Saved filters (via @cmcc/ui hook) ──────────────────
  const { savedFilters, saveFilter, deleteSavedFilter } = useSavedFilters(
    'shopify-queue',
    {
      status: queueFilters.status,
      contentType: queueFilters.contentType,
      riskMin: queueFilters.riskMin || '',
    },
  )

  // ── Confirmation state ─────────────────────────────────
  const [confirmAction, setConfirmAction] = useState(null)

  // ── Keyboard shortcuts ────────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false)
  const shortcutBtnRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const tabIndex = parseInt(e.key, 10)
        if (tabIndex >= 1 && tabIndex <= TABS.length) {
          e.preventDefault()
          setSelectedTab(tabIndex - 1)
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Action shortcuts (via @cmcc/ui) ───────────────────
  useKeyboardShortcuts([
    {
      key: 'a',
      description: 'Approve selected item',
      handler: () => {
        if (selectedTab === 0 && queueItems.length > 0) {
          handleModerate(queueItems[0].id, 'approve')
        }
      },
    },
    {
      key: 'r',
      description: 'Reject selected item',
      handler: () => {
        if (selectedTab === 0 && queueItems.length > 0) {
          handleModerate(queueItems[0].id, 'reject')
        }
      },
    },
    {
      key: 's',
      description: 'Mark as spam',
      handler: () => {
        if (selectedTab === 0 && queueItems.length > 0) {
          handleModerate(queueItems[0].id, 'spam')
        }
      },
    },
    {
      key: 'd',
      description: 'Defer selected item',
      handler: () => {
        if (selectedTab === 0 && queueItems.length > 0) {
          handleModerate(queueItems[0].id, 'defer')
        }
      },
    },
    {
      key: 'v',
      description: 'View item details',
      handler: () => {
        if (selectedTab === 0 && queueItems.length > 0) {
          const detailsBtns = document.querySelectorAll('.cmcc-actions button')
          for (const btn of detailsBtns) {
            if (btn.textContent === 'Details') {
              btn.click()
              break
            }
          }
        }
      },
    },
    {
      key: 'f',
      description: 'Focus search',
      handler: () => {
        document.querySelector('input[type="text"]')?.focus()
      },
    },
    {
      key: 'Escape',
      description: 'Close panel / Cancel',
      handler: () => {
        if (showShortcuts) {
          setShowShortcuts(false)
        }
      },
    },
    {
      key: '?',
      description: 'Toggle keyboard shortcut help',
      handler: () => setShowShortcuts((p) => !p),
    },
  ])

  // ── Data fetching ─────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [queueRes, logRes, settingsRes, reportsRes, eventsRes] =
        await Promise.all([
          fetch(`${API_BASE}/queue`),
          fetch(`${API_BASE}/activity-log`),
          fetch(`${API_BASE}/settings`),
          fetch(`${API_BASE}/reports`).catch(() => null),
          fetch(`${API_BASE}/events`).catch(() => null),
        ])

      if (!queueRes.ok || !logRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch initial data')
      }

      const queueData = await queueRes.json()
      const logData = await logRes.json()
      const settingsData = await settingsRes.json()

      const rawQueueItems = queueData.items || []
      setQueueItems(rawQueueItems)
      setActivityLog(logData.items || logData.entries || [])
      setSettings(settingsData)
      setSettingsForm({ ...settingsData })
      if (settingsData.aiConfig) {
        setAiConfig(settingsData.aiConfig)
      }

      if (reportsRes && reportsRes.ok) {
        const reportsData = await reportsRes.json()
        setReports(reportsData.data || reportsData)
      }

      // ── Normalize and process analytics ────────────────
      // Normalize queue items to core QueueItem shape
      const normalizedQueueItems = rawQueueItems.map(normalizeQueueItemForCore)

      // Try to get events from /api/cmcc/events; fall back to activity-log
      let rawEventsData = []
      if (eventsRes && eventsRes.ok) {
        const eventsData = await eventsRes.json()
        rawEventsData =
          eventsData.data ||
          eventsData.items ||
          eventsData.events ||
          eventsData ||
          []
      } else {
        // Derive events from activity-log entries
        const logEntries = logData.items || logData.entries || []
        rawEventsData = logEntries.map((entry) => ({
          id: entry.id,
          timestamp: entry.timestamp || entry.created_at,
          content_type: entry.content_type || entry.contentType,
          action: entry.action || entry.event_action,
          item_id: entry.item_id || entry.contentId,
          author_id: entry.author_id || entry.userId,
          moderator_id: entry.moderator_id || entry.performedBy,
        }))
      }

      // Normalize events to core ModerationEvent shape
      const normalizedEvents = rawEventsData.map(normalizeEventForCore)

      // Build moderator names map from activity log and settings
      const namesMap = {}
      ;(logData.items || logData.entries || []).forEach((entry) => {
        const mid = entry.moderator_id || entry.performedBy || entry.moderatorId
        const mname = entry.moderator_name || entry.moderatorName
        if (mid && mname && !namesMap[mid]) {
          namesMap[mid] = mname
        }
      })

      // Try to get moderator info from settings
      if (settingsData.moderatorId) {
        setActiveModerator((prev) => ({
          ...prev,
          id: settingsData.moderatorId,
          name: settingsData.moderatorName || prev.name,
        }))
      }

      // Fetch current moderator info from session
      try {
        const meRes = await fetch(`${API_BASE}/me`)
        if (meRes.ok) {
          const meData = await meRes.json()
          setActiveModerator({
            id: meData.id || meData.moderatorId || meData.userId || 'unknown',
            name:
              meData.name ||
              meData.moderatorName ||
              meData.username ||
              'Unknown',
          })
        } else {
          setActiveModerator({ id: 'unknown', name: 'Unknown' })
        }
      } catch {
        setActiveModerator({ id: 'unknown', name: 'Unknown' })
      }

      setModeratorNames(namesMap)
      setRawEvents(normalizedEvents)

      // Process analytics using core function
      const processed = processAnalytics(
        normalizedEvents,
        normalizedQueueItems,
        namesMap,
      )
      setProcessedAnalytics(processed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchInitialData()
    })
  }, [fetchInitialData])

  // ── Moderation handler (with confirmation for destructive actions) ──
  const performModerate = useCallback(
    async (id, action) => {
      try {
        const res = await fetch(`${API_BASE}/queue/${id}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            moderatorId: activeModerator.id || 'unknown',
          }),
        })
        if (!res.ok) throw new Error(`Failed to ${action} item`)
        const updated = await res.json()
        setQueueItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        )
        showToast(`Item ${action}d successfully`)
      } catch (err) {
        showToast(err.message, true)
      }
    },
    [showToast, activeModerator.id],
  )

  const handleModerate = useCallback(
    async (id, action) => {
      if (['reject', 'spam', 'defer'].includes(action)) {
        setConfirmAction({ action, itemId: id })
        return
      }
      await performModerate(id, action)
    },
    [performModerate],
  )

  // ── Bulk action handler (with confirmation for destructive actions) ──
  const performBulkAction = useCallback(
    async (action, ids) => {
      try {
        const res = await fetch(`${API_BASE}/queue/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ids }),
        })
        if (!res.ok) throw new Error(`Failed to bulk ${action}`)
        // Refresh queue after bulk action
        const queueRes = await fetch(`${API_BASE}/queue`)
        if (queueRes.ok) {
          const queueData = await queueRes.json()
          setQueueItems(queueData.items || [])
        }
        showToast(`Bulk ${action} completed`)
      } catch (err) {
        showToast(err.message, true)
      }
    },
    [showToast],
  )

  const handleBulkAction = useCallback(
    async (action, ids) => {
      if (['reject', 'spam', 'defer'].includes(action)) {
        setConfirmAction({ action, ids })
        return
      }
      await performBulkAction(action, ids)
    },
    [performBulkAction],
  )

  // ── Confirm and execute ──────────────────────────────
  const confirmAndExecute = useCallback(async () => {
    if (!confirmAction) return
    if (confirmAction.itemId) {
      await performModerate(confirmAction.itemId, confirmAction.action)
    } else if (confirmAction.ids) {
      await performBulkAction(confirmAction.action, confirmAction.ids)
    }
    setConfirmAction(null)
  }, [confirmAction, performModerate, performBulkAction])

  // ── Settings handler ──────────────────────────────────
  const handleSaveSettings = useCallback(
    async (newSettings) => {
      setSaving(true)
      try {
        const payload = { ...newSettings, aiConfig }
        const res = await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to save settings')
        setSettings(newSettings)
        setSettingsForm({ ...newSettings })
        showToast('Settings saved')
      } catch (err) {
        showToast(err.message, true)
      } finally {
        setSaving(false)
      }
    },
    [showToast, aiConfig],
  )

  // ── AI Evaluate handler ─────────────────────────────
  const handleAiEvaluate = useCallback(
    async (itemId) => {
      setAiEvaluatingId(itemId)
      setAiEvaluationResult(null)
      setAiEvaluationError(null)
      try {
        const res = await fetch(`${API_BASE}/queue/${itemId}/ai-evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiConfig.engine !== 'none' ? { aiConfig } : {}),
        })
        if (!res.ok) throw new Error('AI evaluation failed')
        const data = await res.json()
        setAiEvaluationResult(data)
        showToast('AI evaluation completed')
      } catch (err) {
        setAiEvaluationError(err.message)
        showToast(err.message, true)
      }
    },
    [aiConfig, showToast],
  )

  // ── Derived options ───────────────────────────────────
  const contentTypeOptions = (() => {
    const breakdown = generateContentTypeBreakdown(
      queueItems.map(normalizeQueueItemForCore),
    )
    return [
      { label: 'All types', value: 'all' },
      ...breakdown.map((b) => ({ label: b.contentType, value: b.contentType })),
    ]
  })()

  const statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Spam', value: 'spam' },
    { label: 'Flagged', value: 'flagged' },
  ]

  // ── Tab content ───────────────────────────────────────
  function renderContent() {
    if (loading) {
      return (
        <div className="cmcc-loading">
          <Spinner accessibilityLabel="Loading" size="large" />
        </div>
      )
    }
    if (error) {
      return (
        <Banner
          title="Error loading data"
          status="critical"
          action={{ content: 'Retry', onAction: fetchInitialData }}
        >
          <p>{error}</p>
        </Banner>
      )
    }
    switch (selectedTab) {
      case 0:
        return (
          <QueueTab
            queueItems={queueItems}
            handleModerate={handleModerate}
            handleBulkAction={handleBulkAction}
            queueFilters={queueFilters}
            setQueueFilters={setQueueFilters}
            contentTypeOptions={contentTypeOptions}
            statusOptions={statusOptions}
            savedFilters={savedFilters}
            saveFilter={saveFilter}
            deleteSavedFilter={deleteSavedFilter}
            aiConfig={aiConfig}
            aiEvaluatingId={aiEvaluatingId}
            aiEvaluationResult={aiEvaluationResult}
            aiEvaluationError={aiEvaluationError}
            onAiEvaluate={handleAiEvaluate}
            moderatorId={activeModerator.id}
            moderatorName={activeModerator.name}
          />
        )
      case 1:
        return (
          <AnalyticsTab
            processedAnalytics={processedAnalytics}
            rawEvents={rawEvents}
            queueItems={queueItems.map(normalizeQueueItemForCore)}
          />
        )
      case 2:
        return (
          <ActivityLogTab
            activityLog={activityLog}
            moderatorId={activeModerator.id}
          />
        )
      case 3:
        return (
          <ReportsTab
            reports={reports}
            showToast={showToast}
            rawEvents={rawEvents}
            moderatorNames={moderatorNames}
          />
        )
      case 4:
        return (
          <SettingsTab
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            saving={saving}
            onSave={() => handleSaveSettings(settingsForm)}
            darkMode={theme === 'dark'}
            setDarkMode={(v) => setTheme(v ? 'dark' : 'light')}
            savedFilters={savedFilters}
            handleDeleteFilter={deleteSavedFilter}
            showToast={showToast}
            fetchInitialData={fetchInitialData}
            aiConfig={aiConfig}
            setAiConfig={setAiConfig}
          />
        )
      default:
        return null
    }
  }

  // ── Keyboard shortcuts popover ────────────────────────
  function renderKeyboardShortcuts() {
    const shortcutGroups = [
      {
        heading: 'Tab Navigation',
        shortcuts: TABS.map((tab, i) => ({
          key: `Ctrl+${i + 1}`,
          label: `Switch to ${tab.content}`,
        })),
      },
      {
        heading: 'Actions (Queue tab)',
        shortcuts: [
          { key: 'A', label: 'Approve selected item' },
          { key: 'R', label: 'Reject selected item' },
          { key: 'S', label: 'Mark as spam' },
          { key: 'D', label: 'Defer selected item' },
          { key: 'V', label: 'View item details' },
          { key: 'F', label: 'Focus search' },
          { key: 'Escape', label: 'Close panel / Cancel' },
        ],
      },
      {
        heading: 'General',
        shortcuts: [{ key: '?', label: 'Toggle this help panel' }],
      },
    ]

    return (
      <div className="cmcc-keyboard-shortcuts">
        <div
          className={`cmcc-shortcuts-panel-fixed ${showShortcuts ? 'cmcc-shortcuts-visible' : ''}`}
        >
          {showShortcuts && (
            <div className="cmcc-shortcuts-panel">
              <div className="cmcc-shortcuts-header">
                <h3>Keyboard Shortcuts</h3>
              </div>
              {shortcutGroups.map((group) => (
                <div key={group.heading} className="cmcc-shortcuts-group">
                  <h4 className="cmcc-shortcuts-group-heading">
                    {group.heading}
                  </h4>
                  {group.shortcuts.map((s) => (
                    <div key={s.key} className="cmcc-shortcut-row">
                      <kbd className="cmcc-shortcut-key">{s.key}</kbd>
                      <span className="cmcc-shortcut-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="cmcc-shortcuts-footer">
                Press <kbd>?</kbd> to toggle this panel at any time.
              </div>
            </div>
          )}
          <button
            ref={shortcutBtnRef}
            className="cmcc-shortcuts-btn"
            onClick={() => setShowShortcuts(!showShortcuts)}
            title="Keyboard shortcuts (?)"
            type="button"
          >
            <Keyboard size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ── Derived state ───────────────────────────────────────
  const pendingCount = queueItems.filter(
    (item) => item.status === 'pending',
  ).length

  // ── Render ─────────────────────────────────────────────
  const toastMarkup = toastActive ? (
    <Toast content={toastContent} error={toastError} onDismiss={dismissToast} />
  ) : null

  return (
    <AppBridgeProvider config={appBridgeConfig}>
      <AppProvider
        theme={THEME}
        i18n={{
          Polaris: {
            ResourceList: {
              showing: 'Showing {itemsCount} {resource}',
            },
          },
        }}
      >
        <Frame>
          <OfflineBanner />
          <div
            className={`cmcc-shopify-app ${theme === 'dark' ? 'cmcc-dark' : ''}`}
          >
            <Page
              fullWidth
              title="CMCC Content Moderation"
              secondaryActions={[
                {
                  icon: Heart,
                  content: 'Donate $1',
                  url: 'https://rzp.io/rzp/IbvR3pMx',
                  external: true,
                },
              ]}
            >
              <div className="cmcc-tab-bar">
                {TABS.map((tab, index) => {
                  const isActive = selectedTab === index
                  return (
                    <button
                      key={tab.id}
                      className={`cmcc-tab-btn${isActive ? ' cmcc-tab-btn-active' : ''}`}
                      onClick={() => setSelectedTab(index)}
                      role="tab"
                      aria-selected={isActive}
                    >
                      {tab.id === 'queue' && (
                        <ListChecks size={16} className="cmcc-tab-icon" />
                      )}
                      {tab.content}
                      {tab.id === 'queue' && pendingCount > 0 && (
                        <NotificationBadge
                          count={pendingCount}
                          type="pending"
                          size="sm"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="cmcc-content">{renderContent()}</div>
            </Page>
            <OnboardingWizard />
            {renderKeyboardShortcuts()}
            {toastMarkup}
            {confirmAction && (
              <ConfirmationModal
                open={!!confirmAction}
                title={`Confirm ${confirmAction.action}`}
                message={`Are you sure you want to ${confirmAction.action} this item?`}
                confirmLabel={
                  confirmAction.action.charAt(0).toUpperCase() +
                  confirmAction.action.slice(1)
                }
                cancelLabel="Cancel"
                onConfirm={confirmAndExecute}
                onCancel={() => setConfirmAction(null)}
              />
            )}
          </div>
        </Frame>
      </AppProvider>
    </AppBridgeProvider>
  )
}

export default App
