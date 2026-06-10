import React, { useRef, useCallback } from 'react'
import { SettingsForm, AiSettingsForm } from '@cmcc/ui'

/**
 * All settings sections matching WordPress feature parity.
 * Covers: General, Spam Firewall, Notifications, Appearance,
 * Auto Moderation, Integrations, Moderator Management,
 * Data Retention, API & Webhooks, Backup & Restore.
 *
 * @type {Array<{id:string, title:string, fields:Array}>}
 */
const SETTINGS_SECTIONS = [
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
      {
        name: 'autoModerate',
        label: 'Auto Moderate',
        type: 'toggle',
        helpText: 'Automatically moderate items based on firewall rules.',
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
      {
        name: 'blockedEmailDomains',
        label: 'Blocked Email Domains',
        type: 'textarea',
        placeholder: 'spamdomain.com, ...',
        helpText: 'Block submissions from these email domains.',
      },
      {
        name: 'enableDuplicateDetection',
        label: 'Enable Duplicate Detection',
        type: 'toggle',
        helpText: 'Detect and flag duplicate content submissions.',
      },
      {
        name: 'duplicateLookbackDays',
        label: 'Duplicate Lookback (Days)',
        type: 'number',
        placeholder: '7',
        helpText: 'How far back to check for duplicates.',
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
      {
        name: 'emailAlerts',
        label: 'Email Alerts',
        type: 'toggle',
        helpText: 'Send email notifications when alerts are triggered.',
      },
      {
        name: 'notifyModerators',
        label: 'Notify Moderators',
        type: 'toggle',
        helpText: 'Send notifications to moderators directly.',
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
      {
        name: 'itemsPerPage',
        label: 'Items Per Page',
        type: 'number',
        placeholder: '25',
      },
      {
        name: 'dateFormat',
        label: 'Date Format',
        type: 'select',
        options: [
          { value: 'relative', label: 'Relative (2 hours ago)' },
          { value: 'absolute', label: 'Absolute (Jan 15, 2024)' },
        ],
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        options: [
          { value: 'UTC', label: 'UTC' },
          { value: 'local', label: 'Browser Local' },
          { value: 'US/Eastern', label: 'US/Eastern' },
          { value: 'US/Pacific', label: 'US/Pacific' },
          { value: 'Europe/London', label: 'Europe/London' },
        ],
      },
    ],
  },
  {
    id: 'auto_moderation',
    title: 'Auto Moderation',
    fields: [
      {
        name: 'aiDetectionEngine',
        label: 'AI Detection Engine',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'internal', label: 'Internal' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'claude', label: 'Claude (Anthropic)' },
          { value: 'gemini', label: 'Gemini' },
          { value: 'google', label: 'Google Cloud' },
        ],
      },
      {
        name: 'spamScoreFlagThreshold',
        label: 'Spam Score — Flag Threshold',
        type: 'number',
        placeholder: '60',
        helpText: 'Items above this score are flagged.',
      },
      {
        name: 'spamScoreSpamThreshold',
        label: 'Spam Score — Spam Threshold',
        type: 'number',
        placeholder: '80',
        helpText: 'Items above this score are marked as spam.',
      },
      {
        name: 'spamScoreDiscardThreshold',
        label: 'Spam Score — Discard Threshold',
        type: 'number',
        placeholder: '95',
        helpText: 'Items above this score are discarded.',
      },
      {
        name: 'blockAllLinks',
        label: 'Block All Links',
        type: 'toggle',
        helpText: 'Block any submission containing links.',
      },
      {
        name: 'allowlistedDomains',
        label: 'Allowlisted Domains',
        type: 'textarea',
        placeholder: 'trusted.com, ...',
        helpText: 'Domains allowed through link blocking.',
      },
      {
        name: 'defaultAction',
        label: 'Default Action',
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
        placeholder: 'https://hooks.example.com/...',
        helpText: 'Receive real-time moderation events.',
      },
    ],
  },
  {
    id: 'moderator_management',
    title: 'Moderator Management',
    fields: [
      {
        name: 'secondaryApprovalRequired',
        label: 'Secondary Approval Required',
        type: 'toggle',
        helpText: 'Some actions require a second moderator to confirm.',
      },
      {
        name: 'actionConfirmationRequired',
        label: 'Action Confirmation Required',
        type: 'toggle',
        helpText: 'Show confirmation dialog before moderate actions.',
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
        placeholder: '90',
      },
      {
        name: 'archivedItemRetentionDays',
        label: 'Archived Item Retention (Days)',
        type: 'number',
        placeholder: '365',
      },
      {
        name: 'autoPurgeSchedule',
        label: 'Auto-Purge Schedule',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ],
      },
    ],
  },
  {
    id: 'api_webhooks',
    title: 'API & Webhooks',
    fields: [
      {
        name: 'webhookNewItems',
        label: 'Webhook — New Items',
        type: 'text',
        placeholder: 'https://hooks.example.com/new-items',
      },
      {
        name: 'webhookApprovals',
        label: 'Webhook — Approvals',
        type: 'text',
        placeholder: 'https://hooks.example.com/approvals',
      },
      {
        name: 'webhookSpam',
        label: 'Webhook — Spam',
        type: 'text',
        placeholder: 'https://hooks.example.com/spam',
      },
      {
        name: 'apiRateLimiting',
        label: 'API Rate Limit (requests/min)',
        type: 'number',
        placeholder: '60',
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
      {
        name: 'exportBeforePurge',
        label: 'Export Before Purge',
        type: 'toggle',
        helpText: 'Export data before purging old records.',
      },
    ],
  },
]

/**
 * SettingsTab — Full settings form with 10 sections matching WordPress,
 * plus JSON import/export buttons.
 *
 * @param {object} props
 * @param {Function} props.onSubmit - Settings form submit handler
 * @param {boolean} props.isSaving - Whether settings are saving
 * @param {string} props.backendUrl - Current backend URL
 * @param {Function} props.fetchFromAPI - API fetch function
 * @param {(msg:string, type:string) => void} props.addToast - Toast notification
 * @param {Object} props.aiConfig - AI moderation configuration
 * @param {Function} props.onAiConfigChange - AI config change handler
 * @returns {React.ReactElement}
 */
export function SettingsTab({
  onSubmit,
  isSaving = false,
  backendUrl = '',
  fetchFromAPI,
  addToast,
  aiConfig,
  onAiConfigChange,
}) {
  const fileInputRef = useRef(null)

  /** Handle AI config changes — AiSettingsForm manages model defaults */
  const handleAiConfigChange = useCallback(
    (newConfig) => {
      onAiConfigChange(newConfig)
    },
    [onAiConfigChange],
  )

  const initialValues = {
    backendUrl: backendUrl,
    pollInterval: 30,
    autoRefresh: true,
    maxLinks: 3,
    minSubmitTime: 5,
    blockedKeywords: '',
    blockedEmailDomains: '',
    enableDuplicateDetection: true,
    duplicateLookbackDays: 7,
    notifyOnSpam: true,
    notifyOnAnomaly: true,
    notifyOnThreshold: 100,
    emailAlerts: true,
    notifyModerators: true,
    theme: 'light',
    itemsPerPage: 25,
    dateFormat: 'relative',
    timezone: 'UTC',
    aiDetectionEngine: 'none',
    spamScoreFlagThreshold: 60,
    spamScoreSpamThreshold: 80,
    spamScoreDiscardThreshold: 95,
    blockAllLinks: false,
    allowlistedDomains: '',
    defaultAction: 'flag',
    autoImportComments: true,
    autoImportPosts: true,
    webhookUrl: '',
    secondaryApprovalRequired: false,
    actionConfirmationRequired: true,
    activityLogRetentionDays: 90,
    archivedItemRetentionDays: 365,
    autoPurgeSchedule: 'weekly',
    webhookNewItems: '',
    webhookApprovals: '',
    webhookSpam: '',
    apiRateLimiting: 60,
    scheduledBackups: 'none',
    exportBeforePurge: true,
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
      typeof v === 'number' && v >= 0 ? null : 'Must be a non-negative number',
  }

  /**
   * Handle settings export: fetch settings from API and download as JSON.
   */
  const handleExport = async () => {
    try {
      const data = await fetchFromAPI('settings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (data.data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cmcc-settings-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        addToast('Settings exported successfully', 'success')
      } else {
        addToast('No settings to export', 'info')
      }
    } catch (err) {
      addToast(err.message || 'Failed to export settings', 'error')
    }
  }

  /**
   * Handle settings import: read JSON file and upload to API.
   */
  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const settings = parsed.data || parsed.settings || parsed

      await fetchFromAPI('settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      addToast(
        'Settings imported successfully. Reload to see changes.',
        'success',
      )
    } catch (err) {
      addToast(
        err.message || 'Failed to import settings. Invalid JSON file.',
        'error',
      )
    }
    event.target.value = ''
  }

  return (
    <div>
      {/* Import/Export buttons */}
      <div className="cmcc-card cmcc-mb" style={{ padding: '16px' }}>
        <h3 className="cmcc-card-title">
          {'\u{1F4E5}'} Import / Export Settings
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          <button
            className="cmcc-btn-primary"
            onClick={handleExport}
            style={{ fontSize: 13, padding: '8px 18px' }}
          >
            {'\u{2B07}'} Export JSON
          </button>
          <button
            className="cmcc-btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: 13, padding: '8px 18px' }}
          >
            {'\u{1F4C2}'} Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Settings Form */}
      <SettingsForm
        sections={SETTINGS_SECTIONS}
        onSubmit={onSubmit}
        initialValues={initialValues}
        validators={validators}
        submitLabel="Save Settings"
        isSubmitting={isSaving}
      />

      {/* AI Moderation Settings */}
      <div className="cmcc-card cmcc-mt" style={{ padding: '16px' }}>
        <h3 className="cmcc-card-title">{'\u{1F916}'} AI Moderation</h3>
        <AiSettingsForm config={aiConfig} onChange={handleAiConfigChange} />
      </div>
    </div>
  )
}

export default SettingsTab
