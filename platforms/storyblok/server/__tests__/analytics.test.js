/**
 * Analytics route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Analytics Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('analytics_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM queue_items')
    db.exec('DELETE FROM activity_logs')
  })

  describe('GET /api/cmcc/analytics', () => {
    it('returns empty analytics when no data', async () => {
      const res = await request(app)
        .get('/api/cmcc/analytics')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toBeDefined()
      expect(res.body.totalItems).toBe(0)
      expect(res.body.statusCounts).toBeDefined()
      expect(res.body.statusCounts.pending).toBe(0)
    })

    it('returns analytics with queue data', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'approved', 'A', 'C', 'Auth', 'a@t.com', 'ip', 10, new Date().toISOString())
      stmt.run('item-2', 'comment', 'pending', 'B', 'C', 'Auth', 'a@t.com', 'ip', 30, new Date().toISOString())
      stmt.run('item-3', 'review', 'spam', 'C', 'C', 'Auth', 'a@t.com', 'ip', 90, new Date().toISOString())
      stmt.run('item-4', 'comment', 'pending', 'D', 'C', 'Auth', 'a@t.com', 'ip', 50, new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/analytics')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.totalItems).toBe(4)
      expect(res.body.statusCounts.pending).toBe(2)
      expect(res.body.statusCounts.approved).toBe(1)
      expect(res.body.statusCounts.spam).toBe(1)
      expect(res.body.contentTypeBreakdown).toBeDefined()
      expect(res.body.contentTypeBreakdown.comment).toBe(3)
      expect(res.body.contentTypeBreakdown.review).toBe(1)
    })

    it('calculates spam ratio correctly', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'spam', 'A', 'C', 'Auth', 'a@t.com', 'ip', 95, new Date().toISOString())
      stmt.run('item-2', 'comment', 'spam', 'B', 'C', 'Auth', 'a@t.com', 'ip', 85, new Date().toISOString())
      stmt.run('item-3', 'comment', 'pending', 'C', 'C', 'Auth', 'a@t.com', 'ip', 10, new Date().toISOString())
      stmt.run('item-4', 'comment', 'pending', 'D', 'C', 'Auth', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/analytics')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.spamRatio).toBe(50)
    })

    it('includes moderator performance data', async () => {
      const logStmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      logStmt.run('item-1', 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      logStmt.run('item-2', 'reject', 'mod-1', 'Mod One', new Date().toISOString())
      logStmt.run('item-3', 'approve', 'mod-2', 'Mod Two', new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/analytics')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.moderatorPerformance).toBeDefined()
      expect(res.body.moderatorPerformance.length).toBeGreaterThanOrEqual(2)
    })

    it('includes anomaly alerts when volume spikes', async () => {
      // Create activity logs with high volume
      const logStmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (let i = 0; i < 150; i++) {
        logStmt.run(
          `item-${i}`, 'approve', 'mod-1', 'Mod',
          new Date(Date.now() - 3600000).toISOString(),
        )
      }

      const res = await request(app)
        .get('/api/cmcc/analytics')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.anomalyAlerts).toBeDefined()
    })
  })
})
