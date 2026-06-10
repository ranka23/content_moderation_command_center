/**
 * Activity Log route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Activity Log Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('activity_log_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM activity_logs')
  })

  describe('GET /api/cmcc/activity-log', () => {
    it('returns empty log when no entries', async () => {
      const res = await request(app)
        .get('/api/cmcc/activity-log')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.entries).toEqual([])
      expect(res.body.total).toBe(0)
    })

    it('returns paginated activity log', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (let i = 0; i < 15; i++) {
        stmt.run(`item-${i}`, 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      }

      const res = await request(app)
        .get('/api/cmcc/activity-log?page=1&perPage=10')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.entries).toHaveLength(10)
      expect(res.body.total).toBe(15)
    })

    it('filters by moderator', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      stmt.run('item-2', 'reject', 'mod-2', 'Mod Two', new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/activity-log?moderator=mod-1')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].moderator_id).toBe('mod-1')
    })

    it('filters by action type', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      stmt.run('item-2', 'reject', 'mod-2', 'Mod Two', new Date().toISOString())
      stmt.run('item-3', 'spam', 'mod-1', 'Mod One', new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/activity-log?action=approve')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].action).toBe('approve')
    })

    it('filters by content type', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'approve', 'mod-1', 'Mod One', 'comment', new Date().toISOString())
      stmt.run('item-2', 'approve', 'mod-2', 'Mod Two', 'review', new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/activity-log?contentType=comment')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].content_type).toBe('comment')
    })
  })
})
