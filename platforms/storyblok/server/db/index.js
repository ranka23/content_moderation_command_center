/**
 * Database setup for CMCC Storyblok server.
 * Creates and returns a SQLite database instance.
 */
const Database = require('better-sqlite3')
const path = require('path')
const { runMigrations } = require('./migrations')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'cmcc-storyblok.db')

let dbInstance = null

/**
 * Get or create the database instance.
 * @param {string} [customPath] - Optional custom database path
 * @returns {import('better-sqlite3').Database}
 */
function getDb(customPath) {
  if (dbInstance) return dbInstance

  const dbPath = customPath || DB_PATH

  // Ensure the directory exists
  const dir = path.dirname(dbPath)
  const fs = require('fs')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  dbInstance = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('foreign_keys = ON')

  // Run migrations
  runMigrations(dbInstance)

  return dbInstance
}

/**
 * Close the database connection.
 */
function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

module.exports = { getDb, closeDb }
