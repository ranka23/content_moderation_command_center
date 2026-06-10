/**
 * Platform routes - multi-platform status and sync endpoints.
 */

const express = require('express')
const router = express.Router()
const settingsService = require('../services/settings-service')

module.exports = function (services) {
  const { db, syncReceiver } = services

  // GET /api/cmcc/platforms/status - Get platform status
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        platform: 'shopify',
        version: '1.0.0',
        status: 'active',
        syncedPlatforms: ['wordpress'],
        lastSync: null,
        uptime: process.uptime(),
      },
    })
  })

  // POST /api/cmcc/platforms/sync-settings - Sync settings to other platforms
  router.post('/sync-settings', (req, res) => {
    const { targetPlatforms, source } = req.body
    const settings = settingsService.getSettings(db)

    res.json({
      success: true,
      data: {
        synced: targetPlatforms || [],
        source: source || 'shopify',
        settings: {
          auto_moderation: { enabled: settings.auto_moderate === 'true', threshold: parseFloat(settings.spam_threshold || 0.5) },
          firewall_rules: {},
        },
        timestamp: new Date().toISOString(),
      },
    })
  })

  // POST /api/cmcc/platforms/receive-sync - Receive sync from WordPress
  router.post('/receive-sync', async (req, res, next) => {
    try {
      const result = await syncReceiver.receiveSync(req.body)
      if (result.success) {
        // Update settings from sync if provided
        if (req.body.auto_moderation) {
          const settingsToUpdate = {}
          for (const [key, value] of Object.entries(req.body.auto_moderation)) {
            settingsToUpdate[`sync_${key}`] = String(value)
          }
          if (Object.keys(settingsToUpdate).length > 0) {
            settingsService.updateSettings(db, settingsToUpdate)
          }
        }
      }
      res.json(result.success ? { success: true, data: result } : { success: false, error: result.error })
    } catch (err) {
      next(err)
    }
  })

  return router
}
