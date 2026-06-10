const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  seedQueueNote,
  withAuth,
  request,
} = require('./helpers')

describe('Collaboration Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/queue/:id/notes', () => {
    it('returns notes for an item', async () => {
      seedQueueItem(db, { id: 'item_1' })
      seedQueueNote(db, { itemId: 'item_1', content: 'First note' })
      seedQueueNote(db, { itemId: 'item_1', content: 'Second note' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/notes'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns empty array for item with no notes', async () => {
      seedQueueItem(db, { id: 'item_1' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/notes'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('POST /api/cmcc/queue/:id/notes', () => {
    it('adds a note to an item', async () => {
      seedQueueItem(db, { id: 'item_1' })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/notes'),
      ).send({ authorName: 'Moderator', content: 'Investigating this item' })

      expect(res.status).toBe(201)
      expect(res.body.note).toBeDefined()
      expect(res.body.note.content).toBe('Investigating this item')

      const notes = db
        .prepare('SELECT * FROM queue_notes WHERE itemId = ?')
        .all('item_1')
      expect(notes).toHaveLength(1)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/nonexistent/notes'),
      ).send({ authorName: 'Moderator', content: 'Note content' })

      expect(res.status).toBe(404)
    })

    it('returns 400 for missing content', async () => {
      seedQueueItem(db, { id: 'item_1' })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/notes'),
      ).send({ authorName: 'Moderator' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/cmcc/queue/:id/assign', () => {
    it('assigns an item to a moderator', async () => {
      seedQueueItem(db, { id: 'item_1', assignedTo: null })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/assign'),
      ).send({ assignTo: 'mod_2', assignedBy: 'admin' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.item.assignedTo).toBe('mod_2')

      const updated = db
        .prepare('SELECT assignedTo FROM queue_items WHERE id = ?')
        .get('item_1')
      expect(updated.assignedTo).toBe('mod_2')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/nonexistent/assign'),
      ).send({ assignTo: 'mod_2', assignedBy: 'admin' })

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/cmcc/activity-feed', () => {
    it('returns recent activity feed events', async () => {
      const {
        WebSocketEventBus: _WebSocketEventBus,
      } = require('@cmcc/server-core')
      const bus = app.locals.eventBus
      bus.publishAction('mod_1', 'Alice', 'Approved item', 'item_1', 'Test')
      bus.publishNote('mod_2', 'Bob', 'Added a note', 'item_2')

      const res = await withAuth(request(app).get('/api/cmcc/activity-feed'))
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns empty array when no events', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/activity-feed'))
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })
})
