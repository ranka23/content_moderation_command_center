/**
 * Firewall service integration tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Firewall Integration', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('firewall_test')
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

  describe('POST /api/cmcc/queue/:id/evaluate', () => {
    it('evaluates content against firewall rules', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Test', 'Buy cheap stuff now!!!', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/evaluate')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.evaluation).toBeDefined()
      expect(res.body.evaluation.triggered).toBeDefined()
      expect(typeof res.body.evaluation.triggered).toBe('boolean')
    })

    it('handles items with no content gracefully', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Empty', '', 'Author', 'a@t.com', 'ip', 0, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/evaluate')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.evaluation).toBeDefined()
    })
  })
})
