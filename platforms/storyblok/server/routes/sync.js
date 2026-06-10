/**
 * Sync routes — cross-platform sync receiver
 */
const express = require('express')

function createSyncRouter(db, services = {}) {
  const router = express.Router()

  // ── POST /platforms/receive-sync — Receive settings sync ────────────
  router.post('/platforms/receive-sync', async (req, res) => {
    const payload = req.body

    if (!payload || !payload.firewall_rules || !payload.timestamp || !payload.source) {
      return res.status(400).json({
        error: 'Invalid sync payload. Required: firewall_rules, timestamp, source',
      })
    }

    let result = {
      success: false,
      platform: 'storyblok',
      timestamp: new Date().toISOString(),
      error: null,
    }

    if (services.syncReceiver) {
      try {
        result = await services.syncReceiver.receiveSync({
          firewall_rules: payload.firewall_rules || {},
          auto_moderation: payload.auto_moderation || {},
          timestamp: payload.timestamp,
          source: payload.source,
          rules_version: payload.rules_version,
        })
      } catch (err) {
        result = {
          success: false,
          platform: 'storyblok',
          timestamp: new Date().toISOString(),
          error: err.message || 'Sync processing failed',
        }
      }
    } else {
      // Process sync directly without SyncReceiver service
      const upsertStmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `)

      // Map firewall_rules to settings
      if (payload.firewall_rules.max_links !== undefined) {
        upsertStmt.run('maxLinks', String(payload.firewall_rules.max_links))
      }
      if (payload.firewall_rules.blacklisted_keywords !== undefined) {
        upsertStmt.run('blacklistedKeywords', payload.firewall_rules.blacklisted_keywords)
      }
      if (payload.firewall_rules.blacklisted_email_domains !== undefined) {
        upsertStmt.run('blacklistedEmailDomains', payload.firewall_rules.blacklisted_email_domains)
      }
      if (payload.firewall_rules.min_submit_time !== undefined) {
        upsertStmt.run('minSubmitTime', String(payload.firewall_rules.min_submit_time))
      }
      if (payload.firewall_rules.global_action !== undefined) {
        upsertStmt.run('moderationBehavior', payload.firewall_rules.global_action)
      }

      // Map auto_moderation settings
      if (payload.auto_moderation.autoApprove !== undefined) {
        upsertStmt.run('autoApprove', payload.auto_moderation.autoApprove ? 'true' : 'false')
      }
      if (payload.auto_moderation.autoModerate !== undefined) {
        upsertStmt.run('autoModerate', payload.auto_moderation.autoModerate ? 'true' : 'false')
      }

      result = {
        success: true,
        platform: 'storyblok',
        timestamp: new Date().toISOString(),
      }
    }

    res.json(result)
  })

  return router
}

module.exports = { createSyncRouter }
