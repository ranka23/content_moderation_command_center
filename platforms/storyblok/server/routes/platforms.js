/**
 * Platforms routes — multi-platform status and sync
 */
const express = require('express')

const PLATFORMS = [
  { name: 'Storyblok', icon: '🖼️', status: 'active', connected: true },
  { name: 'WordPress', icon: '🌐', status: 'available', connected: false },
  { name: 'Shopify', icon: '🛍️', status: 'available', connected: false },
  { name: 'Strapi', icon: '🟣', status: 'available', connected: false },
  { name: 'Wix', icon: '🎪', status: 'available', connected: false },
]

function createPlatformsRouter(db, _services = {}) {
  const router = express.Router()

  // ── GET /platforms/status ────────────────────────────────────────────
  router.get('/status', (req, res) => {
    res.json({
      platforms: PLATFORMS,
      current: 'storyblok',
      lastSync: null,
    })
  })

  // ── POST /platforms/sync-settings ────────────────────────────────────
  router.post('/sync-settings', (req, res) => {
    const { targetPlatforms } = req.body

    if (
      !targetPlatforms ||
      !Array.isArray(targetPlatforms) ||
      targetPlatforms.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'targetPlatforms must be a non-empty array' })
    }

    // Read current settings
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }

    const syncedTo = targetPlatforms.filter((p) =>
      PLATFORMS.some((pf) => pf.name.toLowerCase() === p.toLowerCase()),
    )

    res.json({
      success: true,
      syncedTo,
      settingsCount: Object.keys(settings).length,
    })
  })

  // ── GET /unified-queue ──────────────────────────────────────────────
  router.get('/unified-queue', (req, res) => {
    const { page = '1', perPage = '25', status } = req.query
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage, 10) || 25))
    const offset = (pageNum - 1) * perPageNum

    const conditions = []
    const params = []

    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM queue_items ${whereClause}`)
      .get(...params)

    const items = db
      .prepare(
        `SELECT * FROM queue_items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, perPageNum, offset)

    res.json({
      items,
      total: countRow.total,
      page: pageNum,
      totalPages: Math.ceil(countRow.total / perPageNum) || 0,
    })
  })

  return router
}

module.exports = { createPlatformsRouter }
