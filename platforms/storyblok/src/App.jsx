import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
} from '@cmcc/ui'
import {
  processAnalytics,
  filterActivityLog,
  getDefaultAnalyticsOptions,
  getEmptyAnalytics,
} from '@cmcc/core'

const DEFAULT_SETTINGS = {
  apiEndpoint: '',
  apiKey: '',
  spamThreshold: 0.7,
  autoApprove: false,
  notifyOnSpike: true,
  notifyOnSpam: true,
  queuePollInterval: 30,
}

const SETTINGS_SECTIONS = [
  {
    id: 'connection',
    title: 'API Connection',
    fields: [
      {
        name: 'apiEndpoint',
        label: 'API Endpoint URL',
        type: 'text',
        placeholder: 'https://your-cmcc-api.example.com',
        helpText: 'The base URL of your CMCC backend API',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your API key',
        helpText: 'Authentication key for the CMCC API',
        required: true,
      },
    ],
  },
  {
    id: 'moderation',
    title: 'Moderation Rules',
    fields: [
      {
        name: 'spamThreshold',
        label: 'Spam Score Threshold',
        type: 'number',
        placeholder: '0.7',
        helpText: 'Items with a spam score above this value are auto-flagged',
        required: true,
      },
      {
        name: 'autoApprove',
        label: 'Auto-approve safe items',
        type: 'toggle',
        helpText: 'Automatically approve items with spam score below threshold',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    fields: [
      {
        name: 'notifyOnSpike',
        label: 'Alert on volume spikes',
        type: 'toggle',
        helpText: 'Receive alerts when queued item volume spikes',
      },
      {
        name: 'notifyOnSpam',
        label: 'Alert on high spam ratio',
        type: 'toggle',
        helpText: 'Receive alerts when spam ratio exceeds threshold',
      },
      {
        name: 'queuePollInterval',
        label: 'Queue Poll Interval (seconds)',
        type: 'number',
        placeholder: '30',
        helpText: 'How often to check for new items in the queue',
      },
    ],
  },
]

const SETTINGS_VALIDATORS = {
  apiEndpoint: (v) =>
    !v || String(v).length === 0 ? 'API endpoint is required' : null,
  apiKey: (v) => (!v || String(v).length === 0 ? 'API key is required' : null),
  spamThreshold: (v) => {
    const n = Number(v)
    return Number.isNaN(n) || n < 0 || n > 1
      ? 'Must be a number between 0 and 1'
      : null
  },
  queuePollInterval: (v) => {
    const n = Number(v)
    return Number.isNaN(n) || n < 5 || n > 300
      ? 'Must be between 5 and 300'
      : null
  },
}

const TABS = ['Queue', 'Analytics', 'Activity Log', 'Settings']

export default function App({ sdk, space, user, _accessToken }) {
  const [activeTab, setActiveTab] = useState('Queue')
  const [queueItems, setQueueItems] = useState([])
  const [analyticsData, setAnalyticsData] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  // Load persisted settings from localStorage on mount
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('cmcc-storyblok-settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch {
      // Ignore corrupt settings
    }
    return DEFAULT_SETTINGS
  })
  const [loading, setLoading] = useState({
    queue: false,
    analytics: false,
    activity: false,
  })
  const [error, setError] = useState(null)

  // Persist settings to localStorage
  const persistSettings = useCallback((newSettings) => {
    setSettings(newSettings)
    try {
      localStorage.setItem(
        'cmcc-storyblok-settings',
        JSON.stringify(newSettings),
      )
    } catch {
      // Storage may be unavailable in iframe context
    }
  }, [])

  // Build the API headers
  const apiHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' }
    if (settings.apiKey) {
      headers['X-API-Key'] = settings.apiKey
    }
    return headers
  }, [settings.apiKey])

  // Fetch queue items from the backend API
  const fetchQueueItems = useCallback(async () => {
    if (!settings.apiEndpoint) {
      setQueueItems([])
      return
    }

    setLoading((prev) => ({ ...prev, queue: true }))
    setError(null)

    try {
      const res = await fetch(`${settings.apiEndpoint}/api/queue`, {
        headers: apiHeaders(),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      setQueueItems(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      console.error('[CMCC] Failed to fetch queue:', err)
      setError('Failed to load queue items. Check your API connection.')
      setQueueItems([])
    } finally {
      setLoading((prev) => ({ ...prev, queue: false }))
    }
  }, [settings.apiEndpoint, apiHeaders])

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!settings.apiEndpoint) {
      setAnalyticsData(getEmptyAnalytics())
      return
    }

    setLoading((prev) => ({ ...prev, analytics: true }))

    try {
      const [eventsRes, queueRes] = await Promise.all([
        fetch(`${settings.apiEndpoint}/api/events`, {
          headers: apiHeaders(),
        }),
        fetch(`${settings.apiEndpoint}/api/queue`, {
          headers: apiHeaders(),
        }),
      ])

      if (!eventsRes.ok || !queueRes.ok) {
        throw new Error('Failed to fetch analytics data from API')
      }

      const events = await eventsRes.json()
      const queue = await queueRes.json()
      const eventsList = Array.isArray(events) ? events : events.events || []
      const queueList = Array.isArray(queue) ? queue : queue.items || []

      setEventHistory(eventsList)

      const opts = getDefaultAnalyticsOptions()
      const processed = processAnalytics(eventsList, queueList, opts)
      setAnalyticsData(processed)
    } catch (err) {
      console.error('[CMCC] Failed to fetch analytics:', err)
      setAnalyticsData(getEmptyAnalytics())
    } finally {
      setLoading((prev) => ({ ...prev, analytics: false }))
    }
  }, [settings.apiEndpoint, apiHeaders])

  // Fetch activity log
  const fetchActivityLog = useCallback(async () => {
    if (!settings.apiEndpoint) {
      setActivityLog([])
      return
    }

    setLoading((prev) => ({ ...prev, activity: true }))

    try {
      const res = await fetch(`${settings.apiEndpoint}/api/activity`, {
        headers: apiHeaders(),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data = await res.json()
      const entries = Array.isArray(data) ? data : data.entries || []
      setActivityLog(entries)
    } catch (err) {
      console.error('[CMCC] Failed to fetch activity log:', err)
      setActivityLog([])
    } finally {
      setLoading((prev) => ({ ...prev, activity: false }))
    }
  }, [settings.apiEndpoint, apiHeaders])

  // Set up queue polling when apiEndpoint is configured
  const pollingMount = useRef(true)
  useEffect(() => {
    if (pollingMount.current) {
      pollingMount.current = false
      return
    }

    if (!settings.apiEndpoint) return

    const interval = setInterval(
      fetchQueueItems,
      (settings.queuePollInterval || 30) * 1000,
    )

    return () => clearInterval(interval)
  }, [settings.apiEndpoint, settings.queuePollInterval, fetchQueueItems])

  // Handle bulk actions from QueueTable
  const handleBulkAction = async (actionType, selectedIds) => {
    if (!settings.apiEndpoint) return

    try {
      const res = await fetch(`${settings.apiEndpoint}/api/queue/bulk`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          action: actionType,
          ids: selectedIds,
          moderatorId: user?.id || 'storyblok-user',
        }),
      })

      if (!res.ok) {
        throw new Error(`Bulk action failed: ${res.status}`)
      }

      // Refresh the queue after action
      await fetchQueueItems()
    } catch (err) {
      console.error('[CMCC] Bulk action error:', err)
      setError(`Failed to perform action: ${actionType}`)
    }
  }

  // Handle individual item actions
  const handleItemAction = async (actionType, itemId) => {
    if (!settings.apiEndpoint) return

    try {
      const res = await fetch(`${settings.apiEndpoint}/api/queue/${itemId}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({
          action: actionType,
          moderatorId: user?.id || 'storyblok-user',
        }),
      })

      if (!res.ok) {
        throw new Error(`Action failed: ${res.status}`)
      }

      await fetchQueueItems()
    } catch (err) {
      console.error('[CMCC] Item action error:', err)
      setError(`Failed to ${actionType} item ${itemId}`)
    }
  }

  // Handle tab change — fetch data for the selected tab
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'Queue') {
      fetchQueueItems()
    } else if (tab === 'Analytics') {
      fetchAnalytics()
    } else if (tab === 'Activity Log') {
      fetchActivityLog()
    }
  }

  // Handle chart cell click
  const handleChartCellClick = (dayOfWeek, hour, count) => {
    console.log(
      `[CMCC] Heatmap cell: Day ${dayOfWeek}, Hour ${hour}, Count ${count}`,
    )
  }

  // Handle settings save
  const handleSettingsSave = (formData) => {
    persistSettings({
      ...settings,
      ...formData,
    })
  }

  // Filter activity log when viewing
  const filteredLog = filterActivityLog
    ? filterActivityLog(activityLog, { limit: 50 })
    : activityLog

  // Compute summary counts for badges
  const pendingCount = queueItems.filter((i) => i.status === 'pending').length
  const spamCount = queueItems.filter((i) => i.status === 'spam').length

  // Determine tab icon indicators
  const tabIndicators = {
    Queue:
      pendingCount > 0 ? (
        <NotificationBadge count={pendingCount} type="pending" size="sm" />
      ) : null,
  }

  return (
    <div className="cmcc-storyblok-app">
      {/* Header */}
      <header className="cmcc-header">
        <div className="cmcc-header-brand">
          <h1 className="cmcc-title">CMCC Moderation</h1>
          <span className="cmcc-space-name">{space?.name || 'Storyblok'}</span>
        </div>
        <div className="cmcc-header-meta">
          <span className="cmcc-user-name">{user?.name || 'User'}</span>
          {spamCount > 0 && (
            <NotificationBadge count={spamCount} type="spam" size="sm" />
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="cmcc-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={activeTab === tab}
            className={
              'cmcc-tab' + (activeTab === tab ? ' cmcc-tab-active' : '')
            }
            onClick={() => handleTabChange(tab)}
          >
            {tab}
            {tabIndicators[tab] && (
              <span className="cmcc-tab-badge">{tabIndicators[tab]}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="cmcc-error-banner" role="alert">
          <span>{error}</span>
          <button
            className="cmcc-error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="cmcc-main" role="tabpanel">
        {/* --- Queue Tab --- */}
        {activeTab === 'Queue' && (
          <section className="cmcc-section">
            <div className="cmcc-section-header">
              <h2>Moderation Queue</h2>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={fetchQueueItems}
                loading={loading.queue}
              >
                Refresh
              </ActionButton>
            </div>

            {!settings.apiEndpoint ? (
              <div className="cmcc-empty">
                <p>
                  Connect your CMCC backend API in Settings to start moderating
                  content.
                </p>
                <ActionButton
                  variant="primary"
                  size="md"
                  onClick={() => setActiveTab('Settings')}
                >
                  Open Settings
                </ActionButton>
              </div>
            ) : loading.queue && queueItems.length === 0 ? (
              <div className="cmcc-loading">
                <div className="cmcc-loading-spinner"></div>
                <p>Loading queue items...</p>
              </div>
            ) : queueItems.length === 0 ? (
              <div className="cmcc-empty">
                <p>No items in the moderation queue.</p>
              </div>
            ) : (
              <QueueTable
                items={queueItems}
                onBulkAction={handleBulkAction}
                onItemAction={handleItemAction}
                filters={{
                  contentType: 'all',
                  status: 'all',
                  dateRange: 'all',
                  search: '',
                }}
                onFilterChange={() => {
                  // Filtering handled client-side by QueueTable
                }}
                isLoading={loading.queue}
                totalCount={queueItems.length}
              />
            )}
          </section>
        )}

        {/* --- Analytics Tab --- */}
        {activeTab === 'Analytics' && (
          <section className="cmcc-section">
            <h2>Analytics</h2>

            {!settings.apiEndpoint ? (
              <div className="cmcc-empty">
                <p>
                  Connect your CMCC backend API in Settings to view analytics.
                </p>
              </div>
            ) : loading.analytics ? (
              <div className="cmcc-loading">
                <div className="cmcc-loading-spinner"></div>
                <p>Loading analytics data...</p>
              </div>
            ) : !analyticsData ||
              analyticsData.heatmap.data.every((row) =>
                row.every((c) => c === 0),
              ) ? (
              <div className="cmcc-empty">
                <p>
                  No analytics data available yet. Data will appear once
                  moderation activity begins.
                </p>
              </div>
            ) : (
              <div className="cmcc-analytics-grid">
                {/* Heatmap */}
                <div className="cmcc-analytics-card">
                  <h3>Activity Heatmap</h3>
                  <HeatmapChart
                    data={analyticsData.heatmap}
                    onCellClick={handleChartCellClick}
                    showTooltip
                  />
                </div>

                {/* Spam Ratio */}
                <div className="cmcc-analytics-card">
                  <h3>Spam Ratio</h3>
                  {analyticsData.spamRatio ? (
                    <div className="cmcc-metric">
                      <span className="cmcc-metric-value">
                        {analyticsData.spamRatio.percentage.toFixed(1)}%
                      </span>
                      <span className="cmcc-metric-label">
                        {analyticsData.spamRatio.spamCount} spam /{' '}
                        {analyticsData.spamRatio.totalCount} total
                      </span>
                    </div>
                  ) : (
                    <p className="cmcc-empty">No data</p>
                  )}
                </div>

                {/* Content Breakdown */}
                <div className="cmcc-analytics-card">
                  <h3>Content Breakdown</h3>
                  {analyticsData.contentTypeBreakdown &&
                  analyticsData.contentTypeBreakdown.length > 0 ? (
                    <ul className="cmcc-breakdown-list">
                      {analyticsData.contentTypeBreakdown.map((item) => (
                        <li key={item.type}>
                          <span className="cmcc-breakdown-type">
                            {item.type}
                          </span>
                          <span className="cmcc-breakdown-pct">
                            {item.percentage.toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cmcc-empty">No data</p>
                  )}
                </div>

                {/* Anomaly Alerts */}
                {analyticsData.anomalyAlerts &&
                  analyticsData.anomalyAlerts.length > 0 && (
                    <div className="cmcc-analytics-card cmcc-alerts-card">
                      <h3>Anomaly Alerts</h3>
                      <ul className="cmcc-alerts-list">
                        {analyticsData.anomalyAlerts.map((alert) => (
                          <li
                            key={alert.id}
                            className={
                              'cmcc-alert cmcc-alert--' + alert.severity
                            }
                          >
                            <strong>{alert.type}</strong>
                            <p>{alert.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </section>
        )}

        {/* --- Activity Log Tab --- */}
        {activeTab === 'Activity Log' && (
          <section className="cmcc-section">
            <div className="cmcc-section-header">
              <h2>Activity Log</h2>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={fetchActivityLog}
                loading={loading.activity}
              >
                Refresh
              </ActionButton>
            </div>

            {!settings.apiEndpoint ? (
              <div className="cmcc-empty">
                <p>
                  Connect your CMCC backend API in Settings to view the activity
                  log.
                </p>
              </div>
            ) : loading.activity && activityLog.length === 0 ? (
              <div className="cmcc-loading">
                <div className="cmcc-loading-spinner"></div>
                <p>Loading activity log...</p>
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="cmcc-empty">
                <p>No activity recorded yet.</p>
              </div>
            ) : (
              <div className="cmcc-activity-table-wrapper">
                <table className="cmcc-activity-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Item</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLog.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                        <td>{entry.moderatorId}</td>
                        <td>{entry.action}</td>
                        <td>{entry.itemTitle || entry.itemId}</td>
                        <td>
                          <span
                            className={
                              'cmcc-activity-status cmcc-activity-status--' +
                              (entry.status || 'info')
                            }
                          >
                            {entry.status || 'info'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* --- Settings Tab --- */}
        {activeTab === 'Settings' && (
          <section className="cmcc-section">
            <h2>Settings</h2>

            {!sdk ? (
              <div className="cmcc-empty">
                <p>
                  Storyblok SDK not available. Settings require an active
                  Storyblok App context.
                </p>
              </div>
            ) : (
              <SettingsForm
                sections={SETTINGS_SECTIONS}
                onSubmit={handleSettingsSave}
                initialValues={settings}
                validators={SETTINGS_VALIDATORS}
                submitLabel="Save Settings"
                isSubmitting={false}
              />
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="cmcc-footer">
        <span className="cmcc-footer-brand">CMCC Moderation v1.0.0</span>
        <span className="cmcc-footer-separator">&middot;</span>
        <span className="cmcc-footer-powered">
          Powered by{' '}
          <a
            href="https://www.storyblok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cmcc-footer-link"
          >
            Storyblok
          </a>
        </span>
      </footer>
    </div>
  )
}
