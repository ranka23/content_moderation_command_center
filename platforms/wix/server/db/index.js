const Database = require('better-sqlite3')
const { runMigrations } = require('./migrations')

/**
 * Holds the active database connection.
 * @type {Database.Database|null}
 */
let db = null

/**
 * Get or initialize the database connection.
 * If no path is provided, uses ':memory:' for testing.
 *
 * @param {string} [path] - Optional file path for the database
 * @returns {Database.Database}
 */
function getDb(path) {
  if (!db) {
    db = new Database(path || ':memory:')
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  }
  return db
}

/**
 * Close the database connection and reset the singleton.
 */
function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getDb, closeDb }
