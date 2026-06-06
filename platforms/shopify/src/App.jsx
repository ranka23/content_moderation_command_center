import React, { useState, useEffect, useCallback } from 'react'
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react'
import {
  AppProvider,
  Page,
  Card,
  Tabs,
  DataTable,
  Button,
  Select,
  TextField,
  Layout,
  Banner,
  Toast,
  Spinner,
  Badge,
  EmptyState,
  Frame,
} from '@shopify/polaris'
// Polaris styles are loaded from Shopify's CDN when the app is embedded in
// Shopify admin. Do NOT import them here — it would bloat the bundle by ~500KB.

const API_BASE = '/api'

const TABS = [
  { id: 'queue', content: 'Queue' },
  { id: 'analytics', content: 'Analytics' },
  { id: 'activity-log', content: 'Activity Log' },
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

// Extract Shopify App Bridge config from URL params (provided by Shopify when
// the app is embedded in an iframe inside Shopify admin).
const appBridgeConfig = {
  apiKey: new URLSearchParams(window.location.search).get('apiKey') || '',
  host: new URLSearchParams(window.location.search).get('host') || '',
  forceRedirect: true,
}

function App() {
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastActive, setToastActive] = useState(false)
  const [toastContent, setToastContent] = useState('')
  const [toastError, setToastError] = useState(false)

  // Queue state
  const [queueItems, setQueueItems] = useState([])

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalModerated: 0,
    spamDetected: 0,
    approved: 0,
    pendingReview: 0,
    spamRatio: 0,
    contentBreakdown: [],
  })

  // Activity log state
  const [activityLog, setActivityLog] = useState([])

  // Settings state
  const [settings, setSettings] = useState({
    autoModerate: false,
    spamThreshold: 0.8,
    notifyOnFlag: true,
    maxQueueSize: 1000,
  })
  const [settingsForm, setSettingsForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  const showToast = useCallback((message, isError = false) => {
    setToastContent(message)
    setToastError(isError)
    setToastActive(true)
  }, [])

  const dismissToast = useCallback(() => {
    setToastActive(false)
  }, [])

  // Fetch data on mount
  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    setError(null)

    try {
      const [queueRes, analyticsRes, logRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/queue`),
        fetch(`${API_BASE}/analytics`),
        fetch(`${API_BASE}/activity-log`),
        fetch(`${API_BASE}/settings`),
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
      setActivityLog(logData.items || [])
      setSettings(settingsData)
      setSettingsForm({ ...settingsData })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleModerate(id, action) {
    try {
      const res = await fetch(`${API_BASE}/queue/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        throw new Error(`Failed to ${action} item`)
      }

      const updated = await res.json()
      setQueueItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item)),
      )
      showToast(`Item ${action} successfully`)
    } catch (err) {
      showToast(err.message, true)
    }
  }

  async function handleSaveSettings(newSettings) {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      setSettings(newSettings)
      setSettingsForm({ ...newSettings })
      showToast('Settings saved')
    } catch (err) {
      showToast(err.message, true)
    }
  }

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
        return renderQueueTab()
      case 1:
        return renderAnalyticsTab()
      case 2:
        return renderActivityLogTab()
      case 3:
        return renderSettingsTab()
      default:
        return null
    }
  }

  // ── Queue Tab ────────────────────────────────────────────

  function renderQueueTab() {
    if (queueItems.length === 0) {
      return (
        <Card>
          <EmptyState
            heading="No items in queue"
            action={{ content: 'Refresh', onAction: fetchInitialData }}
          >
            <p>All content has been moderated. Check back later.</p>
          </EmptyState>
        </Card>
      )
    }

    const rows = queueItems.map((item) => [
      item.id,
      item.contentType,
      item.contentSnippet ? item.contentSnippet.substring(0, 60) : '-',
      item.author,
      <Badge
        key={`status-${item.id}`}
        status={item.status === 'pending' ? 'warning' : 'success'}
      >
        {item.status}
      </Badge>,
      item.riskScore !== null ? `${(item.riskScore * 100).toFixed(0)}%` : '-',
      <div key={`actions-${item.id}`} className="cmcc-actions">
        <Button size="slim" onClick={() => handleModerate(item.id, 'approve')}>
          Approve
        </Button>
        <Button
          size="slim"
          destructive
          onClick={() => handleModerate(item.id, 'reject')}
        >
          Reject
        </Button>
      </div>,
    ])

    return (
      <Card>
        <div className="cmcc-tab-header">
          <h2>Moderation Queue</h2>
        </div>
        <DataTable
          columnContentTypes={[
            'text',
            'text',
            'text',
            'text',
            'text',
            'numeric',
            'text',
          ]}
          headings={[
            'ID',
            'Type',
            'Content',
            'Author',
            'Status',
            'Risk',
            'Actions',
          ]}
          rows={rows}
        />
      </Card>
    )
  }

  // ── Analytics Tab ────────────────────────────────────────

  function renderAnalyticsTab() {
    const spamPct = analytics.totalModerated
      ? ((analytics.spamDetected / analytics.totalModerated) * 100).toFixed(1)
      : '0.0'

    const breakdownRows = (analytics.contentBreakdown || []).map((entry) => [
      entry.type,
      entry.count,
      entry.percentage !== null ? `${entry.percentage}%` : '-',
    ])

    return (
      <Layout>
        <Layout.Section>
          <div className="cmcc-analytics-grid">
            <Card sectioned>
              <p className="cmcc-stat-label">Total Moderated</p>
              <p className="cmcc-stat-value">
                {analytics.totalModerated.toLocaleString()}
              </p>
            </Card>
            <Card sectioned>
              <p className="cmcc-stat-label">Spam Detected</p>
              <p className="cmcc-stat-value">
                {analytics.spamDetected.toLocaleString()}
              </p>
            </Card>
            <Card sectioned>
              <p className="cmcc-stat-label">Approved</p>
              <p className="cmcc-stat-value">
                {analytics.approved.toLocaleString()}
              </p>
            </Card>
            <Card sectioned>
              <p className="cmcc-stat-label">Pending Review</p>
              <p className="cmcc-stat-value">
                {analytics.pendingReview.toLocaleString()}
              </p>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned title="Spam Ratio">
            <div className="cmcc-spam-ratio">
              <span className="cmcc-spam-pct">{spamPct}%</span>
              <p>of all moderated content was flagged as spam</p>
            </div>
          </Card>
        </Layout.Section>

        {breakdownRows.length > 0 && (
          <Layout.Section>
            <Card title="Content Breakdown">
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric']}
                headings={['Type', 'Count', 'Percentage']}
                rows={breakdownRows}
              />
            </Card>
          </Layout.Section>
        )}
      </Layout>
    )
  }

  // ── Activity Log Tab ─────────────────────────────────────

  function renderActivityLogTab() {
    if (activityLog.length === 0) {
      return (
        <Card>
          <EmptyState heading="No activity recorded">
            <p>Actions taken on moderated content will appear here.</p>
          </EmptyState>
        </Card>
      )
    }

    const rows = activityLog.map((entry) => [
      new Date(entry.timestamp).toLocaleString(),
      entry.action,
      entry.contentType,
      entry.contentId,
      entry.performedBy,
    ])

    return (
      <Card title="Activity Log">
        <DataTable
          columnContentTypes={['text', 'text', 'text', 'text', 'text']}
          headings={[
            'Timestamp',
            'Action',
            'Content Type',
            'Content ID',
            'Performed By',
          ]}
          rows={rows}
        />
      </Card>
    )
  }

  // ── Settings Tab ─────────────────────────────────────────

  function renderSettingsTab() {
    function updateField(field) {
      return (value) => {
        setSettingsForm((prev) => ({ ...prev, [field]: value }))
      }
    }

    async function onSave() {
      setSaving(true)
      await handleSaveSettings(settingsForm)
      setSaving(false)
    }

    return (
      <Card title="Moderation Settings">
        <Card.Section>
          <Select
            label="Auto-moderation"
            value={settingsForm.autoModerate ? 'enabled' : 'disabled'}
            onChange={(val) => updateField('autoModerate')(val === 'enabled')}
            options={[
              { label: 'Disabled', value: 'disabled' },
              { label: 'Enabled', value: 'enabled' },
            ]}
          />
        </Card.Section>

        <Card.Section>
          <TextField
            label="Spam threshold"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={String(settingsForm.spamThreshold)}
            onChange={updateField('spamThreshold')}
            autoComplete="off"
            helpText="Score from 0 to 1. Higher values are stricter."
          />
        </Card.Section>

        <Card.Section>
          <Select
            label="Notify on flag"
            value={settingsForm.notifyOnFlag ? 'yes' : 'no'}
            onChange={(val) => updateField('notifyOnFlag')(val === 'yes')}
            options={[
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ]}
          />
        </Card.Section>

        <Card.Section>
          <TextField
            label="Max queue size"
            type="number"
            min={100}
            max={10000}
            step={100}
            value={String(settingsForm.maxQueueSize)}
            onChange={updateField('maxQueueSize')}
            autoComplete="off"
          />
        </Card.Section>

        <Card.Section>
          <Button primary onClick={onSave} loading={saving} disabled={saving}>
            Save settings
          </Button>
        </Card.Section>
      </Card>
    )
  }

  // ── Render ───────────────────────────────────────────────

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
          <div className="cmcc-shopify-app">
            <Page fullWidth title="CMCC Content Moderation">
              <Tabs
                tabs={TABS}
                selected={selectedTab}
                onSelect={setSelectedTab}
                fitted
              />
              <div className="cmcc-content">{renderContent()}</div>
            </Page>
            {toastMarkup}
          </div>
        </Frame>
      </AppProvider>
    </AppBridgeProvider>
  )
}

export default App
