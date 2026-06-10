/**
 * Test helper for server tests.
 * Sets up an in-memory SQLite database and creates an Express app for testing.
 */

const Database = require('better-sqlite3')
const path = require('path')

/**
 * Create an in-memory database with all tables.
 * @param {string} ns - Namespace for the database name
 */
async function setupDb(_ns = 'test') {
  const db = new Database(':memory:')

  // Create tables (same as migrations.js but inline for test isolation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT UNIQUE NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'comment',
      status TEXT NOT NULL DEFAULT 'pending',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      author_name TEXT DEFAULT '',
      author_email TEXT DEFAULT '',
      author_ip TEXT DEFAULT '',
      author_id TEXT DEFAULT '',
      spam_score REAL DEFAULT 0,
      platform TEXT DEFAULT 'storyblok',
      assigned_to TEXT DEFAULT NULL,
      assigned_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      moderated_at TEXT DEFAULT NULL,
      notes TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      action TEXT NOT NULL,
      moderator_id TEXT DEFAULT '',
      moderator_name TEXT DEFAULT '',
      content_type TEXT DEFAULT '',
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'csv',
      emails TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_sent_at TEXT DEFAULT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS webhook_configs (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '[]',
      headers TEXT DEFAULT '{}',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_hooks (
      name TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `)

  return { db }
}

/**
 * Tear down the database.
 */
async function teardownDb(db) {
  if (db) {
    db.close()
  }
}

/**
 * Create an Express app from the server module.
 */
function createApp(db) {
  // Clear module cache to ensure fresh app
  const serverPath = path.join(__dirname, '..', 'index.js')
  delete require.cache[require.resolve(serverPath)]
  const server = require(serverPath)
  return server.createApp(db, 'test-key')
}

module.exports = { setupDb, teardownDb, createApp }
