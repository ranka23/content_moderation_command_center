/**
 * ⚠️  This file is the canonical source for the Strapi CMCC admin app.
 *     A byte-for-byte copy lives at:
 *       cmcc-strapi-app/src/plugins/cmcc/admin/src/pages/App/index.jsx
 *     Keep both files in sync when making changes.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Flex,
  Status,
  Loader,
  EmptyStateLayout,
  Badge,
  IconButton,
  Tooltip,
} from '@strapi/design-system'
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
  AiSettingsForm,
  OfflineBanner,
  NotificationBadge,
  ConfirmationModal,
} from '@cmcc/ui'
import {
  Shield,
  Keyboard,
  ListChecks,
  BarChart3,
  History,
  FileText,
  Users,
  RefreshCw,
  Moon,
  Sun,
  Download,
  Upload,
} from 'lucide-react'
import { getEmptyAnalytics, getQueueBadgeCount } from '@cmcc/core'
import OnboardingWizard from '../../components/OnboardingWizard'
import pluginId from '../../pluginId'

const THEME_STORAGE_KEY = 'cmcc-strapi-theme'
const TABS = [
  { id: 0, label: 'Queue' },
  { id: 1, label: 'Analytics' },
  { id: 2, label: 'Activity Log' },
  { id: 3, label: 'Reports' },
  { id: 4, label: 'Settings' },
]
const SHORTCUTS = [
  { key: 'a', description: 'Approve selected item' },
  { key: 'r', description: 'Reject selected item' },
  { key: 's', description: 'Mark as Spam' },
  { key: 'd', description: 'Defer selected item' },
  { key: 'v', description: 'View item details' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
  { key: '?', description: 'Show keyboard shortcuts' },
]
const BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION = ['deactivate-users']

const SETTINGS_SECTIONS = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
]

const App = () => {
  const { get, post, put } = useFetchClient()
  const { toggleNotification } = useNotification()
  const [currentTab, setCurrentTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [queueItems, setQueueItems] = useState([])
  const [_queuePagination, setQueuePagination] = useState(null)
  const [queueTotal, setQueueTotal] = useState(0)
  const [isQueueLoading, setIsQueueLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [queuePage, setQueuePage] = useState(1)
  const queuePerPage = 25
  const [sortField] = useState('createdAt')
  const [sortDirection] = useState('desc')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [analyticsDateRange] = useState(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    return { from, to: now }
  })
  const [activityLog, setActivityLog] = useState([])
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [logPagination, setLogPagination] = useState(null)
  const [settingsSections, setSettingsSections] = useState([])
  const [settingsInitialValues, setSettingsInitialValues] = useState({})
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || 'light',
  )
  const [detailItem, setDetailItem] = useState(null)
  const [_itemHistory, setItemHistory] = useState([])
  const [_isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [confirmBulkAction, setConfirmBulkAction] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [bulkProgress] = useState({ active: false, current: 0, total: 0 })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [reputationUsers, setReputationUsers] = useState([])
  const [isReputationLoading, setIsReputationLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)
  const [, setPlatformStatus] = useState([])
  const [_itemNotes, setItemNotes] = useState([])
  const [_isNotesLoading, setIsNotesLoading] = useState(false)
  const [_aiEvalResults, setAiEvalResults] = useState({})
  const [_aiEvalLoading, setAiEvalLoading] = useState(null)
  const [aiConfig, setAiConfig] = useState({
    engine: 'none',
    apiKey: '',
    model: '',
    autoModerate: false,
    spamThreshold: 0.7,
    enableLanguageDetection: false,
    enableSentimentAnalysis: false,
  })
  const handleAiConfigChange = useCallback(
    (newConfig) => setAiConfig(newConfig),
    [],
  )

  const { savedFilters, saveFilter } = useSavedFilters('strapi-queue', {
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  })

  const getTargetItemId = useCallback(() => {
    if (selectedIds.length > 0) return selectedIds[0]
    if (queueItems.length > 0)
      return queueItems[0].id || queueItems[0].originalId
    return null
  }, [selectedIds, queueItems])

  const getTargetItem = useCallback(() => {
    if (selectedIds.length > 0) {
      return (
        queueItems.find((i) => (i.id || i.originalId) === selectedIds[0]) ||
        queueItems[0]
      )
    }
    return queueItems[0]
  }, [selectedIds, queueItems])

  useKeyboardShortcuts(
    [
      {
        key: 'a',
        handler: () => {
          if (currentTab !== 0) return
          const id = getTargetItemId()
          if (id) handleModerate('approve', id)
        },
      },
      {
        key: 'r',
        handler: () => {
          if (currentTab !== 0) return
          const id = getTargetItemId()
          if (id) handleModerate('reject', id)
        },
      },
      {
        key: 's',
        handler: () => {
          if (currentTab !== 0) return
          const id = getTargetItemId()
          if (id) handleModerate('spam', id)
        },
      },
      {
        key: 'd',
        handler: () => {
          if (currentTab !== 0) return
          const id = getTargetItemId()
          if (id) handleModerate('defer', id)
        },
      },
      {
        key: 'v',
        handler: () => {
          if (currentTab !== 0) return
          const item = getTargetItem()
          if (item) handleReadItem(item)
        },
      },
      { key: '?', handler: () => setShowShortcuts((p) => !p) },
      {
        key: 'Escape',
        handler: () => {
          setDetailItem(null)
          setShowShortcuts(false)
        },
      },
      {
        key: 'f',
        handler: () => document.querySelector('input[type="text"]')?.focus(),
      },
    ].filter(Boolean),
  )

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
  const toggleTheme = useCallback(
    () => setTheme((p) => (p === 'light' ? 'dark' : 'light')),
    [],
  )

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
        toggleNotification({ type: 'danger', message: 'Failed to fetch queue' })
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

  const fetchSettings = useCallback(async () => {
    try {
      const res = await get(`/${pluginId}/settings`)
      const data = res.data?.data || res.data || {}
      const initialValues = { ...data }
      setSettingsSections(SETTINGS_SECTIONS)
      setSettingsInitialValues(initialValues)
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to load settings' })
    }
  }, [get, toggleNotification])

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

  const fetchPlatformStatus = useCallback(async () => {
    try {
      const res = await get(`/${pluginId}/platforms/status`)
      const data = res.data?.data || res.data?.platforms || []
      setPlatformStatus(Array.isArray(data) ? data : data?.platforms || [])
    } catch {
      setPlatformStatus([])
    }
  }, [get])

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
        // Initial load errors are handled silently
      } finally {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, initialLoadDone])

  const handleModerateWithConfirm = (action, itemId) => {
    if (['reject', 'spam', 'defer'].includes(action)) {
      setConfirmAction({ action, itemId })
      return
    }
    handleModerate(action, itemId)
  }

  const handleModerate = async (action, itemId) => {
    try {
      await post(`/${pluginId}/queue/${itemId}/moderate`, { action })
      toggleNotification({
        type: 'success',
        message: 'Item moderated successfully',
      })
      fetchQueue()
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to moderate item' })
    }
  }

  const handleBulkAction = async (action, ids) => {
    try {
      if (BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION.includes(action))
        await post(`/${pluginId}/users/deactivate`, { ids })
      await post(`/${pluginId}/queue/bulk`, { itemIds: ids, action })
      toggleNotification({ type: 'success', message: 'Bulk action completed' })
      setSelectedIds([])
      fetchQueue()
    } catch {
      toggleNotification({ type: 'danger', message: 'Bulk action failed' })
    }
  }

  const handleBulkActionWithConfirm = (actionType, ids) =>
    setConfirmBulkAction({ action: actionType, ids })

  const handleSettingsSave = async (formData) => {
    try {
      await put(`/${pluginId}/settings`, formData)
      toggleNotification({
        type: 'success',
        message: 'Settings saved successfully',
      })
      fetchSettings()
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save settings' })
    }
  }

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
      toggleNotification({ type: 'success', message: 'Settings exported' })
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to export settings',
      })
    }
  }

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

  const handleReadItem = useCallback(
    (item) => {
      const itemId = item.id || item.originalId
      setDetailItem(item)
      fetchItemHistory(itemId)
      fetchItemNotes(itemId)
    },
    [fetchItemHistory, fetchItemNotes],
  )

  const handleSearch = (query) => {
    setSearchQuery(query)
    setQueuePage(1)
    fetchQueue(1)
  }
  const handleFilterChange = (status) => {
    setFilterStatus(status)
    fetchQueue(1)
  }

  const queueStats = useMemo(
    () => ({
      pending: getQueueBadgeCount(queueItems, 'pending'),
      spam: getQueueBadgeCount(queueItems, 'spam'),
      flagged: getQueueBadgeCount(queueItems, 'flagged'),
      total: queueItems.length,
    }),
    [queueItems],
  )

  const tablePagination = {
    currentPage: queuePage,
    totalPages: Math.ceil((queueTotal || 0) / queuePerPage) || 1,
    perPage: queuePerPage,
  }

  if (loading && !initialLoadDone) {
    return (
      <Box padding={4}>
        <Flex justifyContent="center" alignItems="center" height="40vh">
          <Loader>Loading CMCC moderation panel...</Loader>
        </Flex>
      </Box>
    )
  }

  return (
    <div className={`cmcc-strapi-app cmcc-theme-${theme}`}>
      {/* Header */}
      <Box
        padding={4}
        background="neutral0"
        style={{ borderBottom: '1px solid #e0e0e0' }}
      >
        <OfflineBanner />
        <Flex justifyContent="space-between" alignItems="center">
          <Flex gap={2} alignItems="center">
            <Typography variant="beta" fontWeight="bold">
              <Shield size={20} style={{ display: 'inline' }} /> CMCC
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Content Moderation Command Center
            </Typography>
          </Flex>
          <Flex gap={2}>
            <Tooltip
              description={
                theme === 'light'
                  ? 'Switch to dark mode'
                  : 'Switch to light mode'
              }
            >
              <IconButton onClick={toggleTheme} label="Toggle theme">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </IconButton>
            </Tooltip>
            <Tooltip description="Keyboard shortcuts">
              <IconButton
                onClick={() => setShowShortcuts((p) => !p)}
                label="Keyboard shortcuts"
              >
                <Keyboard size={18} />
              </IconButton>
            </Tooltip>
          </Flex>
        </Flex>
        {currentTab === 0 && selectedIds.length > 0 && (
          <Flex gap={2} paddingTop={3}>
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
              onClick={() => handleBulkActionWithConfirm('reject', selectedIds)}
            >
              Reject ({selectedIds.length})
            </Button>
            <Button
              variant="warning"
              size="S"
              onClick={() => handleBulkActionWithConfirm('spam', selectedIds)}
            >
              Spam ({selectedIds.length})
            </Button>
          </Flex>
        )}
      </Box>

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

      {/* Tabs */}
      <Box padding={3}>
        <Flex
          gap={1}
          style={{ borderBottom: '1px solid #e0e0e0', marginBottom: '16px' }}
        >
          {TABS.map((tab) => (
            <Box
              key={tab.id}
              as="button"
              onClick={() => setCurrentTab(tab.id)}
              padding={3}
              style={{
                cursor: 'pointer',
                border: 'none',
                background: currentTab === tab.id ? '#f0f0ff' : 'transparent',
                borderBottom:
                  currentTab === tab.id
                    ? '2px solid #4945FF'
                    : '2px solid transparent',
                fontWeight: currentTab === tab.id ? 600 : 400,
                fontSize: '14px',
              }}
            >
              {tab.label}
              {tab.id === 0 && (
                <>
                  {queueStats.pending > 0 && (
                    <NotificationBadge
                      count={queueStats.pending}
                      type="pending"
                      size="sm"
                    />
                  )}
                  {queueStats.spam > 0 && (
                    <NotificationBadge
                      count={queueStats.spam}
                      type="spam"
                      size="sm"
                    />
                  )}
                </>
              )}
            </Box>
          ))}
        </Flex>

        {/* Queue Tab */}
        {currentTab === 0 && (
          <Box>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              paddingBottom={4}
            >
              <Flex gap={2}>
                {savedFilters.length > 0 && (
                  <select
                    onChange={(e) => {
                      const f = savedFilters.find(
                        (x) => x.name === e.target.value,
                      )
                      if (f?.filters?.status)
                        handleFilterChange(f.filters.status)
                    }}
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
                icon={<ListChecks size={16} />}
                content="The moderation queue is empty"
                action={
                  <Button variant="secondary" onClick={() => fetchQueue(1)}>
                    Refresh
                  </Button>
                }
              />
            ) : (
              <QueueTable
                items={queueItems}
                loading={isQueueLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onModerate={(id, act) => handleModerateWithConfirm(act, id)}
                onBulkAction={handleBulkActionWithConfirm}
                onSearch={handleSearch}
                filters={{ status: filterStatus, search: searchQuery }}
                pagination={tablePagination}
                onReadItem={handleReadItem}
                totalCount={queueTotal}
                page={queuePage}
                onPageChange={(p) => setQueuePage(p)}
                perPage={queuePerPage}
              />
            )}
          </Box>
        )}

        {confirmAction && (
          <ConfirmationModal
            open={!!confirmAction}
            title={`Confirm ${confirmAction.action}`}
            message={`Are you sure you want to ${confirmAction.action} this item?`}
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            onConfirm={() => {
              handleModerate(confirmAction.action, confirmAction.itemId)
              setConfirmAction(null)
            }}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        {/* Analytics Tab */}
        {currentTab === 1 && (
          <Box>
            {isAnalyticsLoading && !analyticsData ? (
              <>
                <SkeletonCard />
                <Box paddingTop={4}>
                  <SkeletonTable rows={3} columns={4} />
                </Box>
              </>
            ) : !analyticsData ? (
              <EmptyStateLayout
                icon={<BarChart3 size={16} />}
                content="No analytics data available"
                action={
                  <Button variant="secondary" onClick={fetchAnalytics}>
                    Refresh
                  </Button>
                }
              />
            ) : (
              <Box
                style={{
                  display: 'grid',
                  gap: '16px',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                }}
              >
                {[
                  {
                    label: 'Pending',
                    value: queueStats.pending,
                    color: '#f59e0b',
                  },
                  { label: 'Spam', value: queueStats.spam, color: '#ef4444' },
                  {
                    label: 'Flagged',
                    value: queueStats.flagged,
                    color: '#f97316',
                  },
                  { label: 'Total', value: queueStats.total, color: '#22c55e' },
                ].map((s) => (
                  <Box
                    key={s.label}
                    style={{ gridColumn: 'span 3' }}
                    padding={4}
                    hasRadius
                    background="neutral0"
                    shadow="tableShadow"
                  >
                    <Typography variant="pi" textColor="neutral600">
                      {s.label}
                    </Typography>
                    <Typography variant="alpha" fontWeight="bold">
                      {s.value}
                    </Typography>
                  </Box>
                ))}
                <Box style={{ gridColumn: 'span 12' }} paddingTop={6}>
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
              </Box>
            )}
          </Box>
        )}

        {/* Activity Log Tab */}
        {currentTab === 2 && (
          <Box>
            {isLogLoading && activityLog.length === 0 ? (
              <SkeletonTable rows={4} columns={7} />
            ) : activityLog.length === 0 ? (
              <EmptyStateLayout
                icon={<History size={16} />}
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'Moderator',
                      'Action',
                      'Content Type',
                      'Item',
                      'Status Change',
                      'Date',
                    ].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: 8 }}>
                        <Typography variant="sigma">{h}</Typography>
                      </th>
                    ))}
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
                          {log.previousStatus || '-'} → {log.newStatus || '-'}
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
            {logPagination?.pageCount > 1 && (
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
        )}

        {/* Reports Tab */}
        {currentTab === 3 && (
          <Box>
            <Typography variant="beta" as="h2" paddingBottom={4}>
              <>
                <FileText
                  size={20}
                  style={{ display: 'inline', marginRight: 8 }}
                />
                Reports &amp; Compliance
              </>
            </Typography>
            <Box
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(12, 1fr)',
              }}
            >
              {[
                {
                  title: 'Moderation Activity Report',
                  desc: 'Export a comprehensive report of all moderation activity.',
                  endpoint: 'moderation-activity',
                },
                {
                  title: 'Compliance Audit Log',
                  desc: 'Export the full compliance audit trail.',
                  endpoint: 'compliance-audit',
                },
              ].map((r) => (
                <Box
                  key={r.title}
                  style={{ gridColumn: 'span 6' }}
                  padding={4}
                  hasRadius
                  background="neutral0"
                  shadow="tableShadow"
                >
                  <Typography variant="delta" as="h3" paddingBottom={2}>
                    {r.title}
                  </Typography>
                  <Typography
                    variant="pi"
                    textColor="neutral500"
                    paddingBottom={3}
                  >
                    {r.desc}
                  </Typography>
                  <Button
                    variant="secondary"
                    size="S"
                    onClick={async () => {
                      try {
                        const res = await post(
                          `/${pluginId}/reports/${r.endpoint}`,
                          {
                            startDate:
                              analyticsDateRange.from?.toISOString() || '',
                            endDate: analyticsDateRange.to?.toISOString() || '',
                            format: 'json',
                          },
                        )
                        const d = res.data?.data
                        if (d) {
                          const blob = new Blob([JSON.stringify(d, null, 2)], {
                            type: 'application/json',
                          })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `cmcc-${r.endpoint}-${new Date().toISOString().slice(0, 10)}.json`
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
                    <Download
                      size={14}
                      style={{ display: 'inline', marginRight: 4 }}
                    />{' '}
                    Export
                  </Button>
                </Box>
              ))}
            </Box>

            {/* User Reputation */}
            <Box
              padding={4}
              marginBottom={4}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
            >
              <Typography variant="delta" as="h3" paddingBottom={3}>
                <>
                  <Users
                    size={16}
                    style={{ display: 'inline', marginRight: 8 }}
                  />
                  User Reputation Dashboard
                </>
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
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[
                        'User',
                        'Trust Level',
                        'Total',
                        'Spam',
                        'Spam Ratio',
                      ].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: 8 }}>
                          <Typography variant="sigma">{h}</Typography>
                        </th>
                      ))}
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
                <>
                  <RefreshCw
                    size={16}
                    style={{ display: 'inline', marginRight: 8 }}
                  />
                  Activity Feed
                </>
              </Typography>
              <ActivityFeed
                events={activityFeed}
                isLoading={isFeedLoading}
                error={feedError}
                onRetry={fetchActivityFeedData}
              />
            </Box>
          </Box>
        )}

        {/* Settings Tab */}
        {currentTab === 4 && (
          <Box>
            {settingsSections.length > 0 ? (
              <>
                <SettingsForm
                  sections={settingsSections}
                  onSubmit={handleSettingsSave}
                  initialValues={settingsInitialValues}
                  validators={{}}
                  submitLabel="Save Settings"
                />
                <Flex gap={3} paddingTop={4}>
                  <Button
                    variant="tertiary"
                    size="S"
                    onClick={handleSettingsExport}
                  >
                    <Download
                      size={14}
                      style={{ display: 'inline', marginRight: 4 }}
                    />{' '}
                    Export Settings
                  </Button>
                  <label style={{ cursor: 'pointer' }}>
                    <Button variant="tertiary" size="S" as="span">
                      <Upload
                        size={14}
                        style={{ display: 'inline', marginRight: 4 }}
                      />{' '}
                      Import Settings
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleSettingsImport}
                    />
                  </label>
                </Flex>
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
        )}
      </Box>

      {/* Bulk Action Modal */}
      {confirmBulkAction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Box
            background="neutral0"
            padding={6}
            hasRadius
            style={{ maxWidth: 500, width: '90%' }}
          >
            <Typography variant="delta" as="h3" paddingBottom={4}>
              Confirm Bulk Action
            </Typography>
            <Typography variant="omega" paddingBottom={4}>
              Are you sure you want to apply &ldquo;{confirmBulkAction.action}
              &rdquo; to {confirmBulkAction.ids.length} selected items?
            </Typography>
            <Flex gap={2} justifyContent="flex-end">
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
          </Box>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Box
            background="neutral0"
            padding={6}
            hasRadius
            style={{ maxWidth: 420, width: '90%' }}
          >
            <Typography variant="delta" as="h3" paddingBottom={4}>
              <>
                <Keyboard
                  size={20}
                  style={{ display: 'inline', marginRight: 8 }}
                />
                Keyboard Shortcuts
              </>
            </Typography>
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
              <Button
                onClick={() => setShowShortcuts(false)}
                variant="tertiary"
              >
                Close
              </Button>
            </Box>
          </Box>
        </div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard />
    </div>
  )
}

export default App
