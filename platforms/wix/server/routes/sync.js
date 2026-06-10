/**
 * Sync routes: cross-platform settings sync receiver.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerSyncRoutes(router, db, services) {
  const syncReceiver = services.syncReceiver

  // Register callback to apply sync'd settings
  syncReceiver.onSettingsSync((settings) => {
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)',
    )
    const now = new Date().toISOString()
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value), now)
    }
  })
}

module.exports = { registerSyncRoutes }
