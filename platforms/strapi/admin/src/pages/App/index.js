/**
 * CMCC - Content Moderation Command Center
 * Strapi Admin Panel Plugin - Main App Component
 *
 * Provides a moderation dashboard with Queue, Analytics, Activity Log,
 * Reports, and Settings tabs. Uses basic React with inline styles.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { AiSettingsForm, AiEvaluationResult } from '@cmcc/ui'
import pluginId from '../../pluginId'

// ── Constants ───────────────────────────────────────────────────────────────

const API_BASE = `/api/${pluginId}`

const TABS = [
  { id: 0, label: 'Queue' },
  { id: 1, label: 'Analytics' },
  { id: 2, label: 'Activity Log' },
  { id: 3, label: 'Reports' },
  { id: 4, label: 'Settings' },
]

const SHORTCUTS = [
  { key: '?', description: 'Toggle keyboard shortcut help' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
]

const ONBOARDING_DISMISSED_KEY = 'cmcc-onboarding-dismissed'
const SAVED_FILTERS_KEY = 'cmcc-strapi-saved-filters'

const loadSavedFilters = () => {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ── Inline Styles ───────────────────────────────────────────────────────────

const styles = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#32324d',
    minHeight: '100vh',
    background: '#f6f6f9',
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #eaeaef',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: 700, margin: 0, color: '#32324d' },
  headerSubtitle: { fontSize: 14, color: '#666687', margin: '4px 0 0 0' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  tabBar: {
    display: 'flex',
    background: '#ffffff',
    borderBottom: '1px solid #eaeaef',
    padding: '0 32px',
    gap: 0,
  },
  tab: {
    padding: '12px 20px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: '#666687',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    color: '#4945ff',
    borderBottom: '2px solid #4945ff',
    fontWeight: 600,
  },
  content: { padding: 24, maxWidth: 1200, margin: '0 auto' },
  card: {
    background: '#ffffff',
    borderRadius: 8,
    border: '1px solid #eaeaef',
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #eaeaef',
    fontWeight: 600,
    color: '#666687',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f1',
    verticalAlign: 'middle',
  },
  badge: (variant) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'capitalize',
    background:
      variant === 'approved'
        ? '#e8f5e9'
        : variant === 'rejected'
          ? '#ffebee'
          : variant === 'spam'
            ? '#fff3e0'
            : variant === 'deferred'
              ? '#e3f2fd'
              : '#f5f5f5',
    color:
      variant === 'approved'
        ? '#2e7d32'
        : variant === 'rejected'
          ? '#c62828'
          : variant === 'spam'
            ? '#e65100'
            : variant === 'deferred'
              ? '#1565c0'
              : '#616161',
  }),
  button: (variant = 'primary', disabled = false) => ({
    padding: '6px 14px',
    borderRadius: 4,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    background:
      variant === 'primary'
        ? '#4945ff'
        : variant === 'success'
          ? '#2e7d32'
          : variant === 'danger'
            ? '#c62828'
            : variant === 'warning'
              ? '#e65100'
              : '#f0f0f1',
    color:
      variant === 'primary' || variant === 'success' || variant === 'danger'
        ? '#ffffff'
        : '#32324d',
    marginRight: 6,
  }),
  input: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #dcdce4',
    fontSize: 14,
    width: '100%',
    maxWidth: 400,
    boxSizing: 'border-box',
  },
  select: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #dcdce4',
    fontSize: 14,
    background: '#ffffff',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 4,
    color: '#32324d',
  },
  helpText: { fontSize: 12, color: '#666687', margin: '2px 0 8px 0' },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #ffcccc',
    borderRadius: 8,
    padding: 16,
    color: '#c62828',
    fontSize: 14,
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 80,
    flexDirection: 'column',
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #eaeaef',
    borderTop: '3px solid #4945ff',
    borderRadius: '50%',
    animation: 'cmcc-spin 0.8s linear infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: 60,
    color: '#666687',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  },
  onboardingBanner: {
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 20,
    fontSize: 13,
    color: '#3730a3',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  statCard: (bg = '#f6f6f9') => ({
    background: bg,
    borderRadius: 8,
    padding: '16px 20px',
    textAlign: 'center',
  }),
  statValue: { fontSize: 28, fontWeight: 700, margin: 0, color: '#32324d' },
  statLabel: {
    fontSize: 12,
    color: '#666687',
    margin: '4px 0 0 0',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  feedItem: {
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f1',
    fontSize: 13,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailPanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 420,
    height: '100vh',
    background: '#ffffff',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 999,
    overflowY: 'auto',
    padding: 24,
  },
  searchRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: '20px 0 12px 0',
    color: '#32324d',
  },
}

// ── Helper: API Fetch ───────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  }
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }
  const res = await fetch(url, config)
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`
    try {
      const errorData = await res.json()
      if (errorData?.error?.message) errorMsg = errorData.error.message
    } catch {
      // Ignore parse errors from error responses
    }
    throw new Error(errorMsg)
  }
  return res.json()
}

function formatDate(iso) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function getStatusVariant(status) {
  switch (status) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'spam':
      return 'spam'
    case 'deferred':
      return 'deferred'
    default:
      return 'pending'
  }
}

// ── Spinner Component ───────────────────────────────────────────────────────

const Spinner = () => (
  <div style={styles.loaderContainer}>
    <div style={styles.spinner} />
    <span style={{ color: '#666687', fontSize: 14 }}>Loading...</span>
  </div>
)

// ── Empty State Component ────────────────────────────────────────────────────

const EmptyState = ({ message = 'No items to display' }) => (
  <div style={styles.emptyState}>
    <p style={{ fontSize: 16, margin: 0 }}>{message}</p>
  </div>
)

// ── Error State Component ────────────────────────────────────────────────────

const ErrorState = ({
  message = 'An error occurred while fetching data',
  onRetry,
}) => (
  <div style={styles.errorBox}>
    <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Error</p>
    <p style={{ margin: '0 0 12px 0' }}>{message}</p>
    {onRetry && (
      <button style={styles.button('primary')} onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
)

// ── Main App Component ──────────────────────────────────────────────────────

const App = () => {
  // ── Tab & General State ──────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_DISMISSED_KEY),
  )

  // ── Queue State ──────────────────────────────────────────────────────
  const [queueItems, setQueueItems] = useState([])
  const [queuePagination, setQueuePagination] = useState(null)
  const [queueTotal, setQueueTotal] = useState(0)
  const [isQueueLoading, setIsQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [queuePage, setQueuePage] = useState(1)
  const [detailItem, setDetailItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [itemNotes, setItemNotes] = useState([])
  const [isNotesLoading, setIsNotesLoading] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('normal')
  const [savedFilters, setSavedFilters] = useState(loadSavedFilters)

  // ── Analytics State ──────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(null)

  // ── Activity Log State ───────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState([])
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [logError, setLogError] = useState(null)
  const [logPage, setLogPage] = useState(1)
  const [logPagination, setLogPagination] = useState(null)

  // ── Settings State ───────────────────────────────────────────────────
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState({})
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState(null)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // ── AI Evaluation State ──────────────────────────────────────────────
  const [aiEvalResults, setAiEvalResults] = useState({})
  const [aiEvalLoading, setAiEvalLoading] = useState(null)
  const [aiConfig, setAiConfig] = useState({
    engine: 'none',
    apiKey: '',
    model: 'gpt-4o-mini',
    autoModerate: false,
    spamThreshold: 0.7,
    enableLanguageDetection: false,
    enableSentimentAnalysis: false,
  })

  // ── Reports State ────────────────────────────────────────────────────
  const [reputationUsers, setReputationUsers] = useState([])
  const [isReputationLoading, setIsReputationLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)
  const [platformStatus, setPlatformStatus] = useState([])
  const [isPlatformLoading, setIsPlatformLoading] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [reportDays, setReportDays] = useState(30)
  const [isRetentionPurging, setIsRetentionPurging] = useState(false)

  // ── Keyboard Shortcut Handler ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts((p) => !p)
      }
      if (e.key === 'Escape') {
        setDetailItem(null)
        setShowShortcuts(false)
      }
      if (
        e.key === 'f' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.target.closest('input,textarea')
      ) {
        e.preventDefault()
        const el = document.querySelector('[data-search-input]')
        el?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Inject spinner keyframes into document head ────────────────────
  useEffect(() => {
    const styleId = 'cmcc-spinner-keyframes'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent =
        '@keyframes cmcc-spin { to { transform: rotate(360deg); } }'
      document.head.appendChild(style)
    }
    return () => {
      const existing = document.getElementById(styleId)
      if (existing) existing.remove()
    }
  }, [])

  // ── API Fetch Functions ─────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (page = 1) => {
      setIsQueueLoading(true)
      setQueueError(null)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
        })
        if (filterStatus) params.append('status', filterStatus)
        if (searchQuery) params.append('search', searchQuery)
        const data = await apiFetch(`/queue?${params.toString()}`)
        const items = data?.data || data?.results || []
        setQueueItems(items)
        const pag = data?.pagination
        if (pag) {
          setQueuePagination(pag)
          setQueueTotal(pag.total || items.length)
        } else {
          setQueueTotal(items.length)
        }
        setQueuePage(page)
      } catch (err) {
        setQueueError(err.message)
      } finally {
        setIsQueueLoading(false)
      }
    },
    [filterStatus, searchQuery],
  )

  const fetchAnalyticsData = useCallback(async () => {
    setIsAnalyticsLoading(true)
    setAnalyticsError(null)
    try {
      const data = await apiFetch('/analytics')
      setAnalyticsData(data?.data || data)
    } catch (err) {
      setAnalyticsError(err.message)
    } finally {
      setIsAnalyticsLoading(false)
    }
  }, [])

  const fetchActivityLogData = useCallback(async (page = 1) => {
    setIsLogLoading(true)
    setLogError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      const data = await apiFetch(`/activity-log?${params.toString()}`)
      const items = data?.data || data?.results || []
      setActivityLog(items)
      setLogPagination(data?.pagination || null)
      setLogPage(page)
    } catch (err) {
      setLogError(err.message)
    } finally {
      setIsLogLoading(false)
    }
  }, [])

  const fetchSettingsData = useCallback(async () => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      const data = await apiFetch('/settings')
      const s = data?.data || data
      setSettings(s)
      setSettingsForm(s || {})
    } catch (err) {
      setSettingsError(err.message)
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const fetchReputation = useCallback(async () => {
    setIsReputationLoading(true)
    try {
      const data = await apiFetch('/reputation/users')
      setReputationUsers(data?.data || data || [])
    } catch {
      setReputationUsers([])
    } finally {
      setIsReputationLoading(false)
    }
  }, [])

  const fetchActivityFeed = useCallback(async () => {
    setIsFeedLoading(true)
    setFeedError(null)
    try {
      const data = await apiFetch('/activity-feed')
      setActivityFeed(data?.data || data || [])
    } catch (err) {
      setFeedError(err.message)
    } finally {
      setIsFeedLoading(false)
    }
  }, [])

  const fetchPlatformStatus = useCallback(async () => {
    setIsPlatformLoading(true)
    try {
      const data = await apiFetch('/platforms/status')
      setPlatformStatus(data?.data || data || [])
    } catch {
      setPlatformStatus([])
    } finally {
      setIsPlatformLoading(false)
    }
  }, [])

  const fetchItemHistory = useCallback(async (itemId) => {
    setIsHistoryLoading(true)
    try {
      const data = await apiFetch(`/queue/${itemId}/history`)
      setItemHistory(data?.data || data || [])
    } catch {
      setItemHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const fetchItemNotes = useCallback(async (itemId) => {
    setIsNotesLoading(true)
    try {
      const data = await apiFetch(`/queue/${itemId}/notes`)
      setItemNotes(data?.data || data || [])
    } catch {
      setItemNotes([])
    } finally {
      setIsNotesLoading(false)
    }
  }, [])

  // ── Initial Load ────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setInitialLoading(true)
      try {
        await Promise.all([
          fetchQueue(1),
          fetchAnalyticsData(),
          fetchActivityLogData(1),
          fetchSettingsData(),
        ])
      } catch {
        // Individual errors handled per-fetch
      } finally {
        setInitialLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Tab Change Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (initialLoading) return
    switch (currentTab) {
      case 0:
        fetchQueue(queuePage)
        break
      case 1:
        fetchAnalyticsData()
        break
      case 2:
        fetchActivityLogData(logPage)
        break
      case 3:
        fetchReputation()
        fetchActivityFeed()
        fetchPlatformStatus()
        break
      case 4:
        fetchSettingsData()
        break
    }
  }, [currentTab])

  // ── Handlers ────────────────────────────────────────────────────────

  const handleModerate = async (itemId, action) => {
    try {
      await apiFetch(`/queue/${itemId}/moderate`, {
        method: 'POST',
        body: { action },
      })
      fetchQueue(queuePage)
    } catch (err) {
      alert(`Failed to moderate item: ${err.message}`)
    }
  }

  const handleEvaluate = async (itemId) => {
    setAiEvalLoading(itemId)
    try {
      const data = await apiFetch(`/queue/${itemId}/evaluate`, {
        method: 'POST',
      })
      const result = data.data || data
      setAiEvalResults((prev) => ({
        ...prev,
        [itemId]: result,
      }))
    } catch (err) {
      alert(`AI evaluation failed: ${err.message}`)
    } finally {
      setAiEvalLoading(null)
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return
    try {
      await apiFetch('/queue/bulk', {
        method: 'POST',
        body: { ids: selectedIds, action },
      })
      setSelectedIds([])
      fetchQueue(queuePage)
    } catch (err) {
      alert(`Bulk action failed: ${err.message}`)
    }
  }

  const handleSettingsSave = async () => {
    setSettingsSaved(false)
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: settingsForm,
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
      fetchSettingsData()
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`)
    }
  }

  const handleSettingsExport = async () => {
    try {
      const data = await apiFetch('/settings/export', { method: 'POST' })
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-settings-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Failed to export settings: ${err.message}`)
    }
  }

  const handleSettingsImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        await apiFetch('/settings/import', {
          method: 'POST',
          body: { settings: parsed },
        })
        fetchSettingsData()
        alert('Settings imported successfully')
      } catch (err) {
        alert(`Import failed: ${err.message}`)
      }
    }
    input.click()
  }

  /** Handle AI config changes — AiSettingsForm manages model defaults */
  const handleAiConfigChange = useCallback((newConfig) => {
    setAiConfig(newConfig)
  }, [])

  const handleComplianceAudit = async () => {
    setIsAuditLoading(true)
    try {
      const data = await apiFetch('/reports/compliance-audit', {
        method: 'POST',
        body: { days: reportDays },
      })
      setAuditResult(data?.data || data)
    } catch (err) {
      alert(`Compliance audit failed: ${err.message}`)
    } finally {
      setIsAuditLoading(false)
    }
  }

  const handleExportModerationActivity = async () => {
    try {
      const data = await apiFetch('/reports/moderation-activity', {
        method: 'POST',
        body: { days: reportDays, format: 'csv' },
      })
      const blob = new Blob([data?.data || data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moderation-activity-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    }
  }

  const handleAddNote = async (itemId) => {
    if (!noteContent.trim()) return
    try {
      await apiFetch(`/queue/${itemId}/notes`, {
        method: 'POST',
        body: { content: noteContent, is_internal: false, type: 'comment' },
      })
      setNoteContent('')
      fetchItemNotes(itemId)
    } catch (err) {
      alert(`Failed to add note: ${err.message}`)
    }
  }

  const handleAssignItem = async (itemId) => {
    try {
      await apiFetch(`/queue/${itemId}/assign`, {
        method: 'POST',
        body: { assignee: assigneeId, due_date: dueDate, priority },
      })
      alert('Item assigned successfully')
      setDetailItem(null)
    } catch (err) {
      alert(`Failed to assign item: ${err.message}`)
    }
  }

  const handleViewDetail = async (itemId) => {
    const item = queueItems.find((i) => i.id === itemId)
    if (!item) return
    setDetailItem(item)
    fetchItemHistory(itemId)
    fetchItemNotes(itemId)
  }

  const handleRetentionPurge = async () => {
    if (
      !window.confirm(
        'Are you sure you want to purge aged items? This action cannot be undone.',
      )
    )
      return
    setIsRetentionPurging(true)
    try {
      await apiFetch('/retention/purge', { method: 'POST' })
      alert('Retention purge completed')
    } catch (err) {
      alert(`Purge failed: ${err.message}`)
    } finally {
      setIsRetentionPurging(false)
    }
  }

  const dismissOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === queueItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(queueItems.map((i) => i.id))
    }
  }

  // ── Saved Filter Handlers ────────────────────────────────────────────
  const handleSaveFilter = (name) => {
    const newFilter = { name, filters: { statusFilter, searchQuery } }
    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
  }

  const handleRemoveFilter = (name) => {
    const updated = savedFilters.filter((f) => f.name !== name)
    setSavedFilters(updated)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
  }

  const handleApplyFilter = (filterObj) => {
    setFilterStatus(filterObj.filters.statusFilter || '')
    setSearchQuery(filterObj.filters.searchQuery || '')
    setQueuePage(1)
    fetchQueue(1)
  }

  // ── Render: Queue Tab ────────────────────────────────────────────────

  const renderQueueTab = () => {
    if (isQueueLoading && queueItems.length === 0) return <Spinner />
    if (queueError)
      return <ErrorState message={queueError} onRetry={() => fetchQueue(1)} />

    return (
      <div>
        {/* Search & Filters */}
        <div style={styles.searchRow}>
          <input
            data-search-input
            style={{ ...styles.input, maxWidth: 280 }}
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQueue(1)}
          />
          <select
            style={styles.select}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              fetchQueue(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="spam">Spam</option>
            <option value="deferred">Deferred</option>
          </select>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <span style={{ fontSize: 13, color: '#666687', marginLeft: 8 }}>
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {/* Save Filter */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <input
            id="cmcc-save-filter-input"
            style={{ ...styles.input, maxWidth: 180, fontSize: 13 }}
            type="text"
            placeholder="Name this filter..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleSaveFilter(e.target.value.trim())
                e.target.value = ''
              }
            }}
          />
          <button
            style={styles.button('primary')}
            onClick={() => {
              const inp = document.getElementById('cmcc-save-filter-input')
              if (inp && inp.value.trim()) {
                handleSaveFilter(inp.value.trim())
                inp.value = ''
              }
            }}
          >
            + Save Filter
          </button>
        </div>

        {/* Saved Filter Tags */}
        {savedFilters.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            {savedFilters.map((sf) => (
              <span
                key={sf.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  background: '#eaeaef',
                  color: '#32324d',
                  cursor: 'pointer',
                  border: '1px solid #dcdce4',
                }}
                onClick={() => handleApplyFilter(sf)}
                title={`Status: ${sf.filters.statusFilter || 'Any'} \u00b7 Search: ${sf.filters.searchQuery || 'None'}`}
              >
                {sf.name}
                <span
                  style={{
                    cursor: 'pointer',
                    marginLeft: 2,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#666687',
                    lineHeight: 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFilter(sf.name)
                  }}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bulk Actions:</span>
            <button
              style={styles.button('success')}
              onClick={() => handleBulkAction('approve')}
            >
              Approve Selected
            </button>
            <button
              style={styles.button('danger')}
              onClick={() => handleBulkAction('reject')}
            >
              Reject Selected
            </button>
            <button
              style={styles.button('warning')}
              onClick={() => handleBulkAction('spam')}
            >
              Mark as Spam
            </button>
          </div>
        )}

        {/* Queue Table */}
        {queueItems.length === 0 ? (
          <EmptyState message="The moderation queue is empty" />
        ) : (
          <>
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === queueItems.length &&
                          queueItems.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Content</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, color: '#666687' }}>
                          #{item.id}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div>
                          <span
                            style={{ cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => handleViewDetail(item.id)}
                          >
                            {item.title || item.content || `Item #${item.id}`}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, color: '#666687' }}>
                          {item.contentType || item.type || '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={styles.badge(getStatusVariant(item.status))}
                        >
                          {item.status || 'pending'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, color: '#666687' }}>
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            style={styles.button('success')}
                            onClick={() => handleModerate(item.id, 'approve')}
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            style={styles.button('danger')}
                            onClick={() => handleModerate(item.id, 'reject')}
                            title="Reject"
                          >
                            ✗
                          </button>
                          <button
                            style={styles.button('warning')}
                            onClick={() => handleModerate(item.id, 'spam')}
                            title="Mark as Spam"
                          >
                            !
                          </button>
                          <button
                            style={styles.button('default')}
                            onClick={() => handleViewDetail(item.id)}
                            title="View Details"
                          >
                            ⋮
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {queuePagination && (
              <div style={styles.pagination}>
                <button
                  style={styles.button('default')}
                  disabled={queuePage <= 1}
                  onClick={() => fetchQueue(queuePage - 1)}
                >
                  ← Prev
                </button>
                <span>
                  Page {queuePagination.page || queuePage} of{' '}
                  {queuePagination.pageCount || 1} ({queueTotal} total)
                </span>
                <button
                  style={styles.button('default')}
                  disabled={queuePage >= (queuePagination.pageCount || 1)}
                  onClick={() => fetchQueue(queuePage + 1)}
                >
                  Next →
                </button>
              </div>
            )}

            {isQueueLoading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 8,
                  fontSize: 13,
                  color: '#666687',
                }}
              >
                Refreshing...
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Render: Analytics Tab ─────────────────────────────────────────────

  const renderAnalyticsTab = () => {
    if (isAnalyticsLoading && !analyticsData) return <Spinner />
    if (analyticsError)
      return (
        <ErrorState message={analyticsError} onRetry={fetchAnalyticsData} />
      )
    if (!analyticsData)
      return <EmptyState message="No analytics data available" />

    const data = analyticsData?.data || analyticsData
    const statusCounts = data?.statusCounts || []
    const totalItems = data?.totalItems || 0
    const pendingCount =
      statusCounts.find((s) => s.status === 'pending')?.count || 0
    const approvedCount =
      statusCounts.find((s) => s.status === 'approved')?.count || 0
    const rejectedCount =
      statusCounts.find((s) => s.status === 'rejected')?.count || 0
    const spamCount = statusCounts.find((s) => s.status === 'spam')?.count || 0

    return (
      <div>
        {/* Summary Cards */}
        <div style={{ ...styles.grid3, marginBottom: 20 }}>
          <div style={styles.statCard('#eef2ff')}>
            <p style={styles.statValue}>{totalItems}</p>
            <p style={styles.statLabel}>Total Items</p>
          </div>
          <div style={styles.statCard('#fff7ed')}>
            <p style={styles.statValue}>{pendingCount}</p>
            <p style={styles.statLabel}>Pending</p>
          </div>
          <div style={styles.statCard('#f0fdf4')}>
            <p style={styles.statValue}>{approvedCount}</p>
            <p style={styles.statLabel}>Approved</p>
          </div>
          <div style={styles.statCard('#fef2f2')}>
            <p style={styles.statValue}>{rejectedCount}</p>
            <p style={styles.statLabel}>Rejected</p>
          </div>
          <div style={styles.statCard('#fff7ed')}>
            <p style={styles.statValue}>{spamCount}</p>
            <p style={styles.statLabel}>Spam</p>
          </div>
          <div style={styles.statCard('#f6f6f9')}>
            <p style={styles.statValue}>
              {totalItems > 0
                ? Math.round((approvedCount / totalItems) * 100)
                : 0}
              %
            </p>
            <p style={styles.statLabel}>Approval Rate</p>
          </div>
        </div>

        {/* Status Breakdown Table */}
        {statusCounts.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Status Breakdown</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Count</th>
                  <th style={styles.th}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {statusCounts.map((s) => (
                  <tr key={s.status}>
                    <td style={styles.td}>
                      <span style={styles.badge(getStatusVariant(s.status))}>
                        {s.status}
                      </span>
                    </td>
                    <td style={styles.td}>{s.count}</td>
                    <td style={styles.td}>
                      {totalItems > 0
                        ? `${Math.round((s.count / totalItems) * 100)}%`
                        : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Activity */}
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Recent Activity</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Moderator</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.slice(0, 10).map((act) => (
                  <tr key={act.id}>
                    <td style={styles.td}>
                      <span style={styles.badge(getStatusVariant(act.action))}>
                        {act.action}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {act.moderatorId || act.moderator || '-'}
                    </td>
                    <td style={styles.td}>{formatDate(act.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Render: Activity Log Tab ──────────────────────────────────────────

  const renderActivityLogTab = () => {
    if (isLogLoading && activityLog.length === 0) return <Spinner />
    if (logError)
      return (
        <ErrorState
          message={logError}
          onRetry={() => fetchActivityLogData(1)}
        />
      )

    return (
      <div>
        {activityLog.length === 0 ? (
          <EmptyState message="No activity log entries" />
        ) : (
          <>
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Content Type</th>
                    <th style={styles.th}>Moderator</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLog.map((entry) => (
                    <tr key={entry.id}>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, color: '#666687' }}>
                          #{entry.id}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={styles.badge(getStatusVariant(entry.action))}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {entry.contentType || entry.type || '-'}
                      </td>
                      <td style={styles.td}>
                        {entry.moderatorId || entry.moderator || '-'}
                      </td>
                      <td style={styles.td}>{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logPagination && (
              <div style={styles.pagination}>
                <button
                  style={styles.button('default')}
                  disabled={logPage <= 1}
                  onClick={() => fetchActivityLogData(logPage - 1)}
                >
                  ← Prev
                </button>
                <span>
                  Page {logPagination.page || logPage} of{' '}
                  {logPagination.pageCount || 1}
                </span>
                <button
                  style={styles.button('default')}
                  disabled={logPage >= (logPagination.pageCount || 1)}
                  onClick={() => fetchActivityLogData(logPage + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Render: Reports Tab ───────────────────────────────────────────────

  const renderReportsTab = () => (
    <div>
      {/* Export & Compliance */}
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Moderation Reports</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Date Range (days)</label>
            <input
              type="number"
              style={{ ...styles.input, maxWidth: 120 }}
              value={reportDays}
              min={1}
              max={365}
              onChange={(e) => setReportDays(Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={styles.button('primary')}
              onClick={handleExportModerationActivity}
            >
              Export Moderation Activity (CSV)
            </button>
            <button
              style={styles.button('warning')}
              onClick={handleComplianceAudit}
              disabled={isAuditLoading}
            >
              {isAuditLoading ? 'Running Audit...' : 'Run Compliance Audit'}
            </button>
          </div>

          {auditResult && (
            <div
              style={{
                marginTop: 16,
                background: '#f6f6f9',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>
                Audit Results
              </h4>
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(auditResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Settings Management</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={styles.button('primary')}
              onClick={handleSettingsExport}
            >
              Export Settings
            </button>
            <button
              style={styles.button('default')}
              onClick={handleSettingsImport}
            >
              Import Settings
            </button>
          </div>
        </div>
      </div>

      {/* Platform Status */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Platform Status</h3>
        {isPlatformLoading ? (
          <Spinner />
        ) : platformStatus.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666687' }}>
            No platform status data available.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Platform</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {platformStatus.map((p, idx) => (
                <tr key={p.name || idx}>
                  <td style={styles.td}>{p.name || p.platform || 'Unknown'}</td>
                  <td style={styles.td}>
                    <span
                      style={styles.badge(
                        p.connected ? 'approved' : 'rejected',
                      )}
                    >
                      {p.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity Feed */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Activity Feed</h3>
        {isFeedLoading ? (
          <Spinner />
        ) : feedError ? (
          <ErrorState message={feedError} onRetry={fetchActivityFeed} />
        ) : activityFeed.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666687' }}>No recent activity.</p>
        ) : (
          <div>
            {activityFeed.slice(0, 20).map((feed, idx) => (
              <div key={feed.id || idx} style={styles.feedItem}>
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {feed.action || feed.message}
                  </span>
                  {feed.contentType && (
                    <span style={{ color: '#666687', marginLeft: 4 }}>
                      on {feed.contentType}
                    </span>
                  )}
                </div>
                <span style={{ color: '#666687', fontSize: 12 }}>
                  {formatDate(feed.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Reputation */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>User Reputation</h3>
        {isReputationLoading ? (
          <Spinner />
        ) : reputationUsers.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666687' }}>
            No reputation data available.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Reputation</th>
                <th style={styles.th}>Flagged</th>
              </tr>
            </thead>
            <tbody>
              {reputationUsers.slice(0, 20).map((user) => (
                <tr key={user.id || user.userId}>
                  <td style={styles.td}>
                    {user.name ||
                      user.username ||
                      user.email ||
                      `User #${user.id}`}
                  </td>
                  <td style={styles.td}>
                    {user.reputation ?? user.score ?? '-'}
                  </td>
                  <td style={styles.td}>
                    {user.flaggedCount ?? user.flags ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Retention */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Data Retention</h3>
        <p style={{ fontSize: 13, color: '#666687', marginBottom: 12 }}>
          Purge aged items from the moderation queue based on retention policy.
        </p>
        <button
          style={{
            ...styles.button('danger'),
            ...(isRetentionPurging ? { opacity: 0.5 } : {}),
          }}
          onClick={handleRetentionPurge}
          disabled={isRetentionPurging}
        >
          {isRetentionPurging ? 'Purging...' : 'Purge Aged Items'}
        </button>
      </div>
    </div>
  )

  // ── Render: Settings Tab ─────────────────────────────────────────────

  const renderSettingsTab = () => {
    if (isSettingsLoading && !settings) return <Spinner />
    if (settingsError)
      return <ErrorState message={settingsError} onRetry={fetchSettingsData} />
    if (!settings) return <EmptyState message="No settings available" />

    return (
      <div style={{ maxWidth: 640 }}>
        {/* Settings saved notification */}
        {settingsSaved && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              color: '#166534',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Settings saved successfully
          </div>
        )}

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Moderation Settings</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Auto Moderate</label>
            <select
              style={styles.select}
              value={settingsForm.autoModerate ? 'true' : 'false'}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  autoModerate: e.target.value === 'true',
                })
              }
            >
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
            <p style={styles.helpText}>
              Automatically moderate content based on defined rules.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Moderation Behavior</label>
            <select
              style={styles.select}
              value={settingsForm.moderationBehavior || 'flag'}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  moderationBehavior: e.target.value,
                })
              }
            >
              <option value="flag">Flag for review</option>
              <option value="auto-reject">Auto reject</option>
              <option value="auto-approve">Auto approve</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Maximum Links</label>
            <input
              type="number"
              style={styles.input}
              value={settingsForm.maxLinks ?? 5}
              min={0}
              max={50}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  maxLinks: Number(e.target.value),
                })
              }
            />
            <p style={styles.helpText}>
              Maximum number of links allowed per post before flagging.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Duplicate Detection</label>
            <select
              style={styles.select}
              value={settingsForm.duplicateDetection ? 'true' : 'false'}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  duplicateDetection: e.target.value === 'true',
                })
              }
            >
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Notify on Spam</label>
            <select
              style={styles.select}
              value={settingsForm.notifyOnSpam ? 'true' : 'false'}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  notifyOnSpam: e.target.value === 'true',
                })
              }
            >
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Blacklisted Keywords</label>
            <input
              type="text"
              style={styles.input}
              value={settingsForm.blacklistedKeywords || ''}
              placeholder="Comma-separated keywords"
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  blacklistedKeywords: e.target.value,
                })
              }
            />
            <p style={styles.helpText}>
              Comma-separated list of keywords to automatically flag.
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              style={styles.button('primary')}
              onClick={handleSettingsSave}
            >
              Save Settings
            </button>
            <button
              style={{ ...styles.button('default'), marginLeft: 8 }}
              onClick={fetchSettingsData}
            >
              Reset
            </button>
          </div>
        </div>

        {/* AI Moderation Settings */}
        <div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={styles.cardTitle}>AI Moderation</h3>
          <AiSettingsForm config={aiConfig} onChange={handleAiConfigChange} />
        </div>
      </div>
    )
  }

  // ── Render: Detail Panel ─────────────────────────────────────────────

  const renderDetailPanel = () => {
    if (!detailItem) return null
    return (
      <div style={styles.detailPanel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Item Details
          </h2>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#666687',
            }}
            onClick={() => setDetailItem(null)}
          >
            ✕
          </button>
        </div>

        {/* Item Info */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>ID:</strong> #{detailItem.id}
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Content:</strong>{' '}
            {detailItem.title || detailItem.content || 'N/A'}
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Type:</strong>{' '}
            {detailItem.contentType || detailItem.type || 'N/A'}
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Status:</strong>{' '}
            <span style={styles.badge(getStatusVariant(detailItem.status))}>
              {detailItem.status || 'pending'}
            </span>
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Created:</strong> {formatDate(detailItem.createdAt)}
          </p>
        </div>

        {/* Moderation Actions */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <button
            style={styles.button('success')}
            onClick={() => handleModerate(detailItem.id, 'approve')}
          >
            Approve
          </button>
          <button
            style={styles.button('danger')}
            onClick={() => handleModerate(detailItem.id, 'reject')}
          >
            Reject
          </button>
          <button
            style={styles.button('warning')}
            onClick={() => handleModerate(detailItem.id, 'spam')}
          >
            Mark as Spam
          </button>
        </div>

        {/* AI Evaluation */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>
            AI Evaluation
          </h4>
          {aiEvalLoading === detailItem.id ? (
            <AiEvaluationResult isLoading={true} />
          ) : aiEvalResults[detailItem.id] ? (
            <AiEvaluationResult
              result={aiEvalResults[detailItem.id]}
              onReEvaluate={() => handleEvaluate(detailItem.id)}
            />
          ) : (
            <button
              style={styles.button('primary')}
              onClick={() => handleEvaluate(detailItem.id)}
            >
              Evaluate with AI
            </button>
          )}
        </div>

        {/* History */}
        <h4 style={{ margin: '16px 0 8px 0', fontSize: 14, fontWeight: 600 }}>
          History
        </h4>
        {isHistoryLoading ? (
          <p style={{ fontSize: 13, color: '#666687' }}>Loading...</p>
        ) : itemHistory.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666687' }}>
            No history available.
          </p>
        ) : (
          <div>
            {itemHistory.slice(0, 10).map((h, idx) => (
              <div key={h.id || idx} style={styles.feedItem}>
                <span style={{ fontWeight: 500 }}>{h.action}</span>
                <span style={{ fontSize: 12, color: '#666687' }}>
                  {formatDate(h.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <h4 style={{ margin: '16px 0 8px 0', fontSize: 14, fontWeight: 600 }}>
          Notes
        </h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            style={{ ...styles.input, maxWidth: 280 }}
            value={noteContent}
            placeholder="Add a note..."
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote(detailItem.id)}
          />
          <button
            style={styles.button('primary')}
            onClick={() => handleAddNote(detailItem.id)}
          >
            Add
          </button>
        </div>
        {isNotesLoading ? (
          <p style={{ fontSize: 13, color: '#666687' }}>Loading...</p>
        ) : itemNotes.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666687' }}>No notes.</p>
        ) : (
          <div>
            {itemNotes.slice(0, 5).map((n, idx) => (
              <div key={n.id || idx} style={styles.feedItem}>
                <div>
                  <p style={{ margin: 0, fontSize: 13 }}>{n.content}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#666687' }}>
                    {n.type} {n.is_internal ? '(internal)' : ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: '#666687' }}>
                  {formatDate(n.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Assignment */}
        <h4 style={{ margin: '16px 0 8px 0', fontSize: 14, fontWeight: 600 }}>
          Assignment
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            style={styles.input}
            value={assigneeId}
            placeholder="Assignee ID"
            onChange={(e) => setAssigneeId(e.target.value)}
          />
          <input
            type="date"
            style={styles.input}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <select
            style={styles.select}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            style={styles.button('primary')}
            onClick={() => handleAssignItem(detailItem.id)}
          >
            Assign
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Keyboard Shortcuts Modal ─────────────────────────────────

  const renderShortcutsModal = () => {
    if (!showShortcuts) return null
    return (
      <div style={styles.modalOverlay} onClick={() => setShowShortcuts(false)}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              Keyboard Shortcuts
            </h2>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#666687',
              }}
              onClick={() => setShowShortcuts(false)}
            >
              ✕
            </button>
          </div>
          <table style={{ ...styles.table, maxWidth: 400 }}>
            <thead>
              <tr>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key}>
                  <td style={styles.td}>
                    <kbd
                      style={{
                        background: '#f0f0f1',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        border: '1px solid #dcdce4',
                      }}
                    >
                      {s.key}
                    </kbd>
                  </td>
                  <td style={styles.td}>{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Render: Tab Content ─────────────────────────────────────────────

  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return renderQueueTab()
      case 1:
        return renderAnalyticsTab()
      case 2:
        return renderActivityLogTab()
      case 3:
        return renderReportsTab()
      case 4:
        return renderSettingsTab()
      default:
        return null
    }
  }

  // ── Main Render ─────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Inject spinner keyframes */}
      {/* Inject spinner keyframes — injected via useEffect in the App component */}

      {/* Detail Panel Overlay */}
      {renderDetailPanel()}

      {/* Keyboard Shortcuts Modal */}
      {renderShortcutsModal()}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>CMCC</h1>
          <p style={styles.headerSubtitle}>Content Moderation Command Center</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.button('default'), fontSize: 12 }}
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts"
          >
            ⌨ Shortcuts
          </button>
          {currentTab === 3 && (
            <button
              style={styles.button('danger')}
              onClick={handleRetentionPurge}
              disabled={isRetentionPurging}
            >
              {isRetentionPurging ? '...' : 'Purge'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(currentTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setCurrentTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {/* Onboarding Banner */}
        {showOnboarding && (
          <div style={styles.onboardingBanner}>
            <span>
              🚀 Welcome to CMCC! Use the tabs above to moderate content, view
              analytics, track activity, generate reports, and configure
              settings. Press{' '}
              <kbd
                style={{
                  background: '#c7d2fe',
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                ?
              </kbd>{' '}
              for keyboard shortcuts.
            </span>
            <button
              style={{
                background: '#4945ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
              onClick={dismissOnboarding}
            >
              Got it
            </button>
          </div>
        )}

        {/* Initial Loading */}
        {initialLoading ? <Spinner /> : renderTabContent()}
      </div>
    </div>
  )
}

export default App
