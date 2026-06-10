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
  Tabs,
  Toast,
  Spinner,
  Banner,
  Frame,
} from '@shopify/polaris'

import OnboardingWizard from './components/OnboardingWizard'
import QueueTab from './components/QueueTab'
import AnalyticsTab from './components/AnalyticsTab'
import ActivityLogTab from './components/ActivityLogTab'
import ReportsTab from './components/ReportsTab'
import SettingsTab from './components/SettingsTab'

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
const FILTERS_STORAGE_KEY = 'cmcc-shopify-saved-filters'

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

  const [analytics, setAnalytics] = useState({
    totalModerated: 0,
    spamDetected: 0,
    approved: 0,
    pendingReview: 0,
    spamRatio: 0,
    contentBreakdown: [],
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
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light')
    } catch {
      // localStorage unavailable
    }
  }, [darkMode])

  // ── Saved filters ─────────────────────────────────────
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [filterNameInput, setFilterNameInput] = useState('')
  const [filterPopoverActive, setFilterPopoverActive] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(savedFilters))
    } catch {
      // localStorage unavailable
    }
  }, [savedFilters])

  // ── Queue filters ─────────────────────────────────────
  const [queueFilters, setQueueFilters] = useState({
    status: 'all',
    contentType: 'all',
    riskMin: '',
  })

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
      if (
        e.key === '?' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Data fetching ─────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [queueRes, analyticsRes, logRes, settingsRes, reportsRes] =
        await Promise.all([
          fetch(`${API_BASE}/queue`),
          fetch(`${API_BASE}/analytics`),
          fetch(`${API_BASE}/activity-log`),
          fetch(`${API_BASE}/settings`),
          fetch(`${API_BASE}/reports`).catch(() => null),
        ])

      if (!queueRes.ok || !analyticsRes.ok || !logRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch initial data')
      }

      const queueData = await queueRes.json()
      const analyticsData = await analyticsRes.json()
      const logData = await logRes.json()
      const settingsData = await settingsRes.json()

      setQueueItems(queueData.items || [])
      setAnalytics(analyticsData)
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

  // ── Moderation handler ────────────────────────────────
  const handleModerate = useCallback(
    async (id, action) => {
      try {
        const res = await fetch(`${API_BASE}/queue/${id}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, moderatorId: 'current-user' }),
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
    [showToast],
  )

  // ── Bulk action handler ──────────────────────────────
  const handleBulkAction = useCallback(
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

  // ── Saved filter handlers ─────────────────────────────
  function handleSaveFilter() {
    const name = filterNameInput.trim()
    if (!name) return
    const newFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters: { ...queueFilters },
    }
    setSavedFilters((prev) => [...prev, newFilter])
    setFilterNameInput('')
    setFilterPopoverActive(false)
    showToast(`Filter "${name}" saved`)
  }

  function handleApplyFilter(filter) {
    setQueueFilters(filter.filters)
    showToast(`Applied filter "${filter.name}"`)
  }

  function handleDeleteFilter(id) {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id))
  }

  // ── Derived options ───────────────────────────────────
  const contentTypeOptions = (() => {
    const types = new Set(
      queueItems.map((i) => i.contentType || i.content_type).filter(Boolean),
    )
    return [
      { label: 'All types', value: 'all' },
      ...Array.from(types).map((t) => ({ label: t, value: t })),
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
            handleSaveFilter={handleSaveFilter}
            handleApplyFilter={handleApplyFilter}
            handleDeleteFilter={handleDeleteFilter}
            filterNameInput={filterNameInput}
            setFilterNameInput={setFilterNameInput}
            filterPopoverActive={filterPopoverActive}
            setFilterPopoverActive={setFilterPopoverActive}
            aiConfig={aiConfig}
            aiEvaluatingId={aiEvaluatingId}
            aiEvaluationResult={aiEvaluationResult}
            aiEvaluationError={aiEvaluationError}
            onAiEvaluate={handleAiEvaluate}
          />
        )
      case 1:
        return <AnalyticsTab analytics={analytics} />
      case 2:
        return <ActivityLogTab activityLog={activityLog} />
      case 3:
        return <ReportsTab reports={reports} showToast={showToast} />
      case 4:
        return (
          <SettingsTab
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            saving={saving}
            onSave={() => handleSaveSettings(settingsForm)}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            savedFilters={savedFilters}
            handleDeleteFilter={handleDeleteFilter}
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
            ⌨
          </button>
        </div>
      </div>
    )
  }

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
          <div className={`cmcc-shopify-app ${darkMode ? 'cmcc-dark' : ''}`}>
            <Page
              fullWidth
              title="CMCC Content Moderation"
              secondaryActions={[
                {
                  content: '❤️ Donate $1',
                  url: 'https://rzp.io/rzp/IbvR3pMx',
                  external: true,
                },
              ]}
            >
              <Tabs
                tabs={TABS}
                selected={selectedTab}
                onSelect={setSelectedTab}
                fitted
              />
              <div className="cmcc-content">{renderContent()}</div>
            </Page>
            <OnboardingWizard />
            {renderKeyboardShortcuts()}
            {toastMarkup}
          </div>
        </Frame>
      </AppProvider>
    </AppBridgeProvider>
  )
}

export default App
