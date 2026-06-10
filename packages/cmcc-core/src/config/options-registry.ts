/**
 * CMCC Options Registry
 *
 * Central registry for all shared setting option lists.
 * Every platform was duplicating these exact lists in their
 * settings forms — now they import from one place.
 *
 * For lists that have an authoritative external source
 * (timezones from IANA, locales from Unicode), we generate
 * them dynamically from the `Intl` API so they stay up to
 * date without manual maintenance.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// Moderation Options
// --------------------------------------------------------------------------

export interface SelectOption {
  value: string
  label: string
}

/** Moderation actions that can be taken on content. */
export function getModerationActions(): SelectOption[] {
  return [
    { value: 'approve', label: 'Approve' },
    { value: 'flag', label: 'Flag for review' },
    { value: 'spam', label: 'Mark as spam' },
    { value: 'discard', label: 'Discard silently' },
    { value: 'defer', label: 'Defer decision' },
  ]
}

/** Moderation behaviour (what to do when auto-moderation triggers). */
export function getModerationBehaviors(): SelectOption[] {
  return [
    { value: 'flag', label: 'Flag for review' },
    { value: 'spam', label: 'Mark as spam' },
    { value: 'discard', label: 'Discard silently' },
  ]
}

/** AI detection engines available for content moderation. */
export function getAiEngineOptions(): SelectOption[] {
  return [
    { value: 'none', label: 'Disabled' },
    { value: 'local', label: 'Local (Built-in)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'claude', label: 'Claude (Anthropic)' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'custom', label: 'Custom API' },
  ]
}

/** Default moderation action when firewall rules trigger. */
export function getDefaultActions(): SelectOption[] {
  return [
    { value: 'flag', label: 'Flag for review' },
    { value: 'spam', label: 'Mark as spam' },
    { value: 'discard', label: 'Discard silently' },
  ]
}

// --------------------------------------------------------------------------
// Display Options (dynamically generated)
// --------------------------------------------------------------------------

const THEME_OPTIONS: SelectOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function getThemeOptions(): SelectOption[] {
  return THEME_OPTIONS
}

const QUEUE_VIEW_OPTIONS: SelectOption[] = [
  { value: 'table', label: 'Table' },
  { value: 'cards', label: 'Cards' },
  { value: 'compact', label: 'Compact' },
]

export function getQueueViewOptions(): SelectOption[] {
  return QUEUE_VIEW_OPTIONS
}

const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'relative', label: 'Relative (2 hours ago)' },
  { value: 'absolute', label: 'Absolute (Jan 15, 2026)' },
  { value: 'both', label: 'Both' },
]

export function getDateFormatOptions(): SelectOption[] {
  return DATE_FORMAT_OPTIONS
}

// --------------------------------------------------------------------------
// Locale Options (generated from the Intl API)
// --------------------------------------------------------------------------

/**
 * Get a sorted list of locale options for language selection.
 *
 * Uses `Intl.DisplayNames` to generate human-readable language names
 * from well-known BCP 47 tags, so new locales are automatically
 * available as browsers update their language databases.
 */
export function getLocaleOptions(): SelectOption[] {
  const locales = [
    'en-US',
    'en-GB',
    'en-AU',
    'en-CA',
    'es-ES',
    'es-MX',
    'fr-FR',
    'fr-CA',
    'de-DE',
    'it-IT',
    'pt-BR',
    'pt-PT',
    'nl-NL',
    'ru-RU',
    'ja-JP',
    'ko-KR',
    'zh-CN',
    'zh-TW',
    'ar-SA',
    'hi-IN',
    'tr-TR',
    'pl-PL',
    'sv-SE',
    'da-DK',
    'fi-FI',
    'nb-NO',
    'cs-CZ',
    'hu-HU',
    'ro-RO',
    'th-TH',
    'vi-VN',
    'el-GR',
    'he-IL',
    'id-ID',
    'ms-MY',
    'uk-UA',
  ]

  try {
    const nameFormatter = new Intl.DisplayNames('en', { type: 'language' })
    return locales
      .map((code) => {
        try {
          const lang = new Intl.Locale(code)
          const baseLabel = nameFormatter.of(lang.language ?? code) ?? code
          const region = lang.region
          const label = region ? `${baseLabel} (${region})` : baseLabel
          return { value: code, label }
        } catch {
          return { value: code, label: code }
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    // Fallback if Intl.DisplayNames is not available
    return [
      { value: 'en-US', label: 'English (US)' },
      { value: 'en-GB', label: 'English (UK)' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
    ]
  }
}

// --------------------------------------------------------------------------
// Timezone Options (generated from the Intl API)
// --------------------------------------------------------------------------

/**
 * Get a sorted list of timezone options.
 *
 * Uses `Intl.supportedValuesOf('timeZone')` which returns the IANA
 * timezone names supported by the JavaScript runtime. This stays
 * automatically in sync with the IANA timezone database as the
 * runtime is updated.
 */
export function getTimezoneOptions(): SelectOption[] {
  try {
    const zones = Intl.supportedValuesOf('timeZone')
    return zones
      .map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    // Fallback if Intl.supportedValuesOf is not available
    return [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'America/New_York' },
      { value: 'America/Chicago', label: 'America/Chicago' },
      { value: 'America/Denver', label: 'America/Denver' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'Europe/Berlin', label: 'Europe/Berlin' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
      { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney' },
    ]
  }
}

// --------------------------------------------------------------------------
// Schedule Options
// --------------------------------------------------------------------------

const PURGE_SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'Disabled' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function getPurgeScheduleOptions(): SelectOption[] {
  return PURGE_SCHEDULE_OPTIONS
}

const BACKUP_SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function getBackupScheduleOptions(): SelectOption[] {
  return BACKUP_SCHEDULE_OPTIONS
}

// --------------------------------------------------------------------------
// Moderation / Threshold Options
// --------------------------------------------------------------------------

const LANGUAGE_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Languages' },
  { value: 'en', label: 'English Only' },
  { value: 'blocked', label: 'Block Specific Languages' },
]

export function getLanguageFilterOptions(): SelectOption[] {
  return LANGUAGE_FILTER_OPTIONS
}

const BAN_DURATION_OPTIONS: SelectOption[] = [
  { value: 'temporary_24h', label: 'Temporary (24h)' },
  { value: 'temporary_7d', label: 'Temporary (7 days)' },
  { value: 'temporary_30d', label: 'Temporary (30 days)' },
  { value: 'permanent', label: 'Permanent' },
]

export function getBanDurationOptions(): SelectOption[] {
  return BAN_DURATION_OPTIONS
}

// --------------------------------------------------------------------------
// Notification / Integration Options
// --------------------------------------------------------------------------

const INTEGRATION_PROVIDERS: SelectOption[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
  { value: 'email', label: 'Email' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'pagerduty', label: 'PagerDuty' },
]

export function getIntegrationProviders(): SelectOption[] {
  return INTEGRATION_PROVIDERS
}

const MODERATOR_ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'viewer', label: 'Viewer (read-only)' },
]

export function getModeratorRoleOptions(): SelectOption[] {
  return MODERATOR_ROLE_OPTIONS
}
