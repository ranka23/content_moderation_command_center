/**
 * Settings service - handles settings CRUD, export, and import.
 */

/**
 * Get all settings as an object.
 */
function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

/**
 * Update settings from an object of key-value pairs.
 */
function updateSettings(db, settings) {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )

  const transaction = db.transaction((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      upsert.run(key, String(value))
    }
  })

  transaction(settings)
  return getSettings(db)
}

/**
 * Export settings as a JSON-serializable object.
 */
function exportSettings(db) {
  const settings = getSettings(db)
  return {
    exportedAt: new Date().toISOString(),
    platform: 'shopify',
    version: '1.0',
    settings,
  }
}

/**
 * Import settings from an exported object.
 */
function importSettings(db, importData) {
  if (!importData || !importData.settings || typeof importData.settings !== 'object') {
    const err = new Error('Invalid import data: missing "settings" object')
    err.statusCode = 400
    throw err
  }

  return updateSettings(db, importData.settings)
}

module.exports = {
  getSettings,
  updateSettings,
  exportSettings,
  importSettings,
}
