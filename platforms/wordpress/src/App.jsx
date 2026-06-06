import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getEmptyAnalytics } from '@cmcc/core'
import {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
} from '@cmcc/ui'

const TABS = [
  { id: 'queue', label: 'Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'activity-log', label: 'Activity Log' },
  { id: 'settings', label: 'Settings' },
]

function mapInitialTab(page) {
  switch (page) {
    case 'cmcc':
      return 'queue'
    case 'cmcc-analytics':
      return 'analytics'
    case 'cmcc-settings':
      return 'settings'
    default:
      return 'queue'
  }
}

function apiFetch(path, options = {}) {
  const url = (window.cmccData?.restUrl || '/wp-json/cmcc/v1/') + path
  const headers = {
    'X-WP-Nonce': window.cmccData?.nonce || '',
    'Content-Type': 'application/json',
    ...options.headers,
  }

  return fetch(url, { ...options, headers }).then((res) => {
    if (!res.ok) {
      return res.json().then((err) => Promise.reject(err))
    }
    return res.json()
  })
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const initial = window.cmccData?.initialTab || ''
    return mapInitialTab(initial)
  })
  const [queueItems, setQueueItems] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [analyticsData, setAnalyticsData] = useState(getEmptyAnalytics())
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    spam: 0,
    flagged: 0,
    total: 0,
  })
  const [activityLog, setActivityLog] = useState([])
  const [, setSettings] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Queue filters
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    dateRange: '7d',
    search: '',
  })

  // Queue pagination
  const [queuePage, setQueuePage] = useState(1)
  const queuePerPage = 25

  // Activity log pagination
  const [logPage, setLogPage] = useState(1)
  const logPerPage = 50
  const [logTotal, setLogTotal] = useState(0)

  // Settings form state
  const [settingsSections, setSettingsSections] = useState([])
  const [settingsInitialValues, setSettingsInitialValues] = useState({})

  const fetchQueue = useCallback(
    async (page = 1) => {
      setIsLoading(true)
      try {
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
        const data = await apiFetch('queue?' + params.toString())
        setQueueItems(data.items || [])
        setQueueTotal(data.total || 0)
      } catch (err) {
        console.error('Failed to fetch queue:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [filters],
  )

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await apiFetch('analytics')
      setQueueStats(
        data.queue_stats || {
          pending: 0,
          spam: 0,
          flagged: 0,
          total: 0,
        },
      )
      setAnalyticsData({
        heatmap: {
          data: Array(7)
            .fill(0)
            .map(() => Array(24).fill(0)),
          maxCount: 0,
        },
        spamRatio: data.spam_ratio || {
          spamCount: 0,
          totalCount: 0,
          ratio: 0,
          percentage: 0,
        },
        contentTypeBreakdown: data.content_type_breakdown || [],
        moderatorPerformance: [],
        anomalyAlerts: [],
        dateRange: { start: '', end: '' },
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    }
  }, [])

  const fetchActivityLog = useCallback(
    async (page = 1) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(logPerPage),
        })
        const data = await apiFetch('activity-log?' + params.toString())
        setActivityLog(data.items || [])
        setLogTotal(data.total || 0)
      } catch (err) {
        console.error('Failed to fetch activity log:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [logPerPage],
  )

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiFetch('settings')
      setSettings(data)

      // Build settings sections for SettingsForm
      const sections = []
      const initialValues = {}

      if (data.general) {
        const fields = [
          {
            name: 'auto_moderate',
            label: 'Auto Moderate',
            type: 'toggle',
            helpText: 'Automatically moderate items based on firewall rules',
          },
          {
            name: 'moderation_behavior',
            label: 'Moderation Behavior',
            type: 'select',
            options: [
              { value: 'flag', label: 'Flag for review' },
              { value: 'spam', label: 'Mark as spam' },
              { value: 'discard', label: 'Discard silently' },
            ],
          },
          {
            name: 'queue_page_size',
            label: 'Queue Page Size',
            type: 'number',
          },
          {
            name: 'language',
            label: 'Language',
            type: 'select',
            options: [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ],
          },
        ]
        sections.push({ id: 'general', title: 'General', fields })
        Object.assign(initialValues, data.general)
      }

      if (data.spam_firewall) {
        const fields = [
          {
            name: 'max_links',
            label: 'Max Links Allowed',
            type: 'number',
            helpText: 'Maximum number of links before content is flagged',
          },
          {
            name: 'blacklisted_keywords',
            label: 'Blacklisted Keywords',
            type: 'textarea',
            placeholder: 'One keyword per line',
          },
          {
            name: 'blacklisted_email_domains',
            label: 'Blacklisted Email Domains',
            type: 'textarea',
            placeholder: 'e.g. spam.com',
          },
          {
            name: 'min_submit_time',
            label: 'Minimum Submit Time (seconds)',
            type: 'number',
            helpText: 'Minimum time before a form can be submitted',
          },
          {
            name: 'enable_duplicate_detection',
            label: 'Enable Duplicate Detection',
            type: 'toggle',
          },
          {
            name: 'duplicate_lookback_days',
            label: 'Duplicate Lookback Days',
            type: 'number',
          },
          {
            name: 'global_action',
            label: 'Default Action',
            type: 'select',
            options: [
              { value: 'flag', label: 'Flag for review' },
              { value: 'spam', label: 'Mark as spam' },
              { value: 'discard', label: 'Discard silently' },
            ],
          },
        ]
        sections.push({ id: 'spam_firewall', title: 'Spam Firewall', fields })
        Object.assign(initialValues, data.spam_firewall)
      }

      if (data.notifications) {
        const fields = [
          {
            name: 'email_alerts',
            label: 'Email Alerts',
            type: 'toggle',
            helpText: 'Send email notifications when alerts are triggered',
          },
          {
            name: 'alert_threshold',
            label: 'Alert Threshold',
            type: 'number',
            helpText: 'Number of flagged items before an alert is sent',
          },
          {
            name: 'notify_moderators',
            label: 'Notify Moderators',
            type: 'toggle',
            helpText: 'Notify moderators of pending items',
          },
        ]
        sections.push({ id: 'notifications', title: 'Notifications', fields })
        Object.assign(initialValues, data.notifications)
      }

      setSettingsSections(sections)
      setSettingsInitialValues(initialValues)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }, [])

  // Track initial mount to load data once
  const initialMount = useRef(true)

  // Load data when tab changes
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      fetchQueue(queuePage)
      return
    }
    // Don't auto-fetch on mount - handled above
  }, [fetchQueue, queuePage])

  // Re-fetch when tab changes via the tab change handler below

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'queue') {
      setQueuePage(1)
      fetchQueue(1)
    } else if (tabId === 'analytics') {
      fetchAnalytics()
    } else if (tabId === 'activity-log') {
      setLogPage(1)
      fetchActivityLog(1)
    } else if (tabId === 'settings') {
      fetchSettings()
    }
  }

  // Handle queue item action
  const handleItemAction = async (actionType, itemId) => {
    try {
      await apiFetch(`queue/${encodeURIComponent(itemId)}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: actionType }),
      })
      fetchQueue(queuePage)
    } catch (err) {
      console.error('Action failed:', err)
    }
  }

  // Handle bulk action
  const handleBulkAction = async (actionType, selectedIds) => {
    try {
      await apiFetch('queue/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, action: actionType }),
      })
      fetchQueue(queuePage)
    } catch (err) {
      console.error('Bulk action failed:', err)
    }
  }

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setQueuePage(1)
  }

  // Handle settings save
  const handleSettingsSave = async (formData) => {
    try {
      // Rebuild the settings structure from sections
      const payload = {}
      for (const section of settingsSections) {
        payload[section.id] = {}
        for (const field of section.fields) {
          if (formData[field.name] !== undefined) {
            payload[section.id][field.name] = formData[field.name]
          }
        }
      }
      await apiFetch('settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  // Spam ratio data for display
  const spamRatioData = analyticsData?.spamRatio || {
    spamCount: 0,
    totalCount: 0,
    ratio: 0,
    percentage: 0,
  }

  return (
    <div className="cmcc-admin">
      {/* Tab Navigation */}
      <div className="cmcc-tab-nav">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`cmcc-tab ${isActive ? 'cmcc-tab-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
              {tab.id === 'queue' && queueStats.total > 0 && (
                <NotificationBadge
                  count={queueStats.pending}
                  type="pending"
                  size="sm"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="cmcc-tab-content">
        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="cmcc-tab-panel" role="tabpanel">
            <QueueTable
              items={queueItems}
              onBulkAction={handleBulkAction}
              onItemAction={handleItemAction}
              filters={filters}
              onFilterChange={handleFilterChange}
              isLoading={isLoading}
              totalCount={queueTotal}
            />
            {/* Simple pagination */}
            {queueTotal > queuePerPage && (
              <div className="cmcc-pagination">
                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={queuePage <= 1}
                  onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </ActionButton>
                <span className="cmcc-pagination-info">
                  Page {queuePage} of {Math.ceil(queueTotal / queuePerPage)}
                </span>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={queuePage >= Math.ceil(queueTotal / queuePerPage)}
                  onClick={() => setQueuePage((p) => p + 1)}
                >
                  Next
                </ActionButton>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="cmcc-tab-panel" role="tabpanel">
            <div className="cmcc-analytics">
              {/* Queue Stats Summary */}
              <div className="cmcc-stats-grid">
                <div className="cmcc-stat-card">
                  <span className="cmcc-stat-label">Pending</span>
                  <span className="cmcc-stat-value cmcc-stat-pending">
                    {queueStats.pending}
                  </span>
                </div>
                <div className="cmcc-stat-card">
                  <span className="cmcc-stat-label">Spam</span>
                  <span className="cmcc-stat-value cmcc-stat-spam">
                    {queueStats.spam}
                  </span>
                </div>
                <div className="cmcc-stat-card">
                  <span className="cmcc-stat-label">Flagged</span>
                  <span className="cmcc-stat-value cmcc-stat-flagged">
                    {queueStats.flagged}
                  </span>
                </div>
                <div className="cmcc-stat-card">
                  <span className="cmcc-stat-label">Total</span>
                  <span className="cmcc-stat-value">{queueStats.total}</span>
                </div>
              </div>

              {/* Spam Ratio */}
              <div className="cmcc-analytics-section">
                <h3>Spam Ratio</h3>
                <div className="cmcc-spam-ratio">
                  <div className="cmcc-spam-ratio-bar">
                    <div
                      className="cmcc-spam-ratio-fill"
                      style={{
                        width: `${Math.min(spamRatioData.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="cmcc-spam-ratio-text">
                    {spamRatioData.percentage}% spam ({spamRatioData.spamCount}{' '}
                    of {spamRatioData.totalCount} items)
                  </span>
                </div>
              </div>

              {/* Content Type Breakdown */}
              {analyticsData?.contentTypeBreakdown?.length > 0 && (
                <div className="cmcc-analytics-section">
                  <h3>Content Breakdown</h3>
                  <table className="cmcc-breakdown-table">
                    <thead>
                      <tr>
                        <th>Content Type</th>
                        <th>Count</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.contentTypeBreakdown.map((item) => (
                        <tr key={item.content_type}>
                          <td>{item.content_type}</td>
                          <td>{item.count}</td>
                          <td>{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Heatmap Chart */}
              <div className="cmcc-analytics-section">
                <h3>Activity Heatmap</h3>
                <HeatmapChart
                  data={
                    analyticsData.heatmap || {
                      data: Array(7)
                        .fill(0)
                        .map(() => Array(24).fill(0)),
                      maxCount: 0,
                    }
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity-log' && (
          <div className="cmcc-tab-panel" role="tabpanel">
            {isLoading && activityLog.length === 0 ? (
              <div className="cmcc-loading">Loading activity log...</div>
            ) : activityLog.length === 0 ? (
              <div className="cmcc-empty">No activity recorded yet.</div>
            ) : (
              <>
                <table className="cmcc-activity-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Moderator</th>
                      <th>Action</th>
                      <th>Type</th>
                      <th>Item</th>
                      <th>Previous Status</th>
                      <th>New Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                        <td>{entry.moderator_id}</td>
                        <td>
                          <span
                            className={`cmcc-action-badge cmcc-action-${entry.action}`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td>{entry.content_type}</td>
                        <td>{entry.item_title || entry.item_id}</td>
                        <td>{entry.previous_status}</td>
                        <td>{entry.new_status}</td>
                        <td>{entry.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logTotal > logPerPage && (
                  <div className="cmcc-pagination">
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </ActionButton>
                    <span className="cmcc-pagination-info">
                      Page {logPage} of {Math.ceil(logTotal / logPerPage)}
                    </span>
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      disabled={logPage >= Math.ceil(logTotal / logPerPage)}
                      onClick={() => setLogPage((p) => p + 1)}
                    >
                      Next
                    </ActionButton>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="cmcc-tab-panel" role="tabpanel">
            {settingsSections.length > 0 ? (
              <SettingsForm
                sections={settingsSections}
                onSubmit={handleSettingsSave}
                initialValues={settingsInitialValues}
                validators={{}}
                submitLabel="Save Settings"
              />
            ) : (
              <div className="cmcc-loading">Loading settings...</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
