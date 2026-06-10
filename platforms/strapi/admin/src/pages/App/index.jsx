/**
 * CMCC - Content Moderation Command Center
 * Strapi Admin Panel
 *
 * Complete admin interface with Queue, Analytics, Activity Log,
 * Reports, and Settings tabs. Uses @strapi/design-system for
 * native Strapi look and feel.
 *
 * Features implemented:
 *  - Queue moderation with filters, pagination, search
 *  - Analytics dashboard with heatmap, stats, charts
 *  - Activity log with filterable audit trail
 *  - Reports & Compliance (moderation export, compliance audit,
 *    user reputation, moderator performance, activity feed,
 *    scheduled reports, multi-platform hub)
 *  - Collaboration (notes, item assignment)
 *  - Settings with all WordPress-equivalent sections
 *  - Dark mode toggle (persisted)
 *  - Keyboard shortcuts (via @cmcc/ui hook)
 *  - Saved filters for queue
 *  - Bulk action confirmation modal + progress indicator
 *  - Detail slide-out panel with history, notes, assignment
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  TabGroup,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Typography,
  Button,
  Flex,
  Grid,
  GridItem,
  Divider,
  Status,
  Loader,
  EmptyStateLayout,
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  Badge,
  IconButton,
  Tooltip,
} from '@strapi/design-system'
// Strapi 5: @strapi/helper-plugin is removed
// useFetchClient → @strapi/strapi/admin
// useNotification → @strapi/strapi/admin (returns { toggleNotification } now, message is a string, type 'warning' → 'danger')
// useOverlayBlocker → removed, no replacement
import { useFetchClient, useNotification } from '@strapi/strapi/admin'
import {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActivityFeed,
  useKeyboardShortcuts,
  useSavedFilters,
  SkeletonTable,
  SkeletonCard,
  EmptyState,
  ProgressBar,
  ModerationNotes,
  AiSettingsForm,
  AiEvaluationResult,
} from '@cmcc/ui'
import { getEmptyAnalytics } from '@cmcc/core'
import pluginId from '../../pluginId'
import { Illo } from '@strapi/icons'

// ── Theme Storage Key ─────────────────────────────────────────────────
const THEME_STORAGE_KEY = 'cmcc-strapi-theme'

// ── Tab Definitions ───────────────────────────────────────────────────
const TABS = [
  { id: 0, label: 'Queue' },
  { id: 1, label: 'Analytics' },
  { id: 2, label: 'Activity Log' },
  { id: 3, label: 'Reports' },
  { id: 4, label: 'Settings' },
]

// ── Keyboard Shortcuts ────────────────────────────────────────────────
const SHORTCUTS = [
  { key: '?', description: 'Toggle keyboard shortcut help' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
]

// ── Bulk Actions that need special handling ──────────────────────────
const BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION = ['deactivate-users']

// =====================================================================
// App Component
// =====================================================================
const App = () => {
  // ── Plugin Client & Notifications ──────────────────────────────────
  const { get, post, put } = useFetchClient()
  // Strapi 5: useNotification returns an object, not a function
  const { toggleNotification } = useNotification()

  // ── Tab & Loading State ────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // ── Queue State ────────────────────────────────────────────────────
  const [queueItems, setQueueItems] = useState([])
  const [queuePagination, setQueuePagination] = useState(null)
  const [queueTotal, setQueueTotal] = useState(0)
  const [isQueueLoading, setIsQueueLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField] = useState('createdAt')
  const [sortDirection] = useState('desc')

  // ── Analytics State ────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [analyticsDateRange] = useState(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    return { from, to: now }
  })

  // ── Activity Log State ─────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState([])
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [logPagination, setLogPagination] = useState(null)

  // ── Settings State ─────────────────────────────────────────────────
  const [, setSettings] = useState(null)
  const [settingsSections, setSettingsSections] = useState([])
  const [settingsInitialValues, setSettingsInitialValues] = useState({})

  // ── Theme State (Section 7) ────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light'
  })

  // ── Detail Panel State ─────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // ── Bulk Action Confirmation ──────────────────────────────────────
  const [confirmBulkAction, setConfirmBulkAction] = useState(null)

  // ── Bulk Progress ──────────────────────────────────────────────────
  const [bulkProgress] = useState({
    active: false,
    current: 0,
    total: 0,
  })

  // ── Keyboard Shortcuts Modal ──────────────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ── Reports State ──────────────────────────────────────────────────
  const [reputationUsers, setReputationUsers] = useState([])
  const [isReputationLoading, setIsReputationLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)
  const [, setPlatformStatus] = useState([])

  // ── Collaboration: Notes ───────────────────────────────────────────
  const [itemNotes, setItemNotes] = useState([])
  const [isNotesLoading, setIsNotesLoading] = useState(false)

  // ── AI Evaluation State ──────────────────────────────────────────────
  const [aiEvalResults, setAiEvalResults] = useState({})
  const [aiEvalLoading, setAiEvalLoading] = useState(null)
  const [aiConfig, setAiConfig] = useState({
    engine: 'none',
    apiKey: '',
    model: '',
    autoModerate: false,
    spamThreshold: 0.7,
    enableLanguageDetection: false,
    enableSentimentAnalysis: false,
  })

  /** Handle AI config changes — AiSettingsForm manages model defaults */
  const handleAiConfigChange = useCallback((newConfig) => {
    setAiConfig(newConfig)
  }, [])

  // ── Saved Filters ──────────────────────────────────────────────────
  const { savedFilters, saveFilter } = useSavedFilters('strapi-queue', {
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  })

  // ── Keyboard Shortcuts Hook ────────────────────────────────────────
  useKeyboardShortcuts(
    [
      {
        key: '?',
        description: 'Toggle keyboard shortcut help',
        handler: () => setShowShortcuts((p) => !p),
      },
      {
        key: 'Escape',
        description: 'Close panel / Cancel',
        handler: () => {
          setDetailItem(null)
          setShowShortcuts(false)
        },
      },
      {
        key: 'f',
        description: 'Focus search',
        handler: () => {
          const el = document.querySelector('input[type="text"]')
          el?.focus()
        },
      },
    ].filter(Boolean),
  )

  // ── Apply Theme ────────────────────────────────────────────────────
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('cmcc-dark')
      document.body.classList.add('cmcc-dark-mode')
    } else {
      document.documentElement.classList.remove('cmcc-dark')
      document.body.classList.remove('cmcc-dark-mode')
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  // ── Data Fetching ──────────────────────────────────────────────────

  /** Fetch queue items with pagination, filters, and search */
  const fetchQueue = useCallback(
    async (page = 1) => {
      setIsQueueLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
        })
        if (filterStatus) params.append('status', filterStatus)
        if (searchQuery) params.append('search', searchQuery)
        params.append('sort', `${sortField}:${sortDirection}`)

        const res = await get(`/${pluginId}/queue?${params.toString()}`)
        const data = res.data
        setQueueItems(data?.data || data?.results || [])
        const pag = data?.pagination
        if (pag) {
          setQueuePagination(pag)
          setQueueTotal(pag.total || 0)
        }
      } catch {
        toggleNotification({
          type: 'danger',
          message: 'Failed to fetch queue',
        })
      } finally {
        setIsQueueLoading(false)
      }
    },
    [
      get,
      filterStatus,
      searchQuery,
      sortField,
      sortDirection,
      toggleNotification,
    ],
  )

  /** Fetch analytics data for the selected date range */
  const fetchAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true)
    try {
      const params = new URLSearchParams()
      if (analyticsDateRange?.from)
        params.append('startDate', analyticsDateRange.from.toISOString())
      if (analyticsDateRange?.to)
        params.append('endDate', analyticsDateRange.to.toISOString())

      const res = await get(`/${pluginId}/analytics?${params.toString()}`)
      setAnalyticsData(res.data?.data || res.data)
    } catch {
      setAnalyticsData(getEmptyAnalytics())
    } finally {
      setIsAnalyticsLoading(false)
    }
  }, [get, analyticsDateRange])

  /** Fetch activity log */
  const fetchActivityLog = useCallback(
    async (page = 1) => {
      setIsLogLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
        })
        const res = await get(`/${pluginId}/activity-log?${params.toString()}`)
        const data = res.data
        setActivityLog(data?.data || data?.results || [])
        if (data?.pagination) setLogPagination(data.pagination)
      } catch {
        setActivityLog([])
      } finally {
        setIsLogLoading(false)
      }
    },
    [get],
  )

  /** Fetch settings and build form sections */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await get(`/${pluginId}/settings`)
      const data = res.data?.data || res.data || {}
      setSettings(data)

      // Build settings sections matching WordPress reference
      const sections = []
      const initialValues = {}

      // General section
      sections.push({
        id: 'general',
        title: 'General',
        fields: [
          {
            name: 'autoModerate',
            label: 'Auto Moderate',
            type: 'toggle',
            helpText: 'Automatically moderate items based on firewall rules',
          },
          {
            name: 'moderationBehavior',
            label: 'Moderation Behavior',
            type: 'select',
            options: [
              { value: 'flag', label: 'Flag for review' },
              { value: 'spam', label: 'Mark as spam' },
              { value: 'discard', label: 'Discard silently' },
            ],
          },
        ],
      })
      Object.assign(initialValues, data)

      // Spam Firewall section
      sections.push({
        id: 'spam_firewall',
        title: 'Spam Firewall',
        fields: [
          {
            name: 'maxLinks',
            label: 'Max Links Allowed',
            type: 'number',
            helpText: 'Maximum number of links before content is flagged',
          },
          {
            name: 'blacklistedKeywords',
            label: 'Blacklisted Keywords',
            type: 'textarea',
            placeholder: 'One keyword per line',
          },
          {
            name: 'duplicateDetection',
            label: 'Enable Duplicate Detection',
            type: 'toggle',
          },
          {
            name: 'notifyOnSpam',
            label: 'Notify on Spam Detection',
            type: 'toggle',
          },
        ],
      })
      Object.assign(initialValues, data)

      // Notifications section
      sections.push({
        id: 'notifications',
        title: 'Notifications',
        fields: [
          {
            name: 'emailAlerts',
            label: 'Email Alerts',
            type: 'toggle',
            helpText: 'Send email notifications when alerts are triggered',
          },
          {
            name: 'alertThreshold',
            label: 'Alert Threshold',
            type: 'number',
            helpText: 'Number of flagged items before an alert is sent',
          },
        ],
      })

      // Appearance section
      sections.push({
        id: 'appearance',
        title: 'Appearance & Display',
        fields: [
          {
            name: 'theme',
            label: 'Theme',
            type: 'select',
            options: [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ],
          },
          { name: 'itemsPerPage', label: 'Items Per Page', type: 'number' },
        ],
      })

      // Integrations section
      sections.push({
        id: 'integrations',
        title: 'Integrations',
        fields: [
          {
            name: 'autoImportComments',
            label: 'Auto-Import Comments',
            type: 'toggle',
          },
          {
            name: 'autoImportPosts',
            label: 'Auto-Import Posts',
            type: 'toggle',
          },
          {
            name: 'webhookUrl',
            label: 'Webhook URL',
            type: 'text',
            placeholder: 'https://hooks.zapier.com/...',
          },
        ],
      })

      // Data Retention section
      sections.push({
        id: 'data_retention',
        title: 'Data Retention',
        fields: [
          {
            name: 'activityLogRetentionDays',
            label: 'Activity Log Retention (Days)',
            type: 'number',
          },
          {
            name: 'autoPurgeSchedule',
            label: 'Auto-Purge Schedule',
            type: 'select',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'none', label: 'Disabled' },
            ],
          },
        ],
      })

      // Backup section
      sections.push({
        id: 'backup_restore',
        title: 'Backup & Restore',
        fields: [
          {
            name: 'scheduledBackups',
            label: 'Scheduled Backups',
            type: 'select',
            options: [
              { value: 'none', label: 'None' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ],
          },
        ],
      })

      setSettingsSections(sections)
      setSettingsInitialValues(initialValues)
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to load settings',
      })
    }
  }, [get, toggleNotification])

  /** Fetch user reputation */
  const fetchUserReputation = useCallback(async () => {
    setIsReputationLoading(true)
    try {
      const res = await get(`/${pluginId}/reputation/users`)
      setReputationUsers(res.data?.data || res.data?.users || [])
    } catch {
      setReputationUsers([])
    } finally {
      setIsReputationLoading(false)
    }
  }, [get])

  /** Fetch activity feed */
  const fetchActivityFeedData = useCallback(async () => {
    setIsFeedLoading(true)
    setFeedError(null)
    try {
      const res = await get(`/${pluginId}/activity-feed?limit=20`)
      setActivityFeed(res.data?.data || res.data?.events || [])
    } catch {
      setFeedError('Failed to load activity feed')
    } finally {
      setIsFeedLoading(false)
    }
  }, [get])

  /** Fetch platform status */
  const fetchPlatformStatus = useCallback(async () => {
    try {
      const res = await get(`/${pluginId}/platforms/status`)
      const data = res.data?.data || res.data?.platforms || []
      setPlatformStatus(Array.isArray(data) ? data : data?.platforms || [])
    } catch {
      setPlatformStatus([])
    }
  }, [get])

  /** Fetch item history for the detail panel */
  const fetchItemHistory = useCallback(
    async (itemId) => {
      setIsHistoryLoading(true)
      try {
        const res = await get(`/${pluginId}/queue/${itemId}/history`)
        setItemHistory(res.data?.data || res.data?.items || [])
      } catch {
        setItemHistory([])
      } finally {
        setIsHistoryLoading(false)
      }
    },
    [get],
  )

  /** Fetch notes for an item */
  const fetchItemNotes = useCallback(
    async (itemId) => {
      setIsNotesLoading(true)
      try {
        const res = await get(`/${pluginId}/queue/${itemId}/notes`)
        setItemNotes(res.data?.data || res.data?.notes || [])
      } catch {
        setItemNotes([])
      } finally {
        setIsNotesLoading(false)
      }
    },
    [get],
  )

  // ── Initial Data Load ──────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchQueue(1),
          fetchAnalytics(),
          fetchActivityLog(1),
          fetchSettings(),
        ])
      } catch {
        // Silently handle initial load errors
      } finally {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Tab Change Effect ──────────────────────────────────────────────
  useEffect(() => {
    if (!initialLoadDone) return
    const timer = setTimeout(() => {
      switch (currentTab) {
        case 0:
          fetchQueue(1)
          break
        case 1:
          fetchAnalytics()
          break
        case 2:
          fetchActivityLog(1)
          break
        case 3:
          fetchAnalytics()
          fetchUserReputation()
          fetchActivityFeedData()
          fetchPlatformStatus()
          break
        case 4:
          fetchSettings()
          break
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [
    currentTab,
    initialLoadDone,
    fetchQueue,
    fetchAnalytics,
    fetchActivityLog,
    fetchSettings,
    fetchUserReputation,
    fetchActivityFeedData,
    fetchPlatformStatus,
  ])

  // ── Handlers ───────────────────────────────────────────────────────

  /** Moderate a single queue item */
  const handleModerate = async (action, itemId) => {
    try {
      await post(`/${pluginId}/queue/${itemId}/moderate`, { action })
      toggleNotification({
        type: 'success',
        message: 'Item moderated successfully',
      })
      fetchQueue()
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to moderate item',
      })
    }
  }

  /** Handle bulk action */
  const handleBulkAction = async (action, ids) => {
    try {
      if (BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION.includes(action)) {
        await post(`/${pluginId}/users/deactivate`, { ids })
      }
      await post(`/${pluginId}/queue/bulk`, { itemIds: ids, action })
      toggleNotification({
        type: 'success',
        message: 'Bulk action completed',
      })
      setSelectedIds([])
      fetchQueue()
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Bulk action failed',
      })
    }
  }

  /** Confirm and execute bulk action */
  const handleBulkActionWithConfirm = (actionType, ids) => {
    setConfirmBulkAction({ action: actionType, ids })
  }

  /** Handle settings save */
  const handleSettingsSave = async (formData) => {
    try {
      await put(`/${pluginId}/settings`, formData)
      toggleNotification({
        type: 'success',
        message: 'Settings saved successfully',
      })
      fetchSettings()
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to save settings',
      })
    }
  }

  /** Handle settings export */
  const handleSettingsExport = async () => {
    try {
      const res = await post(`/${pluginId}/settings/export`)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-settings-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toggleNotification({
        type: 'success',
        message: 'Settings exported',
      })
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to export settings',
      })
    }
  }

  /** Handle settings import */
  const handleSettingsImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      await post(`/${pluginId}/settings/import`, {
        settings: parsed.data || parsed,
      })
      toggleNotification({
        type: 'success',
        message: 'Settings imported. Reloading...',
      })
      setTimeout(() => fetchSettings(), 1000)
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to import settings',
      })
    }
    event.target.value = ''
  }

  /** Handle item selection for detail panel */
  const handleReadItem = useCallback(
    (item) => {
      const itemId = item.id || item.originalId
      setDetailItem(item)
      fetchItemHistory(itemId)
      fetchItemNotes(itemId)
    },
    [fetchItemHistory, fetchItemNotes],
  )

  /** Handle search */
  const handleSearch = (query) => {
    setSearchQuery(query)
    fetchQueue(1)
  }

  /** Handle filter change */
  const handleFilterChange = (status) => {
    setFilterStatus(status)
    fetchQueue(1)
  }

  /** Handle adding a note */
  const handleAddNote = useCallback(
    async (content, isInternal, type) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        const res = await post(`/${pluginId}/queue/${itemId}/notes`, {
          content,
          isInternal,
          type: type || 'general',
        })
        if (res.data?.data || res.data?.note) {
          setItemNotes((prev) => [res.data.data || res.data.note, ...prev])
          toggleNotification({
            type: 'success',
            message: 'Note added',
          })
        }
      } catch {
        toggleNotification({
          type: 'danger',
          message: 'Failed to add note',
        })
      }
    },
    [detailItem, post, toggleNotification],
  )

  /** Handle item assignment */
  const handleAssignItem = useCallback(
    async (assignee, dueDate, priority) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        await post(`/${pluginId}/queue/${itemId}/assign`, {
          assigneeId: assignee,
          dueDate,
          priority: priority || 'normal',
        })
        toggleNotification({
          type: 'success',
          message: 'Item assigned successfully',
        })
      } catch {
        toggleNotification({
          type: 'danger',
          message: 'Failed to assign item',
        })
      }
    },
    [detailItem, post, toggleNotification],
  )

  /** Handle AI evaluation */
  const handleEvaluate = useCallback(
    async (itemId) => {
      setAiEvalLoading(itemId)
      try {
        const res = await post(`/${pluginId}/queue/${itemId}/evaluate`)
        const result = res.data
        setAiEvalResults((prev) => ({
          ...prev,
          [itemId]: result?.data || result,
        }))
        toggleNotification({
          type: 'success',
          message: 'AI evaluation complete',
        })
      } catch {
        toggleNotification({ type: 'danger', message: 'AI evaluation failed' })
      } finally {
        setAiEvalLoading(null)
      }
    },
    [post, toggleNotification],
  )

  // ── Derived State ─────────────────────────────────────────────────
  const queueStats = useMemo(() => {
    const stats = { pending: 0, spam: 0, flagged: 0, total: queueItems.length }
    for (const item of queueItems) {
      if (item.status === 'pending') stats.pending++
      else if (item.status === 'spam') stats.spam++
      else if (item.status === 'flagged') stats.flagged++
    }
    return stats
  }, [queueItems])

  // ── Settings validators ────────────────────────────────────────────
  const settingsValidators = useMemo(() => {
    const validators = {}
    for (const section of settingsSections) {
      for (const field of section.fields) {
        if (field.type === 'number') {
          validators[field.name] = (value) => {
            if (value === '' || value === null || value === undefined)
              return 'This field is required'
            if (isNaN(Number(value))) return 'Must be a valid number'
            if (Number(value) < 0) return 'Must be a positive number'
            return null
          }
        } else if (field.required) {
          validators[field.name] = (value) => {
            if (!value || (typeof value === 'string' && value.trim() === ''))
              return 'This field is required'
            return null
          }
        }
      }
    }
    return validators
  }, [settingsSections])

  // ── Initial Loading State ──────────────────────────────────────────
  if (loading && !initialLoadDone) {
    return (
      <Layout>
        <ContentLayout>
          <Flex justifyContent="center" alignItems="center" height="40vh">
            <Loader>Loading CMCC moderation panel...</Loader>
          </Flex>
        </ContentLayout>
      </Layout>
    )
  }

  // =====================================================================
  // Render
  // =====================================================================
  return (
    <div className={`cmcc-strapi-app cmcc-theme-${theme}`}>
      <Layout>
        <HeaderLayout
          title={
            <Flex gap={2}>
              <span role="img" aria-label="shield">
                🛡️
              </span>
              <span>CMCC</span>
            </Flex>
          }
          subtitle="Content Moderation Command Center"
          navigationAction={
            <Flex gap={2}>
              <Tooltip
                description={
                  theme === 'light'
                    ? 'Switch to dark mode'
                    : 'Switch to light mode'
                }
              >
                <IconButton
                  onClick={toggleTheme}
                  label="Toggle theme"
                  icon={
                    theme === 'light' ? (
                      <span role="img" aria-label="moon">
                        🌙
                      </span>
                    ) : (
                      <span role="img" aria-label="sun">
                        ☀️
                      </span>
                    )
                  }
                />
              </Tooltip>
              <Tooltip description="Keyboard shortcuts">
                <IconButton
                  onClick={() => setShowShortcuts((p) => !p)}
                  label="Keyboard shortcuts"
                  icon={
                    <span role="img" aria-label="keyboard">
                      ⌨️
                    </span>
                  }
                />
              </Tooltip>
              <Tooltip description="Support the creator — Donate $1">
                <a
                  className="cmcc-donate-link"
                  href="https://rzp.io/rzp/IbvR3pMx"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  ❤️ Donate $1
                </a>
              </Tooltip>
            </Flex>
          }
          primaryAction={
            currentTab === 0 && selectedIds.length > 0 ? (
              <Flex gap={2}>
                <Button
                  variant="success"
                  size="S"
                  onClick={() =>
                    handleBulkActionWithConfirm('approve', selectedIds)
                  }
                >
                  Approve ({selectedIds.length})
                </Button>
                <Button
                  variant="danger"
                  size="S"
                  onClick={() =>
                    handleBulkActionWithConfirm('reject', selectedIds)
                  }
                >
                  Reject ({selectedIds.length})
                </Button>
                <Button
                  variant="warning"
                  size="S"
                  onClick={() =>
                    handleBulkActionWithConfirm('spam', selectedIds)
                  }
                >
                  Spam ({selectedIds.length})
                </Button>
              </Flex>
            ) : undefined
          }
        />

        {/* ── Bulk Action Progress ───────────────────────────────────── */}
        {bulkProgress.active && (
          <Box padding={4}>
            <ProgressBar
              value={bulkProgress.current}
              max={bulkProgress.total}
              label={`Applying bulk action... (${bulkProgress.current}/${bulkProgress.total})`}
              variant={
                bulkProgress.current === bulkProgress.total ? 'success' : 'info'
              }
              showPercentage
            />
          </Box>
        )}

        <ContentLayout>
          <TabGroup
            label="CMCC Tabs"
            variant="simple"
            onTabChange={(index) => setCurrentTab(index)}
            selectedTabIndex={currentTab}
          >
            <Tabs>
              {TABS.map((tab) => (
                <Tab key={tab.id} testId={`${tab.label.toLowerCase()}-tab`}>
                  {tab.id === 0 && '📋 '}
                  {tab.id === 1 && '📊 '}
                  {tab.id === 2 && '📜 '}
                  {tab.id === 3 && '📄 '}
                  {tab.id === 4 && '⚙️ '}
                  {tab.label}
                </Tab>
              ))}
            </Tabs>
            <Divider />

            <TabPanels>
              {/* ════════════════════════════════════════════════════════
                  QUEUE TAB
                  ════════════════════════════════════════════════════════ */}
              <TabPanel>
                <Box paddingTop={4}>
                  {/* Saved Filters + Shortcuts */}
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    paddingBottom={4}
                  >
                    <Flex gap={2}>
                      {savedFilters.length > 0 && (
                        <select
                          className="cmcc-saved-filter-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              const found = savedFilters.find(
                                (f) => f.name === e.target.value,
                              )
                              if (found && found.filters?.status) {
                                handleFilterChange(found.filters.status)
                              }
                            }
                          }}
                          defaultValue=""
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        >
                          <option value="">Saved Filters...</option>
                          {savedFilters.map((sf) => (
                            <option key={sf.name} value={sf.name}>
                              {sf.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        className="cmcc-save-filter-input"
                        placeholder="Name this filter..."
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          width: 160,
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            saveFilter(e.target.value.trim(), {
                              status: filterStatus,
                              search: searchQuery,
                            })
                            toggleNotification({
                              type: 'success',
                              message: 'Filter saved',
                            })
                            e.target.value = ''
                          }
                        }}
                      />
                    </Flex>
                  </Flex>

                  {isQueueLoading && queueItems.length === 0 ? (
                    <SkeletonTable rows={5} columns={6} />
                  ) : queueItems.length === 0 ? (
                    <EmptyStateLayout
                      icon={<Illo />}
                      content="The moderation queue is empty"
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => fetchQueue(1)}
                        >
                          Refresh
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <QueueTable
                        items={queueItems}
                        loading={isQueueLoading}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onModerate={(id, action) => handleModerate(action, id)}
                        onBulkAction={handleBulkActionWithConfirm}
                        onSearch={handleSearch}
                        onFilterChange={handleFilterChange}
                        currentFilter={filterStatus}
                        searchQuery={searchQuery}
                        pagination={queuePagination}
                        onReadItem={handleReadItem}
                        totalCount={queueTotal}
                        page={queuePagination?.page || 1}
                        onPageChange={(p) => fetchQueue(p)}
                      />

                      {/* Detail Slide-Out Panel */}
                      {detailItem && (
                        <ModalLayout
                          onClose={() => setDetailItem(null)}
                          labelledBy="detail-modal-title"
                        >
                          <ModalHeader>
                            <Typography
                              fontWeight="bold"
                              id="detail-modal-title"
                              textColor="neutral800"
                            >
                              {detailItem.title || 'Item Details'}
                            </Typography>
                          </ModalHeader>
                          <ModalBody>
                            <Flex gap={2} paddingBottom={4}>
                              <Badge>{detailItem.status || 'pending'}</Badge>
                              <Badge>
                                {detailItem.contentType ||
                                  detailItem.content_type ||
                                  'content'}
                              </Badge>
                            </Flex>
                            <Box paddingBottom={3}>
                              <Typography variant="pi">
                                <strong>Author:</strong>{' '}
                                {detailItem.authorName ||
                                  detailItem.authorId ||
                                  'Unknown'}
                              </Typography>
                            </Box>
                            <Box paddingBottom={3}>
                              <Typography variant="pi">
                                <strong>Date:</strong>{' '}
                                {detailItem.dateGmt
                                  ? new Date(
                                      detailItem.dateGmt,
                                    ).toLocaleString()
                                  : 'N/A'}
                              </Typography>
                            </Box>
                            <Box paddingBottom={3}>
                              <Typography variant="pi">
                                <strong>Spam Score:</strong>{' '}
                                {typeof detailItem.spamScore === 'number'
                                  ? `${(detailItem.spamScore * 100).toFixed(0)}%`
                                  : 'N/A'}
                              </Typography>
                            </Box>
                            {detailItem.excerpt && (
                              <Box paddingBottom={4}>
                                <Typography
                                  variant="delta"
                                  as="h4"
                                  paddingBottom={2}
                                >
                                  Content
                                </Typography>
                                <Box
                                  background="neutral100"
                                  padding={3}
                                  hasRadius
                                >
                                  <Typography variant="pi">
                                    {detailItem.excerpt}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {/* Quick Actions */}
                            <Flex gap={2} paddingBottom={4}>
                              {detailItem.status !== 'approved' && (
                                <Button
                                  variant="success"
                                  size="S"
                                  onClick={() => {
                                    handleModerate(
                                      'approve',
                                      detailItem.id || detailItem.originalId,
                                    )
                                    setDetailItem(null)
                                  }}
                                >
                                  ✅ Approve
                                </Button>
                              )}
                              {detailItem.status !== 'rejected' && (
                                <Button
                                  variant="danger"
                                  size="S"
                                  onClick={() => {
                                    handleModerate(
                                      'reject',
                                      detailItem.id || detailItem.originalId,
                                    )
                                    setDetailItem(null)
                                  }}
                                >
                                  ❌ Reject
                                </Button>
                              )}
                              <Button
                                variant="warning"
                                size="S"
                                onClick={() => {
                                  handleModerate(
                                    'spam',
                                    detailItem.id || detailItem.originalId,
                                  )
                                  setDetailItem(null)
                                }}
                              >
                                🚫 Spam
                              </Button>
                            </Flex>

                            {/* AI Evaluation */}
                            <Box paddingBottom={4}>
                              <Typography
                                variant="delta"
                                as="h4"
                                paddingBottom={2}
                              >
                                🤖 AI Evaluation
                              </Typography>
                              {aiEvalLoading ===
                              (detailItem.id || detailItem.originalId) ? (
                                <AiEvaluationResult isLoading={true} />
                              ) : aiEvalResults[
                                  detailItem.id || detailItem.originalId
                                ] ? (
                                <AiEvaluationResult
                                  result={
                                    aiEvalResults[
                                      detailItem.id || detailItem.originalId
                                    ]
                                  }
                                  onReEvaluate={() =>
                                    handleEvaluate(
                                      detailItem.id || detailItem.originalId,
                                    )
                                  }
                                />
                              ) : (
                                <Button
                                  variant="tertiary"
                                  size="S"
                                  onClick={() =>
                                    handleEvaluate(
                                      detailItem.id || detailItem.originalId,
                                    )
                                  }
                                >
                                  🧠 Evaluate with AI
                                </Button>
                              )}
                            </Box>

                            {/* Assignment */}
                            <Box paddingBottom={4}>
                              <Typography
                                variant="delta"
                                as="h4"
                                paddingBottom={2}
                              >
                                📋 Assignment
                              </Typography>
                              <Flex gap={2} alignItems="end">
                                <TextInput
                                  placeholder="Assign to (moderator name)"
                                  name="assignee"
                                  aria-label="Assignee"
                                  size="S"
                                />
                                <Button
                                  size="S"
                                  onClick={() => {
                                    const input =
                                      document.querySelector(
                                        '[name="assignee"]',
                                      )
                                    handleAssignItem(
                                      input?.value || '',
                                      '',
                                      'normal',
                                    )
                                    if (input) input.value = ''
                                  }}
                                >
                                  Assign
                                </Button>
                              </Flex>
                            </Box>

                            {/* History Timeline */}
                            <Box paddingBottom={4}>
                              <Typography
                                variant="delta"
                                as="h4"
                                paddingBottom={2}
                              >
                                📜 History
                              </Typography>
                              {isHistoryLoading ? (
                                <Typography variant="pi" textColor="neutral500">
                                  Loading history...
                                </Typography>
                              ) : itemHistory.length === 0 ? (
                                <Typography variant="pi" textColor="neutral500">
                                  No history recorded yet
                                </Typography>
                              ) : (
                                <div className="cmcc-timeline-list">
                                  {itemHistory.map((entry) => (
                                    <Flex
                                      key={entry.id}
                                      gap={3}
                                      paddingBottom={2}
                                    >
                                      <Status
                                        variant={
                                          entry.action === 'approved'
                                            ? 'success'
                                            : entry.action === 'rejected'
                                              ? 'danger'
                                              : 'warning'
                                        }
                                        showBullet={false}
                                        size="S"
                                      >
                                        {entry.action}
                                      </Status>
                                      <Typography variant="pi">
                                        {entry.moderatorName ||
                                          `User #${entry.moderatorId}`}
                                      </Typography>
                                      <Typography
                                        variant="pi"
                                        textColor="neutral500"
                                      >
                                        {entry.createdAt
                                          ? new Date(
                                              entry.createdAt,
                                            ).toLocaleString()
                                          : ''}
                                      </Typography>
                                    </Flex>
                                  ))}
                                </div>
                              )}
                            </Box>

                            {/* Collaboration: Moderation Notes */}
                            <Box>
                              <Typography
                                variant="delta"
                                as="h4"
                                paddingBottom={2}
                              >
                                💬 Notes
                              </Typography>
                              <ModerationNotes
                                notes={itemNotes}
                                onAddNote={(content, isInternal, type) =>
                                  handleAddNote(content, isInternal, type)
                                }
                                canAdd={true}
                                isLoading={isNotesLoading}
                              />
                            </Box>
                          </ModalBody>
                          <ModalFooter
                            startActions={
                              <Button
                                onClick={() => setDetailItem(null)}
                                variant="tertiary"
                              >
                                Close
                              </Button>
                            }
                          />
                        </ModalLayout>
                      )}
                    </>
                  )}
                </Box>
              </TabPanel>

              {/* ════════════════════════════════════════════════════════
                  ANALYTICS TAB
                  ════════════════════════════════════════════════════════ */}
              <TabPanel>
                <Box paddingTop={4}>
                  {isAnalyticsLoading && !analyticsData ? (
                    <Box padding={4}>
                      <SkeletonCard />
                      <Box paddingTop={4}>
                        <SkeletonTable rows={3} columns={4} />
                      </Box>
                    </Box>
                  ) : !analyticsData ? (
                    <EmptyStateLayout
                      icon={<Illo />}
                      content="No analytics data available"
                      action={
                        <Button variant="secondary" onClick={fetchAnalytics}>
                          Refresh
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <Grid gap={4}>
                        <GridItem col={3} s={6} xs={12}>
                          <Box
                            padding={4}
                            hasRadius
                            background="neutral0"
                            shadow="tableShadow"
                          >
                            <Typography variant="pi" textColor="neutral600">
                              Pending
                            </Typography>
                            <Box paddingTop={1}>
                              <Typography variant="alpha" fontWeight="bold">
                                {queueStats.pending}
                              </Typography>
                            </Box>
                          </Box>
                        </GridItem>
                        <GridItem col={3} s={6} xs={12}>
                          <Box
                            padding={4}
                            hasRadius
                            background="neutral0"
                            shadow="tableShadow"
                          >
                            <Typography variant="pi" textColor="neutral600">
                              Spam
                            </Typography>
                            <Box paddingTop={1}>
                              <Typography variant="alpha" fontWeight="bold">
                                {queueStats.spam}
                              </Typography>
                            </Box>
                          </Box>
                        </GridItem>
                        <GridItem col={3} s={6} xs={12}>
                          <Box
                            padding={4}
                            hasRadius
                            background="neutral0"
                            shadow="tableShadow"
                          >
                            <Typography variant="pi" textColor="neutral600">
                              Flagged
                            </Typography>
                            <Box paddingTop={1}>
                              <Typography variant="alpha" fontWeight="bold">
                                {queueStats.flagged}
                              </Typography>
                            </Box>
                          </Box>
                        </GridItem>
                        <GridItem col={3} s={6} xs={12}>
                          <Box
                            padding={4}
                            hasRadius
                            background="neutral0"
                            shadow="tableShadow"
                          >
                            <Typography variant="pi" textColor="neutral600">
                              Total
                            </Typography>
                            <Box paddingTop={1}>
                              <Typography variant="alpha" fontWeight="bold">
                                {queueStats.total}
                              </Typography>
                            </Box>
                          </Box>
                        </GridItem>
                      </Grid>

                      <Box paddingTop={6}>
                        <Typography variant="delta" as="h3">
                          Moderation Heatmap
                        </Typography>
                        <Box paddingTop={4}>
                          {analyticsData.recentActivity ? (
                            <HeatmapChart
                              data={{
                                data: Array(7)
                                  .fill(0)
                                  .map(() => Array(24).fill(0)),
                                maxCount: 0,
                              }}
                              showTooltip
                            />
                          ) : (
                            <Box background="neutral100" padding={4} hasRadius>
                              <Typography variant="pi" textColor="neutral500">
                                No heatmap data available yet
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </TabPanel>

              {/* ════════════════════════════════════════════════════════
                  ACTIVITY LOG TAB
                  ════════════════════════════════════════════════════════ */}
              <TabPanel>
                <Box paddingTop={4}>
                  {isLogLoading && activityLog.length === 0 ? (
                    <SkeletonTable rows={4} columns={7} />
                  ) : activityLog.length === 0 ? (
                    <EmptyStateLayout
                      icon={<Illo />}
                      content="No activity recorded yet"
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => fetchActivityLog(1)}
                        >
                          Refresh
                        </Button>
                      }
                    />
                  ) : (
                    <table
                      style={{ width: '100%', borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">Moderator</Typography>
                          </th>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">Action</Typography>
                          </th>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">
                              Content Type
                            </Typography>
                          </th>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">Item</Typography>
                          </th>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">
                              Status Change
                            </Typography>
                          </th>
                          <th style={{ textAlign: 'left', padding: 8 }}>
                            <Typography variant="sigma">Date</Typography>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.map((log, idx) => (
                          <tr
                            key={log.id || idx}
                            style={{ borderTop: '1px solid #eee' }}
                          >
                            <td style={{ padding: 8 }}>
                              <Typography>
                                {log.moderatorName ||
                                  log.moderatorDisplayName ||
                                  `User #${log.moderatorId}`}
                              </Typography>
                            </td>
                            <td style={{ padding: 8 }}>
                              <Status
                                variant={
                                  log.action === 'approved'
                                    ? 'success'
                                    : log.action === 'rejected'
                                      ? 'danger'
                                      : log.action === 'marked_spam' ||
                                          log.action === 'spam'
                                        ? 'warning'
                                        : 'secondary'
                                }
                              >
                                {log.action}
                              </Status>
                            </td>
                            <td style={{ padding: 8 }}>
                              <Typography>{log.contentType}</Typography>
                            </td>
                            <td style={{ padding: 8 }}>
                              <Typography variant="pi">
                                {log.itemTitle || log.itemId}
                              </Typography>
                            </td>
                            <td style={{ padding: 8 }}>
                              <Typography variant="pi">
                                {log.previousStatus || '-'} →{' '}
                                {log.newStatus || '-'}
                              </Typography>
                            </td>
                            <td style={{ padding: 8 }}>
                              <Typography variant="pi">
                                {new Date(
                                  log.createdAt || log.timestamp,
                                ).toLocaleString()}
                              </Typography>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {logPagination && logPagination.pageCount > 1 && (
                    <Flex justifyContent="center" gap={2} paddingTop={4}>
                      <Button
                        disabled={logPagination.page <= 1}
                        variant="tertiary"
                        size="S"
                        onClick={() => fetchActivityLog(logPagination.page - 1)}
                      >
                        Previous
                      </Button>
                      <Typography variant="pi">
                        Page {logPagination.page} of {logPagination.pageCount}
                      </Typography>
                      <Button
                        disabled={logPagination.page >= logPagination.pageCount}
                        variant="tertiary"
                        size="S"
                        onClick={() => fetchActivityLog(logPagination.page + 1)}
                      >
                        Next
                      </Button>
                    </Flex>
                  )}
                </Box>
              </TabPanel>

              {/* ════════════════════════════════════════════════════════
                  REPORTS TAB
                  ════════════════════════════════════════════════════════ */}
              <TabPanel>
                <Box paddingTop={4}>
                  <Typography variant="beta" as="h2" paddingBottom={4}>
                    📄 Reports & Compliance
                  </Typography>

                  {/* Moderator Activity Export */}
                  <Grid gap={4} paddingBottom={4}>
                    <GridItem col={6} s={12} xs={12}>
                      <Box
                        padding={4}
                        hasRadius
                        background="neutral0"
                        shadow="tableShadow"
                      >
                        <Typography variant="delta" as="h3" paddingBottom={2}>
                          Moderation Activity Report
                        </Typography>
                        <Typography
                          variant="pi"
                          textColor="neutral500"
                          paddingBottom={3}
                        >
                          Export a comprehensive report of all moderation
                          activity for the selected period.
                        </Typography>
                        <Flex gap={2}>
                          <Button
                            variant="secondary"
                            size="S"
                            onClick={async () => {
                              try {
                                const res = await post(
                                  `/${pluginId}/reports/moderation-activity`,
                                  {
                                    startDate:
                                      analyticsDateRange.from?.toISOString() ||
                                      '',
                                    endDate:
                                      analyticsDateRange.to?.toISOString() ||
                                      '',
                                    format: 'csv',
                                  },
                                )
                                const data = res.data?.data
                                if (data) {
                                  const blob = new Blob(
                                    [
                                      Array.isArray(data)
                                        ? data.join('\n')
                                        : JSON.stringify(data),
                                    ],
                                    { type: 'text/csv' },
                                  )
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download =
                                    res.data?.filename ||
                                    `cmcc-moderation-${new Date().toISOString().slice(0, 10)}.csv`
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }
                              } catch {
                                toggleNotification({
                                  type: 'danger',
                                  message: 'Failed to export report',
                                })
                              }
                            }}
                          >
                            📥 Export CSV
                          </Button>
                        </Flex>
                      </Box>
                    </GridItem>
                    <GridItem col={6} s={12} xs={12}>
                      <Box
                        padding={4}
                        hasRadius
                        background="neutral0"
                        shadow="tableShadow"
                      >
                        <Typography variant="delta" as="h3" paddingBottom={2}>
                          Compliance Audit Log
                        </Typography>
                        <Typography
                          variant="pi"
                          textColor="neutral500"
                          paddingBottom={3}
                        >
                          Export the full compliance audit trail with timestamps
                          and moderator details.
                        </Typography>
                        <Button
                          variant="secondary"
                          size="S"
                          onClick={async () => {
                            try {
                              const res = await post(
                                `/${pluginId}/reports/compliance-audit`,
                                {
                                  startDate:
                                    analyticsDateRange.from?.toISOString() ||
                                    '',
                                  endDate:
                                    analyticsDateRange.to?.toISOString() || '',
                                },
                              )
                              const data = res.data?.data
                              if (data) {
                                const blob = new Blob(
                                  [JSON.stringify(data, null, 2)],
                                  { type: 'application/json' },
                                )
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download =
                                  res.data?.filename ||
                                  `cmcc-compliance-${new Date().toISOString().slice(0, 10)}.json`
                                a.click()
                                URL.revokeObjectURL(url)
                              }
                            } catch {
                              toggleNotification({
                                type: 'danger',
                                message: 'Failed to export compliance log',
                              })
                            }
                          }}
                        >
                          📥 Export Audit Log
                        </Button>
                      </Box>
                    </GridItem>
                  </Grid>

                  {/* User Reputation Dashboard */}
                  <Box
                    padding={4}
                    marginBottom={4}
                    hasRadius
                    background="neutral0"
                    shadow="tableShadow"
                  >
                    <Typography variant="delta" as="h3" paddingBottom={3}>
                      👤 User Reputation Dashboard
                    </Typography>
                    {isReputationLoading ? (
                      <SkeletonTable rows={4} columns={5} />
                    ) : reputationUsers.length === 0 ? (
                      <EmptyState
                        icon="users"
                        title="No user data available"
                        description="User reputation data will appear as content is moderated."
                      />
                    ) : (
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse' }}
                      >
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 8 }}>
                              User
                            </th>
                            <th style={{ textAlign: 'left', padding: 8 }}>
                              Trust Level
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Total
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Spam
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Spam Ratio
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reputationUsers.map((u) => (
                            <tr
                              key={u.id || u.userId}
                              style={{ borderTop: '1px solid #eee' }}
                            >
                              <td style={{ padding: 8 }}>
                                <Typography fontWeight="bold">
                                  {u.userName || `User #${u.userId}`}
                                </Typography>
                              </td>
                              <td style={{ padding: 8 }}>
                                <Badge>{u.trustLevel || 'neutral'}</Badge>
                              </td>
                              <td style={{ padding: 8, textAlign: 'right' }}>
                                <Typography>{u.totalItems || 0}</Typography>
                              </td>
                              <td style={{ padding: 8, textAlign: 'right' }}>
                                <Typography textColor="danger600">
                                  {u.spamCount || 0}
                                </Typography>
                              </td>
                              <td style={{ padding: 8, textAlign: 'right' }}>
                                <Typography
                                  textColor={
                                    u.spamRatio > 0.5
                                      ? 'danger600'
                                      : u.spamRatio > 0.2
                                        ? 'warning600'
                                        : undefined
                                  }
                                >
                                  {((u.spamRatio || 0) * 100).toFixed(0)}%
                                </Typography>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Box>

                  {/* Activity Feed */}
                  <Box
                    padding={4}
                    marginBottom={4}
                    hasRadius
                    background="neutral0"
                    shadow="tableShadow"
                  >
                    <Typography variant="delta" as="h3" paddingBottom={3}>
                      🔄 Activity Feed
                    </Typography>
                    <ActivityFeed
                      events={activityFeed}
                      isLoading={isFeedLoading}
                      error={feedError}
                      onRetry={fetchActivityFeedData}
                    />
                  </Box>

                  {/* Moderator Performance */}
                  <Box
                    padding={4}
                    marginBottom={4}
                    hasRadius
                    background="neutral0"
                    shadow="tableShadow"
                  >
                    <Typography variant="delta" as="h3" paddingBottom={3}>
                      📊 Moderator Performance
                    </Typography>
                    {analyticsData?.moderatorPerformance?.length > 0 ? (
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse' }}
                      >
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 8 }}>
                              Moderator
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Actions
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Approvals
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Rejections
                            </th>
                            <th style={{ textAlign: 'right', padding: 8 }}>
                              Spam
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.moderatorPerformance.map(
                            (mod, idx) => (
                              <tr
                                key={mod.id || mod.moderatorId || idx}
                                style={{ borderTop: '1px solid #eee' }}
                              >
                                <td style={{ padding: 8 }}>
                                  <Typography fontWeight="bold">
                                    {mod.moderatorName ||
                                      mod.moderatorId ||
                                      'Unknown'}
                                  </Typography>
                                </td>
                                <td style={{ padding: 8, textAlign: 'right' }}>
                                  <Typography>
                                    {mod.actions || mod.totalActions || 0}
                                  </Typography>
                                </td>
                                <td style={{ padding: 8, textAlign: 'right' }}>
                                  <Typography textColor="success600">
                                    {mod.approve || mod.approveCount || 0}
                                  </Typography>
                                </td>
                                <td style={{ padding: 8, textAlign: 'right' }}>
                                  <Typography textColor="danger600">
                                    {mod.reject || mod.rejectCount || 0}
                                  </Typography>
                                </td>
                                <td style={{ padding: 8, textAlign: 'right' }}>
                                  <Typography textColor="warning600">
                                    {mod.spam || mod.spamCount || 0}
                                  </Typography>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState
                        icon="activity"
                        title="No performance data yet"
                        description="Moderator performance metrics will appear as actions are taken."
                      />
                    )}
                  </Box>

                  {/* Multi-Platform Hub */}
                  <Box
                    padding={4}
                    hasRadius
                    background="neutral0"
                    shadow="tableShadow"
                  >
                    <Typography variant="delta" as="h3" paddingBottom={2}>
                      🌐 Multi-Platform Hub
                    </Typography>
                    <Typography
                      variant="pi"
                      textColor="neutral500"
                      paddingBottom={3}
                    >
                      Connect and manage moderation across all your platforms
                      from a single dashboard.
                    </Typography>
                    <Grid gap={3}>
                      {[
                        { name: 'Strapi', icon: '🟣', connected: true },
                        { name: 'WordPress', icon: '🔵', connected: false },
                        { name: 'Shopify', icon: '🟢', connected: false },
                        { name: 'Storyblok', icon: '🔴', connected: false },
                        { name: 'Wix', icon: '⚫', connected: false },
                      ].map((platform) => (
                        <GridItem key={platform.name} col={4} s={6} xs={12}>
                          <Box
                            padding={3}
                            hasRadius
                            background={
                              platform.connected ? 'success100' : 'neutral100'
                            }
                            borderColor={
                              platform.connected ? 'success600' : 'neutral200'
                            }
                            borderStyle="solid"
                            borderWidth="1px"
                          >
                            <Typography variant="omega" fontWeight="bold">
                              {platform.icon} {platform.name}
                            </Typography>
                            <Typography
                              variant="pi"
                              textColor={
                                platform.connected ? 'success600' : 'neutral500'
                              }
                            >
                              {platform.connected
                                ? '● Connected'
                                : '○ Not connected'}
                            </Typography>
                          </Box>
                        </GridItem>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              </TabPanel>

              {/* ════════════════════════════════════════════════════════
                  SETTINGS TAB
                  ════════════════════════════════════════════════════════ */}
              <TabPanel>
                <Box paddingTop={4}>
                  {settingsSections.length > 0 ? (
                    <>
                      <SettingsForm
                        sections={settingsSections}
                        onSubmit={handleSettingsSave}
                        initialValues={settingsInitialValues}
                        validators={settingsValidators}
                        submitLabel="Save Settings"
                      />
                      {/* Backup & Restore actions */}
                      <Flex gap={3} paddingTop={4}>
                        <Button
                          variant="tertiary"
                          size="S"
                          onClick={handleSettingsExport}
                        >
                          📥 Export Settings
                        </Button>
                        <label style={{ cursor: 'pointer' }}>
                          <Button variant="tertiary" size="S" as="span">
                            📤 Import Settings
                          </Button>
                          <input
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleSettingsImport}
                          />
                        </label>
                      </Flex>

                      {/* AI Moderation Settings */}
                      <Box paddingTop={6}>
                        <Typography variant="delta" as="h3" paddingBottom={4}>
                          AI Moderation
                        </Typography>
                        <AiSettingsForm
                          config={aiConfig}
                          onChange={handleAiConfigChange}
                        />
                      </Box>
                    </>
                  ) : (
                    <Box padding={4}>
                      <Loader>Loading settings...</Loader>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </ContentLayout>
      </Layout>

      {/* ── Bulk Action Confirmation Modal ──────────────────────────── */}
      {confirmBulkAction && (
        <ModalLayout
          onClose={() => setConfirmBulkAction(null)}
          labelledBy="confirm-bulk-title"
        >
          <ModalHeader>
            <Typography fontWeight="bold" id="confirm-bulk-title">
              Confirm Bulk Action
            </Typography>
          </ModalHeader>
          <ModalBody>
            <Typography variant="omega">
              Are you sure you want to apply &quot;{confirmBulkAction.action}
              &quot; to {confirmBulkAction.ids.length} selected items? This
              action cannot be undone.
            </Typography>
          </ModalBody>
          <ModalFooter
            startActions={
              <Flex gap={2}>
                <Button
                  onClick={() => setConfirmBulkAction(null)}
                  variant="tertiary"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    handleBulkAction(
                      confirmBulkAction.action,
                      confirmBulkAction.ids,
                    )
                    setConfirmBulkAction(null)
                  }}
                >
                  Confirm
                </Button>
              </Flex>
            }
          />
        </ModalLayout>
      )}

      {/* ── Keyboard Shortcuts Help Modal ───────────────────────────── */}
      {showShortcuts && (
        <ModalLayout
          onClose={() => setShowShortcuts(false)}
          labelledBy="shortcuts-title"
        >
          <ModalHeader>
            <Typography fontWeight="bold" id="shortcuts-title">
              ⌨️ Keyboard Shortcuts
            </Typography>
          </ModalHeader>
          <ModalBody>
            {SHORTCUTS.map((sk) => (
              <Flex
                key={sk.key}
                justifyContent="space-between"
                alignItems="center"
                paddingBottom={2}
              >
                <Typography variant="pi">{sk.description}</Typography>
                <Badge>
                  {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
                </Badge>
              </Flex>
            ))}
            <Box paddingTop={3}>
              <Typography variant="pi" textColor="neutral500">
                Press <Badge>?</Badge> to toggle this panel
              </Typography>
            </Box>
          </ModalBody>
        </ModalLayout>
      )}
    </div>
  )
}

export default App
