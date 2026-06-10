/**
 * SettingsTab - Full settings with 11 sections, import/export, and theme toggle.
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Layout,
  Card,
  Select,
  TextField,
  Button,
  Banner,
} from '@shopify/polaris'
import { AiSettingsForm } from '@cmcc/ui'

const API_BASE = '/api/cmcc'

/**
 * @param {Object} props
 * @param {Object} props.settingsForm - Current settings form state
 * @param {Function} props.setSettingsForm - Settings form setter
 * @param {boolean} props.saving - Save in progress flag
 * @param {Function} props.onSave - Save handler
 * @param {boolean} props.darkMode - Dark mode state
 * @param {Function} props.setDarkMode - Dark mode setter
 * @param {Array} props.savedFilters - Saved filters array
 * @param {Function} props.handleDeleteFilter - Delete filter handler
 * @param {Function} props.showToast - Toast display function
 * @param {Function} props.fetchInitialData - Re-fetch data function
 * @param {Object} props.aiConfig - AI moderation configuration
 * @param {Function} props.setAiConfig - AI config setter
 */
export default function SettingsTab({
  settingsForm,
  setSettingsForm,
  saving,
  onSave,
  darkMode,
  setDarkMode,
  savedFilters,
  handleDeleteFilter,
  showToast,
  _fetchInitialData,
  aiConfig,
  setAiConfig,
}) {
  const [importExportMsg, setImportExportMsg] = useState(null)
  const fileInputRef = useRef(null)

  /** Handle AI config changes — AiSettingsForm manages model defaults */
  const handleAiConfigChange = useCallback(
    (newConfig) => {
      setAiConfig(newConfig)
    },
    [setAiConfig],
  )

  /** Update a single form field */
  function updateField(field) {
    return (value) => {
      setSettingsForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  // ── Export ────────────────────────────────────────────────
  async function handleExport() {
    try {
      const res = await fetch(`${API_BASE}/settings/export`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()

      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-settings-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setImportExportMsg({ status: 'success', text: 'Settings exported' })
    } catch (err) {
      setImportExportMsg({ status: 'critical', text: err.message })
    }
  }

  // ── Import ────────────────────────────────────────────────
  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      const res = await fetch(`${API_BASE}/settings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      })
      if (!res.ok) throw new Error('Import failed')
      const result = await res.json()

      // Refresh settings in the form
      setSettingsForm(result.data)
      setImportExportMsg({
        status: 'success',
        text: 'Settings imported successfully',
      })
      showToast('Settings imported')
    } catch (err) {
      setImportExportMsg({
        status: 'critical',
        text: `Import error: ${err.message}`,
      })
    }

    // Reset input so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <Layout>
      {/* Import/Export Banner */}
      {importExportMsg && (
        <Layout.Section>
          <Banner
            status={importExportMsg.status}
            onDismiss={() => setImportExportMsg(null)}
          >
            <p>{importExportMsg.text}</p>
          </Banner>
        </Layout.Section>
      )}

      {/* 1. General Settings */}
      <Layout.Section>
        <Card title="General Settings">
          <Card.Section>
            <Select
              label="Auto-moderation"
              value={settingsForm.autoModerate ? 'enabled' : 'disabled'}
              onChange={(val) => updateField('autoModerate')(val === 'enabled')}
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
              helpText="Automatically moderate content based on spam threshold"
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Spam threshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={String(settingsForm.spamThreshold ?? 0.8)}
              onChange={updateField('spamThreshold')}
              autoComplete="off"
              helpText="Score from 0 to 1. Higher values are stricter."
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Max queue size"
              type="number"
              min={100}
              max={10000}
              step={100}
              value={String(settingsForm.maxQueueSize ?? 1000)}
              onChange={updateField('maxQueueSize')}
              autoComplete="off"
              helpText="Maximum items in the moderation queue"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 2. Spam Firewall */}
      <Layout.Section>
        <Card title="Spam Firewall">
          <Card.Section>
            <Select
              label="Spam firewall enabled"
              value={settingsForm.spamFirewallEnabled ? 'enabled' : 'disabled'}
              onChange={(val) =>
                updateField('spamFirewallEnabled')(val === 'enabled')
              }
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Max links per post"
              type="number"
              min={0}
              max={50}
              value={String(settingsForm.maxLinksPerPost ?? 2)}
              onChange={updateField('maxLinksPerPost')}
              autoComplete="off"
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Blocked keywords (comma separated)"
              value={settingsForm.blockedKeywords ?? ''}
              onChange={updateField('blockedKeywords')}
              autoComplete="off"
              multiline={2}
              helpText="Content containing these keywords will be flagged"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 3. Notifications */}
      <Layout.Section>
        <Card title="Notifications">
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
            <Select
              label="Email notifications"
              value={settingsForm.emailNotifications ? 'enabled' : 'disabled'}
              onChange={(val) =>
                updateField('emailNotifications')(val === 'enabled')
              }
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Notification emails (comma separated)"
              value={settingsForm.notificationEmails ?? ''}
              onChange={updateField('notificationEmails')}
              autoComplete="off"
              helpText="Email addresses to receive moderation alerts"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 4. Appearance */}
      <Layout.Section>
        <Card title="Appearance">
          <Card.Section>
            <Select
              label="Theme"
              value={darkMode ? 'dark' : 'light'}
              onChange={(v) => setDarkMode(v === 'dark')}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              helpText="Theme preference is saved to your browser."
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 5. Integrations */}
      <Layout.Section>
        <Card title="Integrations">
          <Card.Section>
            <Select
              label="WordPress sync"
              value={settingsForm.wpSyncEnabled ? 'enabled' : 'disabled'}
              onChange={(val) =>
                updateField('wpSyncEnabled')(val === 'enabled')
              }
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
              helpText="Sync moderation data with connected WordPress site"
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="WordPress API URL"
              value={settingsForm.wpApiUrl ?? ''}
              onChange={updateField('wpApiUrl')}
              autoComplete="off"
              placeholder="https://example.com/wp-json/cmcc/v1"
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="WordPress API key"
              value={settingsForm.wpApiKey ?? ''}
              onChange={updateField('wpApiKey')}
              autoComplete="off"
              type="password"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 6. Auto Moderation Rules */}
      <Layout.Section>
        <Card title="Auto Moderation">
          <Card.Section>
            <Select
              label="Auto-approve trusted users"
              value={settingsForm.autoApproveTrusted ? 'enabled' : 'disabled'}
              onChange={(val) =>
                updateField('autoApproveTrusted')(val === 'enabled')
              }
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
            />
          </Card.Section>
          <Card.Section>
            <Select
              label="Auto-flag new users"
              value={settingsForm.autoFlagNewUsers ? 'enabled' : 'disabled'}
              onChange={(val) =>
                updateField('autoFlagNewUsers')(val === 'enabled')
              }
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Min reputation score for auto-approve"
              type="number"
              min={0}
              max={100}
              value={String(settingsForm.minReputationScore ?? 80)}
              onChange={updateField('minReputationScore')}
              autoComplete="off"
              helpText="Users with reputation above this score are auto-approved"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 7. Moderator Management */}
      <Layout.Section>
        <Card title="Moderator Management">
          <Card.Section>
            <TextField
              label="Max moderators"
              type="number"
              min={1}
              max={100}
              value={String(settingsForm.maxModerators ?? 10)}
              onChange={updateField('maxModerators')}
              autoComplete="off"
            />
          </Card.Section>
          <Card.Section>
            <Select
              label="Moderator registration"
              value={settingsForm.moderatorRegistration ? 'open' : 'closed'}
              onChange={(val) => updateField('moderatorRegistration')(val)}
              options={[
                { label: 'Open', value: 'open' },
                { label: 'Closed', value: 'closed' },
              ]}
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 8. Data Retention */}
      <Layout.Section>
        <Card title="Data Retention">
          <Card.Section>
            <Select
              label="Auto-purge old data"
              value={settingsForm.autoPurge ? 'enabled' : 'disabled'}
              onChange={(val) => updateField('autoPurge')(val === 'enabled')}
              options={[
                { label: 'Disabled', value: 'disabled' },
                { label: 'Enabled', value: 'enabled' },
              ]}
            />
          </Card.Section>
          <Card.Section>
            <TextField
              label="Retention period (days)"
              type="number"
              min={1}
              max={365}
              value={String(settingsForm.retentionDays ?? 90)}
              onChange={updateField('retentionDays')}
              autoComplete="off"
              helpText="Older activity logs and moderated items will be purged"
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 9. API Webhooks */}
      <Layout.Section>
        <Card title="API Webhooks">
          <Card.Section>
            <TextField
              label="Webhook URL"
              value={settingsForm.webhookUrl ?? ''}
              onChange={updateField('webhookUrl')}
              autoComplete="off"
              placeholder="https://example.com/webhook"
            />
          </Card.Section>
          <Card.Section>
            <Select
              label="Webhook events"
              value={settingsForm.webhookEvents ?? 'all'}
              onChange={updateField('webhookEvents')}
              options={[
                { label: 'All events', value: 'all' },
                { label: 'Moderation only', value: 'moderation' },
                { label: 'Flags only', value: 'flags' },
              ]}
            />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 10. Backup & Restore */}
      <Layout.Section>
        <Card title="Backup & Restore">
          <Card.Section>
            <div className="cmcc-settings-import-export">
              <Button onClick={handleExport}>Export Settings (JSON)</Button>
              <Button onClick={handleImportClick}>
                Import Settings (JSON)
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 11. AI Moderation */}
      <Layout.Section>
        <Card title="AI Moderation">
          <Card.Section>
            <AiSettingsForm config={aiConfig} onChange={handleAiConfigChange} />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* 12. Saved Filters */}
      <Layout.Section>
        <Card title="Saved Filters">
          <Card.Section>
            {savedFilters.length > 0 ? (
              <div className="cmcc-saved-filters-list">
                {savedFilters.map((f) => (
                  <div key={f.id} className="cmcc-saved-filter-item">
                    <span>{f.name}</span>
                    <Button
                      size="slim"
                      destructive
                      onClick={() => handleDeleteFilter(f.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6d7175' }}>
                No saved filters. Go to the Queue tab to create filters.
              </p>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* Save Button */}
      <Layout.Section>
        <Card sectioned>
          <Button primary onClick={onSave} loading={saving} disabled={saving}>
            Save All Settings
          </Button>
        </Card>
      </Layout.Section>
    </Layout>
  )
}
