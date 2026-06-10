/**
 * Database migrations for CMCC Storyblok server.
 * Creates all required tables if they don't exist.
 *
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 */
function runMigrations(db) {
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

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'moderator',
      avatar_url TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT DEFAULT NULL,
      note TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES queue_items(item_id),
      FOREIGN KEY (assignee_id) REFERENCES team_members(id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
    CREATE INDEX IF NOT EXISTS idx_queue_items_content_type ON queue_items(content_type);
    CREATE INDEX IF NOT EXISTS idx_queue_items_created_at ON queue_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_queue_items_platform ON queue_items(platform);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_item_id ON activity_logs(item_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_moderator_id ON activity_logs(moderator_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_item_id ON assignments(item_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_assignee_id ON assignments(assignee_id);
  `)
}

module.exports = { runMigrations }
