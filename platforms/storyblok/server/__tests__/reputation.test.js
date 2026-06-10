/**
 * Reputation route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Reputation Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('reputation_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM queue_items')
  })

  describe('GET /api/cmcc/reputation/users', () => {
    it('returns empty list when no users', async () => {
      const res = await request(app)
        .get('/api/cmcc/reputation/users')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.users).toEqual([])
    })

    it('returns user reputation list with trust levels', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'approved', 'Good', 'Nice', 'Alice', 'alice@t.com', 'ip', 5, new Date().toISOString(), 'user-1')
      stmt.run('item-2', 'comment', 'spam', 'Bad', 'Spam', 'Bob', 'bob@t.com', 'ip', 95, new Date().toISOString(), 'user-2')
      stmt.run('item-3', 'comment', 'spam', 'Worse', 'More spam', 'Bob', 'bob@t.com', 'ip', 90, new Date().toISOString(), 'user-2')

      const res = await request(app)
        .get('/api/cmcc/reputation/users')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.users).toBeInstanceOf(Array)
      expect(res.body.users.length).toBeGreaterThanOrEqual(2)
    })

    it('returns trust levels for users', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'approved', 'Good', 'Nice', 'Alice', 'a@t.com', 'ip', 5, new Date().toISOString(), 'user-1')

      const res = await request(app)
        .get('/api/cmcc/reputation/users')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.users[0].trustLevel).toBeDefined()
    })
  })

  describe('GET /api/cmcc/reputation/user/:id', () => {
    it('returns detailed reputation for a user', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'approved', 'Good', 'Nice', 'Alice', 'a@t.com', 'ip', 5, new Date().toISOString(), 'user-1')
      stmt.run('item-2', 'comment', 'spam', 'Bad', 'Bad', 'Alice', 'a@t.com', 'ip', 95, new Date().toISOString(), 'user-1')

      const res = await request(app)
        .get('/api/cmcc/reputation/user/user-1')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.user).toBeDefined()
      expect(res.body.user.author_id).toBe('user-1')
      expect(res.body.user.totalItems).toBe(2)
      expect(res.body.user.trustLevel).toBeDefined()
    })

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/cmcc/reputation/user/non-existent')
        .set('x-api-key', 'test-key')
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })
})
