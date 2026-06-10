/**
 * Platforms routes: status, sync-settings, receive-sync, unified-queue.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerPlatformsRoutes(router, db, services) {
  const syncReceiver = services.syncReceiver
  const eventBus = services.eventBus

  /**
   * GET /api/cmcc/platforms/status
   * Returns platform connection status.
   */
  router.get('/platforms/status', (req, res) => {
    res.json({
      platform: 'wix',
      connected: true,
      version: '1.0.0',
      services: {
        firewall: !!services.firewallService,
        email: false, // smtp configured at runtime
        webhooks: true,
        retention: true,
        undo: true,
        reports: true,
        sync: true,
        websocket: true,
      },
    })
  })

  /**
   * POST /api/cmcc/platforms/sync-settings
   * Sync settings to other platforms via the hub.
   */
  router.post('/platforms/sync-settings', (req, res) => {
    const { targetPlatforms } = req.body

    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = tryParseJSON(row.value)
    }

    // Build sync payload
    const payload = {
      source: 'wix',
      timestamp: new Date().toISOString(),
      settings,
      targetPlatforms: targetPlatforms || [],
    }

    res.json({
      success: true,
      platform: 'wix',
      syncedSettings: settings,
      targetPlatforms: targetPlatforms || [],
      payload,
    })
  })

  /**
   * POST /api/cmcc/platforms/receive-sync
   * Receive sync payload from the WordPress Multi-Platform Hub.
   */
  router.post('/platforms/receive-sync', async (req, res) => {
    const payload = req.body

    try {
      const result = await syncReceiver.receiveSync(payload)
      if (!result.success) {
        return res.status(400).json(result)
      }

      // Apply received firewall rules to local service
      if (payload.firewall_rules) {
        const fwConfig = {}
        if (payload.firewall_rules.max_links !== undefined)
          fwConfig.maxLinks = payload.firewall_rules.max_links
        if (payload.firewall_rules.blacklisted_keywords !== undefined)
          fwConfig.blacklistedKeywords =
            payload.firewall_rules.blacklisted_keywords
        if (payload.firewall_rules.blacklisted_email_domains !== undefined)
          fwConfig.blacklistedEmailDomains =
            payload.firewall_rules.blacklisted_email_domains
        if (payload.firewall_rules.min_submit_time !== undefined)
          fwConfig.minSubmitTime = payload.firewall_rules.min_submit_time
        if (payload.firewall_rules.enable_duplicate_detection !== undefined)
          fwConfig.enableDuplicateDetection =
            payload.firewall_rules.enable_duplicate_detection
        if (payload.firewall_rules.global_action !== undefined)
          fwConfig.globalAction = payload.firewall_rules.global_action
        services.firewallService.updateConfig(fwConfig)
      }

      // Apply received settings to database
      if (
        payload.auto_moderation &&
        typeof payload.auto_moderation === 'object'
      ) {
        const upsert = db.prepare(
          'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)',
        )
        const now = new Date().toISOString()
        for (const [key, value] of Object.entries(payload.auto_moderation)) {
          upsert.run(key, String(value), now)
        }
      }

      eventBus.publishAction(
        'system',
        'System',
        `Synced settings from ${payload.source}`,
        undefined,
        undefined,
      )

      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  /**
   * GET /api/cmcc/unified-queue
   * Returns aggregated queue across platforms.
   */
  router.get('/unified-queue', (req, res) => {
    const page = Math.max(0, parseInt(req.query.page, 10) || 0)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize, 10) || 20),
    )

    const total = db
      .prepare('SELECT COUNT(*) as count FROM queue_items')
      .get().count
    const items = db
      .prepare(
        'SELECT * FROM queue_items ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      )
      .all(pageSize, page * pageSize)

    const platforms = db
      .prepare('SELECT DISTINCT platform FROM queue_items')
      .all()
      .map((r) => r.platform)

    res.json({
      items: items.map((i) => ({ ...i, metadata: tryParseJSON(i.metadata) })),
      platforms,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  })
}

function tryParseJSON(str) {
  if (!str) return str
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

module.exports = { registerPlatformsRoutes }
