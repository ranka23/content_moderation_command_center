import React, { useState, useEffect, useCallback, useRef } from 'react'
import { QueueTable } from '@cmcc/ui'
import { HeatmapChart } from '@cmcc/ui'
import { SettingsForm } from '@cmcc/ui'
import { ActionButton } from '@cmcc/ui'
import { NotificationBadge } from '@cmcc/ui'
import { processAnalytics } from '@cmcc/core'
import { filterActivityLog } from '@cmcc/core'
import { getEmptyAnalytics } from '@cmcc/core'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'queue', label: 'Queue', icon: '\u{1F4CB}' },
  { id: 'analytics', label: 'Analytics', icon: '\u{1F4CA}' },
  { id: 'activity', label: 'Activity Log', icon: '\u{1F4DD}' },
  { id: 'settings', label: 'Settings', icon: '\u{2699}\u{FE0F}' },
]

const POLL_INTERVAL_MS = 30000

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

  // Settings state
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Track initial mount to avoid fetching all data in effect
  const initialMount = useRef(true)

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchFromAPI = useCallback(
    async (endpoint) => {
      const headers = { 'Content-Type': 'application/json' }
      if (wixContext.token) {
        headers['Authorization'] = `Bearer ${wixContext.token}`
      }
      const url = `${backendUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
      const response = await fetch(url, { headers })
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
        // No data available – keep empty state
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

  // Initial fetch – only load queue data on mount
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      fetchQueue()
    }
  }, [fetchQueue])

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
    if (tabId === 'queue') {
      fetchQueue()
    } else if (tabId === 'analytics') {
      fetchAnalytics()
    } else if (tabId === 'activity') {
      fetchActivity()
    }
  }

  // -----------------------------------------------------------------------
  // Action handlers
  // -----------------------------------------------------------------------

  const handleQueueBulkAction = async (actionType, selectedIds) => {
    try {
      await fetch(`${backendUrl}/queue/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, ids: selectedIds }),
      })
      await fetchQueue()
    } catch (err) {
      console.error('[CMCC] Bulk action failed:', err.message)
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
    } catch (err) {
      console.error('[CMCC] Item action failed:', err.message)
    }
  }

  const handleSettingsSubmit = async (formData) => {
    setSettingsSaving(true)
    try {
      await fetch(`${backendUrl}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    } catch (err) {
      console.error('[CMCC] Settings save failed:', err.message)
    } finally {
      setSettingsSaving(false)
    }
  }

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
      <QueueTable
        items={queueItems}
        onBulkAction={handleQueueBulkAction}
        onItemAction={handleQueueItemAction}
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

        <div className="cmcc-card">
          <h3 className="cmcc-card-title">Moderation Activity Heatmap</h3>
          <HeatmapChart data={analytics.heatmap} showTooltip />
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

  function renderSettingsTab() {
    const sections = [
      {
        id: 'general',
        title: 'General',
        fields: [
          {
            name: 'backendUrl',
            label: 'Backend API URL',
            type: 'text',
            placeholder: 'https://your-api.com/api',
            helpText: 'The URL of your CMCC backend service.',
            required: true,
          },
          {
            name: 'pollInterval',
            label: 'Poll Interval (seconds)',
            type: 'number',
            placeholder: '30',
            helpText: 'How often to check for new queue items.',
          },
          {
            name: 'autoRefresh',
            label: 'Auto-refresh queue',
            type: 'toggle',
            helpText: 'Enable automatic polling of the queue.',
          },
        ],
      },
      {
        id: 'filters',
        title: 'Spam Filters',
        fields: [
          {
            name: 'maxLinks',
            label: 'Max Links per Item',
            type: 'number',
            placeholder: '3',
            helpText: 'Items with more links will be flagged.',
          },
          {
            name: 'minSubmitTime',
            label: 'Min Submit Time (seconds)',
            type: 'number',
            placeholder: '5',
            helpText: 'Items submitted faster than this will be flagged.',
          },
          {
            name: 'blockedKeywords',
            label: 'Blocked Keywords (comma separated)',
            type: 'textarea',
            placeholder: 'keyword1, keyword2, ...',
            helpText: 'Items containing these keywords will be discarded.',
          },
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        fields: [
          {
            name: 'notifyOnSpam',
            label: 'Spam detection alerts',
            type: 'toggle',
            helpText: 'Receive notifications when spam is detected.',
          },
          {
            name: 'notifyOnAnomaly',
            label: 'Anomaly alerts',
            type: 'toggle',
            helpText: 'Receive notifications for unusual activity spikes.',
          },
          {
            name: 'notifyOnThreshold',
            label: 'Queue threshold',
            type: 'number',
            placeholder: '100',
            helpText: 'Alert when queue exceeds this many pending items.',
          },
        ],
      },
    ]

    const initialValues = {
      backendUrl: backendUrl,
      pollInterval: 30,
      autoRefresh: true,
      maxLinks: 3,
      minSubmitTime: 5,
      blockedKeywords: '',
      notifyOnSpam: true,
      notifyOnAnomaly: true,
      notifyOnThreshold: 100,
    }

    const validators = {
      backendUrl: (v) =>
        !v || typeof v !== 'string'
          ? 'Backend URL is required'
          : /^https?:\/\/.+/.test(v)
            ? null
            : 'Must be a valid HTTP or HTTPS URL',
      maxLinks: (v) =>
        typeof v === 'number' && v > 0 ? null : 'Must be a positive number',
      minSubmitTime: (v) =>
        typeof v === 'number' && v >= 0
          ? null
          : 'Must be a non-negative number',
    }

    return (
      <SettingsForm
        sections={sections}
        onSubmit={handleSettingsSubmit}
        initialValues={initialValues}
        validators={validators}
        submitLabel="Save Settings"
        isSubmitting={settingsSaving}
      />
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="cmcc-wix-app">
      <header className="cmcc-app-header">
        <h1 className="cmcc-app-title">CMCC Content Moderation</h1>
        <div className="cmcc-app-badges">
          <NotificationBadge count={pendingCount} type="pending" size="sm" />
          <NotificationBadge count={spamCount} type="spam" size="sm" />
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
        {activeTab === 'settings' && renderSettingsTab()}
      </main>
    </div>
  )
}

export default App
