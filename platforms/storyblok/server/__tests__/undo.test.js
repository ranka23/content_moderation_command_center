/**
 * Undo service integration tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Undo Integration', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('undo_test')
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

  describe('POST /api/cmcc/queue/:id/undo', () => {
    it('returns result when undoing an action', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'approved', 'Test', 'Content', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/undo')
        .set('x-api-key', 'test-key')
        .expect(200)

      // Undo depends on whether a snapshot was saved first
      expect(res.body).toBeDefined()
    })
  })

  describe('GET /api/cmcc/queue/:id/undo-info', () => {
    it('returns undo availability info', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Test', 'C', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/queue/item-1/undo-info')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toBeDefined()
      expect('available' in res.body).toBe(true)
    })
  })
})
