/**
 * Collaboration route tests (notes, assignment, activity feed)
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Collaboration Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('collab_test')
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

  describe('GET /api/cmcc/queue/:id/notes', () => {
    it('returns empty notes for an item', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Test', 'C', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/queue/item-1/notes')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.notes).toEqual([])
      expect(res.body.itemId).toBe('item-1')
    })
  })

  describe('POST /api/cmcc/queue/:id/notes', () => {
    it('adds a note to an item', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Test', 'C', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/notes')
        .set('x-api-key', 'test-key')
        .send({ moderatorId: 'mod-1', moderatorName: 'Moderator', note: 'This needs review' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.note).toBeDefined()
      expect(res.body.note.text).toBe('This needs review')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/non-existent/notes')
        .set('x-api-key', 'test-key')
        .send({ moderatorId: 'mod-1', moderatorName: 'Mod', note: 'Note' })
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('POST /api/cmcc/queue/:id/assign', () => {
    it('assigns item to a moderator', async () => {
      db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('item-1', 'comment', 'pending', 'Test', 'C', 'Author', 'a@t.com', 'ip', 10, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/queue/item-1/assign')
        .set('x-api-key', 'test-key')
        .send({ moderatorId: 'mod-1', moderatorName: 'Mod One', assigneeId: 'mod-2', assigneeName: 'Mod Two' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.item.assigned_to).toBe('mod-2')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/non-existent/assign')
        .set('x-api-key', 'test-key')
        .send({ moderatorId: 'mod-1', moderatorName: 'Mod', assigneeId: 'mod-2' })
        .expect(404)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('GET /api/cmcc/activity-feed', () => {
    it('returns recent activity feed events', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      stmt.run('item-2', 'reject', 'mod-2', 'Mod Two', new Date().toISOString())

      const res = await request(app)
        .get('/api/cmcc/activity-feed')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.events).toBeInstanceOf(Array)
      expect(res.body.events.length).toBeGreaterThanOrEqual(2)
    })
  })
})
