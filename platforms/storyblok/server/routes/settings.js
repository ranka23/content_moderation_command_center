/**
 * Settings routes — CRUD + export/import
 */
const express = require('express')

// Default settings matching the frontend's DEFAULT_SETTINGS
const DEFAULT_SETTINGS = {
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

function createSettingsRouter(db, services = {}) {
  const router = express.Router()

  /**
   * Read all settings from DB and merge with defaults.
   */
  function readSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const stored = {}
    for (const row of rows) {
      const val = row.value
      // Coerce strings to appropriate types based on defaults
      const defaultVal = DEFAULT_SETTINGS[row.key]
      if (typeof defaultVal === 'boolean') {
        stored[row.key] = val === 'true'
      } else if (typeof defaultVal === 'number') {
        stored[row.key] = parseFloat(val) || 0
      } else {
        stored[row.key] = val
      }
    }
    return { ...DEFAULT_SETTINGS, ...stored }
  }

  // ── GET /settings ───────────────────────────────────────────────────
  router.get('/', (req, res) => {
    const settings = readSettings()
    res.json(settings)
  })

  // ── PUT /settings — Update settings ─────────────────────────────────
  router.put('/', (req, res) => {
    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Request body must be an object' })
    }

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `)

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (key in DEFAULT_SETTINGS) {
          upsertStmt.run(key, String(value))
        }
      }
    })
    transaction()

    // Sync with FirewallService if configured
    if (services.firewallService) {
      const fwConfig = {}
      if (updates.maxLinks !== undefined) fwConfig.maxLinks = updates.maxLinks
      if (updates.blacklistedKeywords !== undefined) {
        fwConfig.blacklistedKeywords = updates.blacklistedKeywords
          ? updates.blacklistedKeywords
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      }
      if (updates.duplicateDetection !== undefined)
        fwConfig.enableDuplicateDetection = updates.duplicateDetection
      if (Object.keys(fwConfig).length > 0) {
        services.firewallService.updateConfig(fwConfig)
      }
    }

    // Update retention service
    if (services.retentionService) {
      if (updates.activityLogRetentionDays !== undefined) {
        const schedule =
          updates.autoPurgeSchedule || DEFAULT_SETTINGS.autoPurgeSchedule
        const validSchedules = ['daily', 'weekly', 'monthly', 'never']
        services.retentionService.updateConfig({
          activityLogRetentionDays: updates.activityLogRetentionDays,
          autoPurgeSchedule: validSchedules.includes(schedule)
            ? schedule
            : 'never',
        })
      }
    }

    res.json({ success: true })
  })

  // ── POST /settings/export ───────────────────────────────────────────
  router.post('/export', (req, res) => {
    const settings = readSettings()
    // Convert settings to CSV format: key,value rows
    const header = 'key,value\n'
    const csv =
      header +
      Object.entries(settings)
        .map(([key, value]) => {
          const val = String(value ?? '')
          // Escape quotes and commas for CSV
          const escaped =
            val.includes(',') || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val
          return `${key},${escaped}`
        })
        .join('\n') +
      '\n'

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cmcc-settings-${new Date().toISOString().slice(0, 10)}.csv"`,
    )
    res.send(csv)
  })

  // ── POST /settings/import ───────────────────────────────────────────
  router.post('/import', (req, res) => {
    const data = req.body
    if (!data || typeof data !== 'object') {
      return res
        .status(400)
        .json({ error: 'Import data must be a JSON object' })
    }

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `)

    let imported = 0
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        if (key in DEFAULT_SETTINGS) {
          upsertStmt.run(key, String(value))
          imported++
        }
      }
    })
    transaction()

    res.json({ success: true, imported })
  })

  return router
}

module.exports = { createSettingsRouter, DEFAULT_SETTINGS }
