/**
 * Database migrations for CMCC Wix server.
 * Creates all required tables if they don't exist.
 *
 * @param {import('better-sqlite3').Database} db
 */
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      contentType TEXT NOT NULL,
      itemId TEXT,
      authorName TEXT,
      authorEmail TEXT,
      authorIP TEXT,
      content TEXT,
      title TEXT,
      status TEXT DEFAULT 'pending',
      assignedTo TEXT,
      assignedAt TEXT,
      spamScore REAL DEFAULT 0,
      flags INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      moderatedAt TEXT,
      moderatedBy TEXT,
      metadata TEXT DEFAULT '{}',
      platform TEXT DEFAULT 'wix'
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      itemId TEXT,
      action TEXT NOT NULL,
      actorId TEXT,
      actorName TEXT,
      description TEXT,
      contentType TEXT,
      details TEXT DEFAULT '{}',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      format TEXT DEFAULT 'csv',
      emails TEXT NOT NULL,
      createdBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      lastSentAt TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS webhook_configs (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      events TEXT DEFAULT '[]',
      headers TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS queue_notes (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      authorName TEXT,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_hooks (
      name TEXT PRIMARY KEY,
      contentType TEXT NOT NULL,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_items(status);
    CREATE INDEX IF NOT EXISTS idx_queue_contentType ON queue_items(contentType);
    CREATE INDEX IF NOT EXISTS idx_queue_createdAt ON queue_items(createdAt);
    CREATE INDEX IF NOT EXISTS idx_queue_platform ON queue_items(platform);
    CREATE INDEX IF NOT EXISTS idx_logs_itemId ON activity_logs(itemId);
    CREATE INDEX IF NOT EXISTS idx_logs_createdAt ON activity_logs(createdAt);
    CREATE INDEX IF NOT EXISTS idx_notes_itemId ON queue_notes(itemId);
  `)
}

module.exports = { runMigrations }
