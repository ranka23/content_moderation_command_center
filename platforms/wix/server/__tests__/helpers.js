const Database = require('better-sqlite3')
const { createApp } = require('../app')
const { runMigrations } = require('../db/migrations')
const supertest = require('supertest')

function setupTestDb() {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

function createTestApp(db) {
  return createApp(db)
}

let seedCounter = 0

function seedQueueItem(db, overrides = {}) {
  const id = overrides.id || `item_${++seedCounter}`
  const now = new Date().toISOString()
  const item = {
    id,
    contentType: overrides.contentType || 'comment',
    itemId: overrides.itemId || 'ext_1',
    authorName: overrides.authorName || 'Test Author',
    authorEmail: overrides.authorEmail || 'test@example.com',
    authorIP: overrides.authorIP || '192.168.1.1',
    content: overrides.content || 'Test content here',
    title: overrides.title || 'Test Title',
    status: overrides.status || 'pending',
    assignedTo: overrides.assignedTo || null,
    assignedAt: null,
    spamScore: overrides.spamScore || 0,
    flags: overrides.flags || 0,
    createdAt: overrides.createdAt || now,
    updatedAt: now,
    moderatedAt: overrides.moderatedAt || null,
    moderatedBy: overrides.moderatedBy || null,
    metadata: JSON.stringify(overrides.metadata || {}),
    platform: overrides.platform || 'wix',
  }
  db.prepare(
    `INSERT INTO queue_items (id, contentType, itemId, authorName, authorEmail, authorIP, content, title, status, assignedTo, assignedAt, spamScore, flags, createdAt, updatedAt, moderatedAt, moderatedBy, metadata, platform)
    VALUES (@id, @contentType, @itemId, @authorName, @authorEmail, @authorIP, @content, @title, @status, @assignedTo, @assignedAt, @spamScore, @flags, @createdAt, @updatedAt, @moderatedAt, @moderatedBy, @metadata, @platform)`,
  ).run(item)
  return db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
}

function seedActivityLog(db, overrides = {}) {
  const id = overrides.id || `log_${++seedCounter}_${Date.now()}`
  const entry = {
    id,
    itemId: overrides.itemId || 'item_1',
    action: overrides.action || 'moderate',
    actorId: overrides.actorId || 'mod_1',
    actorName: overrides.actorName || 'Test Moderator',
    description: overrides.description || 'Moderated item',
    contentType: overrides.contentType || 'comment',
    details: JSON.stringify(overrides.details || { status: 'approved' }),
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO activity_logs (id, itemId, action, actorId, actorName, description, contentType, details, createdAt)
    VALUES (@id, @itemId, @action, @actorId, @actorName, @description, @contentType, @details, @createdAt)`,
  ).run(entry)
  return entry
}

function seedSetting(db, key, value) {
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)',
  ).run(
    key,
    typeof value === 'string' ? value : JSON.stringify(value),
    new Date().toISOString(),
  )
}

function seedScheduledReport(db, overrides = {}) {
  const id = overrides.id || `report_${++seedCounter}`
  const report = {
    id,
    type: overrides.type || 'moderation_activity',
    frequency: overrides.frequency || 'daily',
    format: overrides.format || 'csv',
    emails: JSON.stringify(overrides.emails || ['admin@example.com']),
    createdBy: overrides.createdBy || 'admin',
    createdAt: overrides.createdAt || new Date().toISOString(),
    lastSentAt: overrides.lastSentAt || null,
    active: overrides.active !== undefined ? (overrides.active ? 1 : 0) : 1,
  }
  db.prepare(
    `INSERT INTO scheduled_reports (id, type, frequency, format, emails, createdBy, createdAt, lastSentAt, active)
    VALUES (@id, @type, @frequency, @format, @emails, @createdBy, @createdAt, @lastSentAt, @active)`,
  ).run(report)
  return report
}

function seedQueueNote(db, overrides = {}) {
  const id = overrides.id || `note_${++seedCounter}_${Date.now()}`
  const note = {
    id,
    itemId: overrides.itemId || 'item_1',
    authorName: overrides.authorName || 'Moderator',
    content: overrides.content || 'This is a note',
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO queue_notes (id, itemId, authorName, content, createdAt)
    VALUES (@id, @itemId, @authorName, @content, @createdAt)`,
  ).run(note)
  return note
}

function seedWebhookConfig(db, overrides = {}) {
  const id = overrides.id || `wh_${++seedCounter}`
  const config = {
    id,
    url: overrides.url || 'https://hooks.example.com/webhook',
    events: JSON.stringify(overrides.events || ['moderate', 'flag']),
    headers: JSON.stringify(overrides.headers || {}),
    active: overrides.active !== undefined ? (overrides.active ? 1 : 0) : 1,
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO webhook_configs (id, url, events, headers, active, createdAt)
    VALUES (@id, @url, @events, @headers, @active, @createdAt)`,
  ).run(config)
  return config
}

function seedContentHook(db, overrides = {}) {
  const hook = {
    name: overrides.name || 'comment_hook',
    contentType: overrides.contentType || 'comment',
    description: overrides.description || 'Auto-import comments',
    enabled: overrides.enabled !== undefined ? (overrides.enabled ? 1 : 0) : 1,
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO content_hooks (name, contentType, description, enabled, createdAt)
    VALUES (@name, @contentType, @description, @enabled, @createdAt)`,
  ).run(hook)
  return hook
}

/**
 * Helper to set the API key header on a supertest request.
 * Usage:
 *   withAuth(request(app).get('/api/cmcc/queue'))
 *   withAuth(request(app).post('/api/cmcc/queue/bulk')).send({...})
 */
function withAuth(req) {
  return req.set('X-API-Key', 'test-api-key-12345')
}

module.exports = {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  seedActivityLog,
  seedSetting,
  seedScheduledReport,
  seedQueueNote,
  seedWebhookConfig,
  seedContentHook,
  withAuth,
  request: supertest,
}
