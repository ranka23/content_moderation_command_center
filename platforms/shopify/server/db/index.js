/**
 * Database setup for CMCC Shopify backend.
 * Uses better-sqlite3 for a local SQLite database.
 */

const path = require('path')
const Database = require('better-sqlite3')

let db = null

/**
 * Get the database instance. Creates and initializes it if needed.
 * Uses an in-memory database for testing when DB_PATH is ':memory:'.
 */
function getDb() {
  if (db) return db

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'cmcc.db')
  db = new Database(dbPath)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

/**
 * Initialize the database and run migrations.
 */
function initDb() {
  const database = getDb()
  runMigrations(database)
  return database
}

/**
 * Run database migrations to create tables.
 */
function runMigrations(database) {
  const dbInstance = database || getDb()

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS queue_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      spam_score REAL DEFAULT 0,
      author_id TEXT,
      author_name TEXT,
      author_email TEXT,
      author_ip TEXT,
      title TEXT,
      excerpt TEXT,
      date_gmt TEXT,
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moderator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      content_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_title TEXT,
      previous_status TEXT,
      new_status TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      format TEXT DEFAULT 'csv',
      emails TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT,
      last_sent_at TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS webhook_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      moderator_id TEXT NOT NULL,
      moderator_name TEXT,
      note TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      assigned_to TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_items(status);
    CREATE INDEX IF NOT EXISTS idx_queue_content_type ON queue_items(content_type);
    CREATE INDEX IF NOT EXISTS idx_queue_created ON queue_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_queue_assigned ON queue_items(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_activity_item ON activity_logs(item_id);
    CREATE INDEX IF NOT EXISTS idx_activity_moderator ON activity_logs(moderator_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_item ON item_notes(item_id);
  `)
}

/**
 * Close the database connection.
 */
function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getDb, initDb, runMigrations, closeDb }
