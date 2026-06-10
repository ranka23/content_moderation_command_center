/**
 * Settings routes: CRUD, export, import.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 */
function registerSettingsRoutes(router, db) {
  /**
   * GET /api/cmcc/settings
   * Get all settings as key-value object.
   */
  router.get('/settings', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = tryParseJSON(row.value)
    }
    res.json(settings)
  })

  /**
   * PUT /api/cmcc/settings
   * Update settings (upsert).
   */
  router.put('/settings', (req, res) => {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Request body must be a key-value object' })
    }

    const now = new Date().toISOString()
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)'
    )

    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value), now)
      }
    })
    tx()

    res.json({ success: true, updated: Object.keys(body).length })
  })

  /**
   * POST /api/cmcc/settings/export
   * Export all settings as JSON.
   */
  router.post('/settings/export', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = tryParseJSON(row.value)
    }
    res.json(settings)
  })

  /**
   * POST /api/cmcc/settings/import
   * Import settings from JSON object.
   */
  router.post('/settings/import', (req, res) => {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Request body must be a key-value object' })
    }

    const now = new Date().toISOString()
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)'
    )

    let count = 0
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value), now)
        count++
      }
    })
    tx()

    res.json({ success: true, imported: count })
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

module.exports = { registerSettingsRoutes }
