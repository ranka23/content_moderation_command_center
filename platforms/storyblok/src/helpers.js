/**
 * CMCC Storyblok - Helper utilities and constants
 *
 * Extracted from App.jsx to keep the main file under 500 lines.
 * Contains settings definitions, validators, keyboard shortcuts,
 * and data mapping helpers.
 */
// ── Default Settings ─────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  apiEndpoint: '',
  apiKey: '',
  spamThreshold: 0.7,
  autoApprove: false,
  notifyOnSpike: true,
  notifyOnSpam: true,
  queuePollInterval: 30,
  autoModerate: false,
  moderationBehavior: 'flag',
  maxLinks: 5,
  blacklistedKeywords: '',
  blacklistedEmailDomains: '',
  duplicateDetection: true,
  emailAlerts: false,
  alertThreshold: 50,
  theme: 'light',
  queueView: 'table',
  itemsPerPage: 25,
  aiDetectionEngine: 'none',
  aiApiEndpoint: '',
  aiApiKey: '',
  spamScoreFlagThreshold: 30,
  spamScoreSpamThreshold: 70,
  spamScoreDiscardThreshold: 90,
  learningMode: false,
  activityLogRetentionDays: 90,
  autoPurgeSchedule: 'never',
  siteName: '',
  locale: 'en-US',
  timezone: 'UTC',
  enableSlack: false,
  slackWebhookUrl: '',
  enableDiscord: false,
  discordWebhookUrl: '',
  enablePagerDuty: false,
  pagerDutyKey: '',
  defaultModeratorRole: 'moderator',
  requireAssignment: false,
  maxDailyActions: 100,
  notifyOnAssignment: true,
  enableAutoBackup: false,
  backupSchedule: 'never',
  backupLocation: '',
  maxBackups: 10,
}

// ── Settings Sections ────────────────────────────────────────────────
export const SETTINGS_SECTIONS = [
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
      },
      {
        name: 'autoApprove',
        label: 'Auto-approve safe items',
        type: 'toggle',
        helpText: 'Automatically approve items with spam score below threshold',
      },
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
        name: 'blacklistedEmailDomains',
        label: 'Blacklisted Email Domains',
        type: 'textarea',
        placeholder: 'e.g. spam.com',
      },
      {
        name: 'duplicateDetection',
        label: 'Enable Duplicate Detection',
        type: 'toggle',
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
      {
        name: 'queuePollInterval',
        label: 'Queue Poll Interval (seconds)',
        type: 'number',
        placeholder: '30',
        helpText: 'How often to check for new items in the queue',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance & Display',
    fields: [
      {
        name: 'queueView',
        label: 'Queue View',
        type: 'select',
        options: [
          { value: 'table', label: 'Table' },
          { value: 'cards', label: 'Cards' },
          { value: 'compact', label: 'Compact' },
        ],
      },
      {
        name: 'itemsPerPage',
        label: 'Items Per Page',
        type: 'number',
      },
    ],
  },
  {
    id: 'auto_moderation',
    title: 'Advanced Auto Moderation',
    fields: [
      {
        name: 'aiDetectionEngine',
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
        name: 'aiApiEndpoint',
        label: 'AI API Endpoint',
        type: 'text',
        placeholder: 'https://api.example.com/moderate',
      },
      {
        name: 'spamScoreFlagThreshold',
        label: 'Spam Score Threshold (Flag)',
        type: 'number',
        helpText: 'Score above which items are flagged (0-100)',
      },
      {
        name: 'spamScoreSpamThreshold',
        label: 'Spam Score Threshold (Spam)',
        type: 'number',
        helpText: 'Score above which items are marked as spam (0-100)',
      },
      {
        name: 'learningMode',
        label: 'Learning Mode',
        type: 'toggle',
        helpText:
          'Record all rule evaluations but do not take action (audit mode)',
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
        helpText: 'Log entries older than this will be purged',
      },
      {
        name: 'autoPurgeSchedule',
        label: 'Auto-Purge Schedule',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'never', label: 'Disabled' },
        ],
      },
    ],
  },
  {
    id: 'general',
    title: 'General',
    fields: [
      {
        name: 'siteName',
        label: 'Site Name',
        type: 'text',
        placeholder: 'My CMCC Instance',
        helpText: 'A friendly name for this CMCC instance',
      },
      {
        name: 'locale',
        label: 'Locale',
        type: 'select',
        options: [
          { value: 'en-US', label: 'English (US)' },
          { value: 'en-GB', label: 'English (UK)' },
          { value: 'es', label: 'Spanish' },
          { value: 'fr', label: 'French' },
          { value: 'de', label: 'German' },
        ],
        helpText: 'Display language for this CMCC instance',
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        options: [
          { value: 'UTC', label: 'UTC' },
          { value: 'America/New_York', label: 'America/New_York' },
          { value: 'America/Chicago', label: 'America/Chicago' },
          { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
          { value: 'Europe/London', label: 'Europe/London' },
          { value: 'Europe/Berlin', label: 'Europe/Berlin' },
          { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
          { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
        ],
        helpText: 'Timezone for timestamps and scheduled reports',
      },
    ],
  },
  {
    id: 'integrators',
    title: 'Integrations',
    fields: [
      {
        name: 'enableSlack',
        label: 'Slack Notifications',
        type: 'toggle',
        helpText: 'Send moderation alerts to a Slack channel',
      },
      {
        name: 'slackWebhookUrl',
        label: 'Slack Webhook URL',
        type: 'text',
        placeholder: 'https://hooks.slack.com/services/...',
      },
      {
        name: 'enableDiscord',
        label: 'Discord Notifications',
        type: 'toggle',
        helpText: 'Send moderation alerts to a Discord channel',
      },
      {
        name: 'discordWebhookUrl',
        label: 'Discord Webhook URL',
        type: 'text',
        placeholder: 'https://discord.com/api/webhooks/...',
      },
      {
        name: 'enablePagerDuty',
        label: 'PagerDuty Alerts',
        type: 'toggle',
        helpText: 'Send critical alerts to PagerDuty',
      },
      {
        name: 'pagerDutyKey',
        label: 'PagerDuty Integration Key',
        type: 'text',
        placeholder: 'Enter your PagerDuty key',
      },
    ],
  },
  {
    id: 'moderator_management',
    title: 'Moderator Management',
    fields: [
      {
        name: 'defaultModeratorRole',
        label: 'Default Moderator Role',
        type: 'select',
        options: [
          { value: 'admin', label: 'Admin' },
          { value: 'moderator', label: 'Moderator' },
          { value: 'viewer', label: 'Viewer (read-only)' },
        ],
        helpText: 'Default role assigned to new team members',
      },
      {
        name: 'requireAssignment',
        label: 'Require Assignment Before Action',
        type: 'toggle',
        helpText:
          'Moderators must be assigned an item before they can act on it',
      },
      {
        name: 'maxDailyActions',
        label: 'Max Daily Actions Per Moderator',
        type: 'number',
        placeholder: '100',
        helpText:
          'Limit the number of moderation actions per day per moderator (0 = unlimited)',
      },
      {
        name: 'notifyOnAssignment',
        label: 'Notify on Assignment',
        type: 'toggle',
        helpText: 'Send notification when an item is assigned to a moderator',
      },
    ],
  },
  {
    id: 'backup_restore',
    title: 'Backup & Restore',
    fields: [
      {
        name: 'enableAutoBackup',
        label: 'Enable Automatic Backups',
        type: 'toggle',
        helpText: 'Automatically backup settings and configuration',
      },
      {
        name: 'backupSchedule',
        label: 'Backup Schedule',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'never', label: 'Disabled' },
        ],
      },
      {
        name: 'backupLocation',
        label: 'Backup Storage Location',
        type: 'text',
        placeholder: '/path/to/backup/directory',
        helpText: 'Local filesystem path or S3 bucket URL',
      },
      {
        name: 'maxBackups',
        label: 'Max Backups to Retain',
        type: 'number',
        placeholder: '10',
        helpText: 'Number of backup copies to keep before rotating',
      },
    ],
  },
]

// ── Settings Validators ──────────────────────────────────────────────
export const SETTINGS_VALIDATORS = {
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

// ── Tabs ─────────────────────────────────────────────────────────────
export const TABS = [
  'Queue',
  'Analytics',
  'Activity Log',
  'Reports',
  'Settings',
]

// ── Keyboard Shortcuts ───────────────────────────────────────────────
export const KEYBOARD_SHORTCUTS = [
  { key: 'a', description: 'Approve selected item' },
  { key: 'r', description: 'Reject selected item' },
  { key: 's', description: 'Mark as Spam' },
  { key: 'd', description: 'Defer selected item' },
  { key: 'v', description: 'View item details' },
  { key: 'f', description: 'Focus search' },
  { key: 'Escape', description: 'Close panel / Cancel' },
  { key: '?', description: 'Toggle keyboard shortcut help' },
]

// ── Platform Hub Cards ───────────────────────────────────────────────
export const PLATFORM_CARDS = [
  { name: 'Storyblok', icon: 'storyblok', status: 'active', connected: true },
  {
    name: 'WordPress',
    icon: 'wordpress',
    status: 'available',
    connected: false,
  },
  { name: 'Shopify', icon: 'shopify', status: 'available', connected: false },
  { name: 'Strapi', icon: 'strapi', status: 'available', connected: false },
  { name: 'Wix', icon: 'wix', status: 'available', connected: false },
]

// ── Bulk Actions That Need User Deactivation ─────────────────────────
export const BULK_ACTIONS_THAT_NEED_USER_DEACTIVATION = ['deactivate-users']
