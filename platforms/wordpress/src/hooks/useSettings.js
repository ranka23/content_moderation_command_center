import { useState, useCallback, useEffect, useMemo } from 'react'
import { startTransition } from 'react'
import { apiFetch } from '../lib/api'

/**
 * Settings hook.
 *
 * Fetches settings from the API and builds all 11 settings sections
 * (General, Spam Firewall, Notifications, Appearance, Integrations,
 *  Advanced Auto Moderation, Moderator Management, Data Retention,
 *  API & Webhooks, Backup & Restore, License/Tier).
 * Provides validators and a save handler.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Settings state + save handler.
 */
export function useSettings({ addToast }) {
  const [settingsSections, setSettingsSections] = useState([])
  const [settingsInitialValues, setSettingsInitialValues] = useState({})
  const [, setSettings] = useState({})

  // ── Build settings sections from API data ──────────────────────────
  const buildSections = useCallback((data) => {
    const sections = []
    const initialValues = {}

    if (data.general) {
      sections.push({
        id: 'general',
        title: 'General',
        fields: [
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
        ],
      })
      Object.assign(initialValues, data.general)
    }

    if (data.spam_firewall) {
      sections.push({
        id: 'spam_firewall',
        title: 'Spam Firewall',
        fields: [
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
        ],
      })
      Object.assign(initialValues, data.spam_firewall)
    }

    if (data.notifications) {
      sections.push({
        id: 'notifications',
        title: 'Notifications',
        fields: [
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
        ],
      })
      Object.assign(initialValues, data.notifications)
    }

    if (data.appearance) {
      sections.push({
        id: 'appearance',
        title: '\uD83E\uDDD1\u200D\uD83C\uDFA8 Appearance & Display',
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
            name: 'queue_view',
            label: 'Queue View',
            type: 'select',
            options: [
              { value: 'table', label: 'Table' },
              { value: 'cards', label: 'Cards' },
              { value: 'compact', label: 'Compact' },
            ],
          },
          {
            name: 'items_per_page',
            label: 'Items Per Page',
            type: 'number',
          },
          {
            name: 'date_format',
            label: 'Date Format',
            type: 'select',
            options: [
              { value: 'relative', label: 'Relative (2 hours ago)' },
              { value: 'absolute', label: 'Absolute (Jan 15, 2026)' },
              { value: 'both', label: 'Both' },
            ],
          },
          {
            name: 'timezone',
            label: 'Timezone',
            type: 'select',
            options: [
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'America/New_York' },
              { value: 'America/Chicago', label: 'America/Chicago' },
              { value: 'America/Denver', label: 'America/Denver' },
              { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
              { value: 'Europe/London', label: 'Europe/London' },
              { value: 'Europe/Berlin', label: 'Europe/Berlin' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
            ],
          },
        ],
      })
      Object.assign(initialValues, data.appearance)
    }

    if (data.integrations) {
      sections.push({
        id: 'integrations',
        title: '\uD83D\uDD0C Integrations',
        fields: [
          {
            name: 'auto_import_comments',
            label: 'Auto-Import Comments',
            type: 'toggle',
            helpText: 'Automatically add new comments to the moderation queue',
          },
          {
            name: 'auto_import_posts',
            label: 'Auto-Import Posts',
            type: 'toggle',
            helpText: 'Automatically add new posts to the moderation queue',
          },
          {
            name: 'auto_import_woocommerce',
            label: 'Auto-Import WooCommerce Reviews',
            type: 'toggle',
          },
          {
            name: 'auto_import_bbpress',
            label: 'Auto-Import bbPress Topics/Replies',
            type: 'toggle',
          },
          {
            name: 'auto_import_buddypress',
            label: 'Auto-Import BuddyPress Activity',
            type: 'toggle',
          },
          {
            name: 'auto_import_gravityforms',
            label: 'Auto-Import Gravity Forms Entries',
            type: 'toggle',
          },
          {
            name: 'webhook_url',
            label: 'Webhook URL',
            type: 'text',
            placeholder: 'https://hooks.zapier.com/...',
            helpText: 'Receive real-time moderation events via webhook',
          },
        ],
      })
      Object.assign(initialValues, data.integrations)
    }

    if (data.auto_moderation) {
      sections.push({
        id: 'auto_moderation',
        title: '\uD83E\uDD16 Advanced Auto Moderation',
        fields: [
          {
            name: 'ai_detection_engine',
            label: 'AI Spam Detection Engine',
            type: 'select',
            options: [
              { value: 'none', label: 'None (Firewall only)' },
              { value: 'local', label: 'Local ML Model' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'claude', label: 'Claude' },
              { value: 'gemini', label: 'Gemini' },
              { value: 'custom', label: 'Custom API' },
            ],
            helpText: 'Select an AI engine for intelligent spam classification',
          },
          {
            name: 'ai_api_endpoint',
            label: 'AI API Endpoint',
            type: 'text',
            placeholder: 'https://api.example.com/moderate',
          },
          {
            name: 'ai_api_key',
            label: 'AI API Key',
            type: 'text',
            placeholder: 'Enter your API key',
          },
          {
            name: 'spam_score_flag_threshold',
            label: 'Spam Score Threshold (Flag)',
            type: 'number',
            helpText: 'Score above which items are flagged (0-100)',
          },
          {
            name: 'spam_score_spam_threshold',
            label: 'Spam Score Threshold (Spam)',
            type: 'number',
            helpText: 'Score above which items are marked as spam (0-100)',
          },
          {
            name: 'spam_score_discard_threshold',
            label: 'Spam Score Threshold (Discard)',
            type: 'number',
            helpText: 'Score above which items are silently discarded (0-100)',
          },
          {
            name: 'content_hash_sensitivity',
            label: 'Content Hash Sensitivity',
            type: 'number',
            helpText: 'Simhash Hamming distance threshold (1-10)',
          },
          {
            name: 'max_links_allowed',
            label: 'Max Links Allowed',
            type: 'number',
          },
          {
            name: 'block_all_links',
            label: 'Block All Links',
            type: 'toggle',
            helpText: 'Automatically flag any content with links',
          },
          {
            name: 'allowlist_domains',
            label: 'Allowlist Domains',
            type: 'textarea',
            placeholder: 'One domain per line',
          },
          {
            name: 'block_shortened_urls',
            label: 'Block Shortened URLs',
            type: 'toggle',
            helpText:
              'Flag content with URL shorteners (bit.ly, tinyurl, etc.)',
          },
          {
            name: 'check_link_reputation',
            label: 'Check Link Reputation',
            type: 'toggle',
            helpText: 'Check links against external reputation services',
          },
          {
            name: 'google_safe_browsing_api_key',
            label: 'Google Safe Browsing API Key',
            type: 'text',
            placeholder: 'Enter Google API key',
          },
          {
            name: 'whitelisted_keywords',
            label: 'Whitelisted Keywords',
            type: 'textarea',
            placeholder: 'Keywords that override blacklist matches',
          },
          {
            name: 'regex_patterns',
            label: 'Regex Patterns',
            type: 'textarea',
            placeholder: 'Custom regex patterns, one per line',
          },
          {
            name: 'all_caps_detection',
            label: 'ALL CAPS Detection',
            type: 'toggle',
            helpText: 'Flag content with >70% capital letters',
          },
          {
            name: 'repeated_char_detection',
            label: 'Repeated Character Detection',
            type: 'toggle',
            helpText: 'Flag content with excessive repetition',
          },
          {
            name: 'language_filter',
            label: 'Language Filter',
            type: 'select',
            options: [
              { value: 'all', label: 'All Languages' },
              { value: 'en', label: 'English Only' },
              { value: 'blocked', label: 'Block Specific Languages' },
            ],
          },
          {
            name: 'min_account_age_hours',
            label: 'Min Account Age (Hours)',
            type: 'number',
            helpText: 'Accounts younger than this get extra scrutiny',
          },
          {
            name: 'block_disposable_emails',
            label: 'Block Disposable Emails',
            type: 'toggle',
          },
          {
            name: 'max_posts_per_hour',
            label: 'Max Posts Per Hour',
            type: 'number',
            helpText: 'Rate limiting per user',
          },
          {
            name: 'banned_ip_ranges',
            label: 'Banned IP Ranges',
            type: 'textarea',
            placeholder: 'CIDR notation, one per line',
          },
          {
            name: 'banned_country_codes',
            label: 'Banned Country Codes',
            type: 'textarea',
            placeholder: 'ISO country codes, one per line',
          },
          {
            name: 'vpn_proxy_detection',
            label: 'VPN/Proxy Detection',
            type: 'toggle',
            helpText: 'Flag content from known VPN/proxy IPs',
          },
          {
            name: 'cooldown_between_posts',
            label: 'Cooldown Between Posts (Seconds)',
            type: 'number',
          },
          {
            name: 'duplicate_detection_window_days',
            label: 'Duplicate Detection Window (Days)',
            type: 'number',
          },
          {
            name: 'duplicate_similarity_threshold',
            label: 'Duplicate Similarity Threshold',
            type: 'number',
            helpText: 'Content similarity % for flagging (0-100)',
          },
          {
            name: 'weekend_off_hours_sensitivity',
            label: 'Weekend/Off-Hours Sensitivity',
            type: 'toggle',
            helpText: 'Apply stricter rules during nights and weekends',
          },
          {
            name: 'default_action',
            label: 'Default Action',
            type: 'select',
            options: [
              { value: 'flag', label: 'Flag for review' },
              { value: 'spam', label: 'Mark as spam' },
              { value: 'discard', label: 'Discard silently' },
            ],
          },
          {
            name: 'auto_approve_threshold',
            label: 'Auto-Approve Threshold',
            type: 'number',
            helpText: 'Spam score below this auto-approves (default: 10)',
          },
          {
            name: 'notify_on_auto_discard',
            label: 'Notify on Auto-Discard',
            type: 'toggle',
          },
          {
            name: 'auto_ban_after_n_violations',
            label: 'Auto-Ban After N Violations',
            type: 'number',
            helpText: '0 = disabled',
          },
          {
            name: 'ban_duration',
            label: 'Ban Duration',
            type: 'select',
            options: [
              { value: 'temporary_24h', label: 'Temporary (24h)' },
              { value: 'temporary_7d', label: 'Temporary (7d)' },
              { value: 'temporary_30d', label: 'Temporary (30d)' },
              { value: 'permanent', label: 'Permanent' },
            ],
          },
          {
            name: 'learning_mode',
            label: 'Learning Mode',
            type: 'toggle',
            helpText:
              'Record all rule evaluations but do not take action (audit mode)',
          },
        ],
      })
      Object.assign(initialValues, data.auto_moderation)
    }

    if (data.moderator_management) {
      sections.push({
        id: 'moderator_management',
        title: '\uD83D\uDC65 Moderator Management',
        fields: [
          {
            name: 'secondary_approval_required',
            label: 'Secondary Approval Required',
            type: 'toggle',
            helpText: 'Require a second moderator to approve high-risk actions',
          },
          {
            name: 'action_confirmation_required',
            label: 'Action Confirmation Required',
            type: 'toggle',
            helpText: 'Confirm before approve/reject/spam actions',
          },
        ],
      })
      Object.assign(initialValues, data.moderator_management)
    }

    if (data.data_retention) {
      sections.push({
        id: 'data_retention',
        title: '\uD83D\uDDC4\uFE0F Data Retention',
        fields: [
          {
            name: 'activity_log_retention_days',
            label: 'Activity Log Retention (Days)',
            type: 'number',
            helpText: 'Log entries older than this will be purged',
          },
          {
            name: 'archived_item_retention_days',
            label: 'Archived Item Retention (Days)',
            type: 'number',
          },
          {
            name: 'auto_purge_schedule',
            label: 'Auto-Purge Schedule',
            type: 'select',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'none', label: 'Disabled' },
            ],
          },
          {
            name: 'export_before_purge',
            label: 'Export Before Purge',
            type: 'toggle',
            helpText: 'Auto-export data before deletion',
          },
        ],
      })
      Object.assign(initialValues, data.data_retention)
    }

    if (data.api_webhooks) {
      sections.push({
        id: 'api_webhooks',
        title: '\uD83D\uDD17 API & Webhooks',
        fields: [
          {
            name: 'webhook_new_items',
            label: 'Webhook URL for New Items',
            type: 'text',
            placeholder: 'https://hooks.example.com/new',
            helpText: 'POST new queue items to external URL',
          },
          {
            name: 'webhook_approvals',
            label: 'Webhook URL for Approvals',
            type: 'text',
            placeholder: 'https://hooks.example.com/approved',
          },
          {
            name: 'webhook_spam',
            label: 'Webhook URL for Spam',
            type: 'text',
            placeholder: 'https://hooks.example.com/spam',
          },
          {
            name: 'api_rate_limiting',
            label: 'API Rate Limiting (Requests/Minute)',
            type: 'number',
          },
          {
            name: 'custom_api_secret',
            label: 'Custom API Secret',
            type: 'text',
            placeholder: 'For webhook verification',
          },
        ],
      })
      Object.assign(initialValues, data.api_webhooks)
    }

    if (data.ai_moderation) {
      sections.push({
        id: 'ai_moderation',
        title: '🤖 AI Moderation',
        fields: [
          {
            name: 'engine',
            label: 'AI Moderation Engine',
            type: 'select',
            options: [
              { value: 'none', label: 'Disabled' },
              { value: 'local', label: 'Local (Built-in)' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'claude', label: 'Claude' },
              { value: 'gemini', label: 'Gemini' },
              { value: 'custom', label: 'Custom API' },
            ],
          },
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'text',
            placeholder: 'sk-...',
          },
          {
            name: 'model',
            label: 'Model',
            type: 'text',
            placeholder: 'e.g. gpt-4o-mini, claude-sonnet-4-20250514',
            helpText: 'Model list is fetched live from the AI provider API.',
          },
          {
            name: 'autoModerate',
            label: 'Auto-moderation',
            type: 'toggle',
          },
          {
            name: 'spamThreshold',
            label: 'Spam Threshold',
            type: 'number',
          },
          {
            name: 'enableLanguageDetection',
            label: 'Language Detection',
            type: 'toggle',
          },
          {
            name: 'enableSentimentAnalysis',
            label: 'Sentiment Analysis',
            type: 'toggle',
          },
        ],
      })
      Object.assign(initialValues, data.ai_moderation)
    }

    if (data.backup_restore) {
      sections.push({
        id: 'backup_restore',
        title: '\uD83D\uDCBE Backup & Restore',
        fields: [
          {
            name: 'scheduled_backups',
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
      Object.assign(initialValues, data.backup_restore)
    }

    setSettings(data)
    setSettingsSections(sections)
    setSettingsInitialValues(initialValues)
  }, [])

  // ── Fetch Settings ─────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiFetch('settings')
      buildSections(data)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch settings:', err)
      addToast('Failed to load settings', 'error')
    }
  }, [buildSections, addToast])

  // ── Settings Validators (UX5 Fix) ──────────────────────────────────
  const settingsValidators = useMemo(() => {
    const validators = {}
    for (const section of settingsSections) {
      for (const field of section.fields) {
        if (
          field.name === 'api_endpoint' ||
          field.name === 'apiEndpoint' ||
          field.name === 'ai_api_endpoint'
        ) {
          validators[field.name] = (value) => {
            if (!value || value.trim() === '') {
              return 'API endpoint URL is required'
            }
            try {
              new URL(value)
            } catch {
              return 'Must be a valid URL (e.g. http://localhost:3000)'
            }
            return null
          }
        } else if (
          field.name === 'api_key' ||
          field.name === 'apiKey' ||
          field.name === 'ai_api_key'
        ) {
          validators[field.name] = (value) => {
            if (
              value &&
              typeof value === 'string' &&
              value.trim().length > 0 &&
              value.length < 8
            ) {
              return 'API key seems too short'
            }
            return null
          }
        } else if (
          field.name === 'max_links' ||
          field.name === 'alert_threshold'
        ) {
          validators[field.name] = (value) => {
            if (value === '' || value === null || value === undefined) {
              return null // optional field
            }
            const num = Number(value)
            if (isNaN(num)) {
              return 'Must be a valid number'
            }
            if (num < 1) {
              return 'Must be at least 1'
            }
            if (num > 1000) {
              return 'Value seems too high (max 1000)'
            }
            return null
          }
        } else if (
          field.name === 'spam_threshold' ||
          field.name === 'spamThreshold'
        ) {
          validators[field.name] = (value) => {
            if (value === '' || value === null || value === undefined) {
              return null
            }
            const num = Number(value)
            if (isNaN(num)) {
              return 'Must be a valid number'
            }
            if (num < 0 || num > 1) {
              return 'Spam threshold must be between 0 and 1'
            }
            return null
          }
        } else if (field.type === 'number') {
          validators[field.name] = (value) => {
            if (value === '' || value === null || value === undefined) {
              return null
            }
            if (isNaN(Number(value))) {
              return 'Must be a valid number'
            }
            if (Number(value) < 0) {
              return 'Must be a positive number'
            }
            return null
          }
        } else if (field.required) {
          validators[field.name] = (value) => {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return 'This field is required'
            }
            return null
          }
        }
      }
    }
    return validators
  }, [settingsSections])

  // ── Handle Settings Save ───────────────────────────────────────────
  const handleSettingsSave = useCallback(
    async (formData) => {
      try {
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
        addToast('Settings saved successfully', 'success')
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to save settings:', err)
        addToast(
          'Failed to save settings: ' + (err?.message || 'Unknown error'),
          'error',
        )
      }
    },
    [settingsSections, addToast],
  )

  // Load on mount
  useEffect(() => {
    startTransition(() => {
      fetchSettings()
    })
  }, [])

  return {
    settingsSections,
    settingsInitialValues,
    settingsValidators,
    fetchSettings,
    handleSettingsSave,
  }
}
