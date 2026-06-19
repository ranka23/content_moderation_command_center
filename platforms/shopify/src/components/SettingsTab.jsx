/**
 * SettingsTab - Full settings with 11 sections, import/export, and theme toggle.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Layout, Card, Select, Button, Banner } from '@shopify/polaris'
import { SettingsForm, AiSettingsForm } from '@cmcc/ui'

const API_BASE = '/api/cmcc'

/** Settings sections for the SettingsForm component */
const SETTINGS_SECTIONS = [
  {
    id: 'general',
    title: 'General',
    icon: 'general',
    fields: [
      { name: 'backendUrl', label: 'Backend URL', type: 'text' },
      { name: 'siteName', label: 'Site Name', type: 'text' },
    ],
  },
  {
    id: 'moderation',
    title: 'Moderation',
    icon: 'moderation',
    fields: [
      { name: 'autoModerate', label: 'Auto-moderate', type: 'toggle' },
      {
        name: 'spamThreshold',
        label: 'Spam Threshold',
        type: 'number',
        placeholder: '0.8',
        helpText: 'Score from 0 to 1. Higher values are stricter.',
      },
      { name: 'notifyOnFlag', label: 'Notify on Flag', type: 'toggle' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications',
    fields: [
      { name: 'notifyOnSpike', label: 'Notify on Spike', type: 'toggle' },
      { name: 'notifyOnSpam', label: 'Notify on Spam', type: 'toggle' },
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: 'performance',
    fields: [
      {
        name: 'maxQueueSize',
        label: 'Max Queue Size',
        type: 'number',
        helpText: 'Maximum items in the moderation queue',
      },
      {
        name: 'queuePollInterval',
        label: 'Queue Poll Interval (ms)',
        type: 'number',
        helpText: 'How often to poll for new items',
      },
    ],
  },
  {
    id: 'backup_restore',
    title: 'Backup & Restore',
    icon: 'backup_restore',
    fields: [
      {
        name: 'note',
        label: 'Note',
        type: 'textarea',
        helpText:
          'Use the Export and Import buttons above to backup and restore your JSON settings.',
      },
    ],
  },
]

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

  /** Handle SettingsForm submission */
  const handleSettingsSubmit = useCallback(
    (formData) => {
      setSettingsForm((prev) => ({ ...prev, ...formData }))
      onSave()
    },
    [setSettingsForm, onSave],
  )

  /** Build initial values from settingsForm with defaults */
  const initialValues = useMemo(
    () => ({
      backendUrl: settingsForm.backendUrl ?? '',
      siteName: settingsForm.siteName ?? '',
      autoModerate: settingsForm.autoModerate ?? false,
      spamThreshold: settingsForm.spamThreshold ?? 0.8,
      notifyOnFlag: settingsForm.notifyOnFlag ?? false,
      notifyOnSpike: settingsForm.notifyOnSpike ?? false,
      notifyOnSpam: settingsForm.notifyOnSpam ?? false,
      maxQueueSize: settingsForm.maxQueueSize ?? 1000,
      queuePollInterval: settingsForm.queuePollInterval ?? 5000,
      note: settingsForm.note ?? '',
    }),
    [settingsForm],
  )

  /** Validators for SettingsForm fields */
  const validators = useMemo(
    () => ({
      backendUrl: (value) => {
        if (!value) return 'Backend URL is required'
        try {
          new URL(value)
          return null
        } catch {
          return 'Invalid URL format'
        }
      },
      spamThreshold: (value) => {
        const num = Number(value)
        if (isNaN(num) || num < 0 || num > 1) return 'Must be between 0 and 1'
        return null
      },
      maxQueueSize: (value) => {
        const num = Number(value)
        if (isNaN(num) || num <= 0) return 'Must be greater than 0'
        return null
      },
      queuePollInterval: (value) => {
        const num = Number(value)
        if (isNaN(num) || num <= 0) return 'Must be greater than 0'
        return null
      },
    }),
    [],
  )

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

      {/* Import / Export */}
      <Layout.Section>
        <Card title="Import / Export">
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

      {/* Settings Form */}
      <Layout.Section>
        <SettingsForm
          sections={SETTINGS_SECTIONS}
          initialValues={initialValues}
          onSubmit={handleSettingsSubmit}
          validators={validators}
          submitLabel="Save All Settings"
          isSubmitting={saving}
        />
      </Layout.Section>

      {/* Appearance */}
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

      {/* AI Moderation */}
      <Layout.Section>
        <Card title="AI Moderation">
          <Card.Section>
            <AiSettingsForm config={aiConfig} onChange={handleAiConfigChange} />
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* Saved Filters */}
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
    </Layout>
  )
}
