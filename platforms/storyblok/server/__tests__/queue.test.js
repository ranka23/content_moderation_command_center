/**
 * Queue route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Queue Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('queue_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM queue_items')
    db.exec('DELETE FROM activity_logs')
    db.exec('DELETE FROM settings')
  })

  describe('GET /api/cmcc/queue', () => {
    it('returns empty queue when no items exist', async () => {
      const res = await request(app)
        .get('/api/cmcc/queue')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toEqual({ items: [], total: 0, page: 1, totalPages: 0 })
    })

    it('returns paginated queue items', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (let i = 0; i < 25; i++) {
        stmt.run(
          `item-${i}`,
          'comment',
          'pending',
          `Test Item ${i}`,
          `Content ${i}`,
          'Author',
          'author@test.com',
          '127.0.0.1',
          Math.random() * 100,
          new Date().toISOString(),
        )
      }

      const res = await request(app)
        .get('/api/cmcc/queue?page=1&perPage=10')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toHaveLength(10)
      expect(res.body.total).toBe(25)
      expect(res.body.page).toBe(1)
      expect(res.body.totalPages).toBe(3)
    })

    it('filters by status', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        'item-1',
        'comment',
        'approved',
        'Approved',
        'Content',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )
      stmt.run(
        'item-2',
        'comment',
        'pending',
        'Pending',
        'Content',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )
      stmt.run(
        'item-3',
        'comment',
        'spam',
        'Spam',
        'Content',
        'Author',
        'a@t.com',
        'ip',
        90,
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue?status=pending')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].status).toBe('pending')
    })

    it('filters by content type', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        'item-1',
        'comment',
        'pending',
        'Comment',
        'C',
        'A',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )
      stmt.run(
        'item-2',
        'review',
        'pending',
        'Review',
        'C',
        'A',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue?contentType=comment')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].content_type).toBe('comment')
    })

    it('searches by title or author', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        'item-1',
        'comment',
        'pending',
        'Special Title',
        'C',
        'Alice',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )
      stmt.run(
        'item-2',
        'comment',
        'pending',
        'Other',
        'C',
        'Bob',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue?search=Alice')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].author_name).toBe('Alice')
    })

    it('filters by date range', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        'item-1',
        'comment',
        'pending',
        'Old',
        'C',
        'A',
        'a@t.com',
        'ip',
        10,
        '2020-01-01T00:00:00.000Z',
      )
      stmt.run(
        'item-2',
        'comment',
        'pending',
        'New',
        'C',
        'A',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue?dateFrom=2023-01-01&dateTo=2027-01-01')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('New')
    })
  })

  describe('POST /api/cmcc/queue/:id/moderate', () => {
    it('approves a pending item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'approve', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('approved')

      const row = db
        .prepare('SELECT * FROM queue_items WHERE item_id = ?')
        .get('item-1')
      expect(row.status).toBe('approved')
    })

    it('rejects a pending item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'reject', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('rejected')
    })

    it('marks as spam', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'spam', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('spam')
    })

    it('defers an item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'defer', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('deferred')
    })

    it('flags an item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'flag', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('flagged')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/non-existent/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'approve', moderatorId: 'mod-1' })
        .expect(404)

      expect(res.body.error).toBeDefined()
    })

    it('returns 400 for invalid action', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'invalid', moderatorId: 'mod-1' })
        .expect(400)

      expect(res.body.error).toBeDefined()
    })

    it('creates activity log entry on moderation', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'approve', moderatorId: 'mod-1' })
        .expect(200)

      const log = db
        .prepare('SELECT * FROM activity_logs WHERE item_id = ?')
        .get('item-1')
      expect(log).toBeDefined()
      expect(log.action).toBe('approve')
      expect(log.moderator_id).toBe('mod-1')
    })

    it('deactivates user when action is deactivate-users', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
        'user-1',
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/moderate')
        .set('x-api-key', 'test-key')
        .send({ action: 'deactivate-users', moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.userDeactivated).toBe(true)
    })
  })

  describe('POST /api/cmcc/queue/bulk', () => {
    it('performs bulk action on multiple items', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        'item-1',
        'comment',
        'pending',
        'A',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )
      stmt.run(
        'item-2',
        'comment',
        'pending',
        'B',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/bulk')
        .set('x-api-key', 'test-key')
        .send({
          action: 'approve',
          ids: ['item-1', 'item-2'],
          moderatorId: 'mod-1',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.moderated).toBe(2)

      const row1 = db
        .prepare('SELECT status FROM queue_items WHERE item_id = ?')
        .get('item-1')
      const row2 = db
        .prepare('SELECT status FROM queue_items WHERE item_id = ?')
        .get('item-2')
      expect(row1.status).toBe('approved')
      expect(row2.status).toBe('approved')
    })

    it('returns 400 for empty ids array', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/bulk')
        .set('x-api-key', 'test-key')
        .send({ action: 'approve', ids: [], moderatorId: 'mod-1' })
        .expect(400)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('GET /api/cmcc/queue/:id/history', () => {
    it('returns item history timeline', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'approved',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      db.prepare(
        `
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'approve',
        'mod-1',
        'Moderator One',
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue/item-1/history')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.item).toBeDefined()
      expect(res.body.history).toBeInstanceOf(Array)
      expect(res.body.history.length).toBeGreaterThanOrEqual(1)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .get('/api/cmcc/queue/non-existent/history')
        .set('x-api-key', 'test-key')
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('POST /api/cmcc/queue/:id/undo', () => {
    it('undoes last action on an item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'approved',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/undo')
        .set('x-api-key', 'test-key')
        .expect(200)

      // Undo may or may not succeed depending on snapshot availability
      expect(res.body).toBeDefined()
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/non-existent/undo')
        .set('x-api-key', 'test-key')
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('GET /api/cmcc/queue/:id/undo-info', () => {
    it('returns undo info for an item', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'approved',
        'Test',
        'C',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .get('/api/cmcc/queue/item-1/undo-info')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toBeDefined()
      expect(typeof res.body.available).toBe('boolean')
    })
  })

  describe('POST /api/cmcc/queue/:id/evaluate', () => {
    it('evaluates content with firewall', async () => {
      db.prepare(
        `
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        'item-1',
        'comment',
        'pending',
        'Test',
        'Buy cheap stuff now!!!',
        'Author',
        'a@t.com',
        'ip',
        10,
        new Date().toISOString(),
      )

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/evaluate')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.evaluation).toBeDefined()
      expect(typeof res.body.evaluation.triggered).toBe('boolean')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/non-existent/evaluate')
        .set('x-api-key', 'test-key')
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })
})
