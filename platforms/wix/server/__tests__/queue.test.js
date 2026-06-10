const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  seedActivityLog,
  withAuth,
  request,
} = require('./helpers')

describe('Queue Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/queue', () => {
    it('returns empty array when no items', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/queue'))
      expect(res.status).toBe(200)
      expect(res.body.items).toEqual([])
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.total).toBe(0)
    })

    it('returns all queue items with pagination', async () => {
      seedQueueItem(db, { id: 'item_1', title: 'First' })
      seedQueueItem(db, { id: 'item_2', title: 'Second' })

      const res = await withAuth(request(app).get('/api/cmcc/queue'))
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('filters by status', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })
      seedQueueItem(db, { id: 'item_2', status: 'approved' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue?status=pending'),
      )
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe('item_1')
    })

    it('filters by contentType', async () => {
      seedQueueItem(db, { id: 'item_1', contentType: 'comment' })
      seedQueueItem(db, { id: 'item_2', contentType: 'review' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue?contentType=review'),
      )
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe('item_2')
    })

    it('searches by title or author', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        title: 'Special Post',
        authorName: 'Alice',
      })
      seedQueueItem(db, { id: 'item_2', title: 'Other', authorName: 'Bob' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue?search=Special'),
      )
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe('item_1')
    })

    it('filters by dateRange', async () => {
      seedQueueItem(db, { id: 'item_1', createdAt: '2024-01-01T00:00:00.000Z' })
      seedQueueItem(db, { id: 'item_2', createdAt: '2024-06-01T00:00:00.000Z' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue?dateRange=2024-05-01,2024-07-01'),
      )
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe('item_2')
    })

    it('paginates correctly', async () => {
      for (let i = 1; i <= 5; i++) {
        seedQueueItem(db, { id: `item_${i}`, title: `Item ${i}` })
      }

      const res = await withAuth(
        request(app).get('/api/cmcc/queue?page=1&pageSize=2'),
      )
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.pagination.total).toBe(5)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.pageSize).toBe(2)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/cmcc/queue')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/cmcc/queue/:id/moderate', () => {
    it('approves an item', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'approve',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.item.status).toBe('approved')
    })

    it('rejects an item', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'reject',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.item.status).toBe('rejected')
    })

    it('marks as spam', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'spam',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.item.status).toBe('spam')
    })

    it('defers an item', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'defer',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.item.status).toBe('deferred')
    })

    it('flags an item', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'flag',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.item.status).toBe('flagged')
    })

    it('deactivates user and marks item as spam', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        status: 'pending',
        authorEmail: 'spammer@example.com',
      })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'deactivate-users',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.item.status).toBe('spam')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/nonexistent/moderate')
          .send({
            action: 'approve',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid action', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'invalid',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(400)
    })

    it('creates activity log entry on moderation', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      await withAuth(
        request(app)
          .post('/api/cmcc/queue/item_1/moderate')
          .send({
            action: 'approve',
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      const logs = db
        .prepare('SELECT * FROM activity_logs WHERE itemId = ?')
        .all('item_1')
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('moderate')
    })
  })

  describe('POST /api/cmcc/queue/bulk', () => {
    it('performs bulk moderation on multiple items', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })
      seedQueueItem(db, { id: 'item_2', status: 'pending' })

      const res = await withAuth(
        request(app)
          .post('/api/cmcc/queue/bulk')
          .send({
            action: 'approve',
            ids: ['item_1', 'item_2'],
            moderatorId: 'mod_1',
            moderatorName: 'Admin',
          }),
      )

      expect(res.status).toBe(200)
      expect(res.body.results).toHaveLength(2)
      expect(res.body.results.every((r) => r.success)).toBe(true)

      const item1 = db
        .prepare('SELECT * FROM queue_items WHERE id = ?')
        .get('item_1')
      const item2 = db
        .prepare('SELECT * FROM queue_items WHERE id = ?')
        .get('item_2')
      expect(item1.status).toBe('approved')
      expect(item2.status).toBe('approved')
    })

    it('returns 400 for empty ids', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/bulk'),
      ).send({ action: 'approve', ids: [], moderatorId: 'mod_1' })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid action in bulk', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/bulk'),
      ).send({ action: 'bad', ids: ['item_1'], moderatorId: 'mod_1' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/cmcc/queue/:id/history', () => {
    it('returns activity log for an item', async () => {
      seedQueueItem(db, { id: 'item_1' })
      seedActivityLog(db, {
        itemId: 'item_1',
        action: 'moderate',
        description: 'Approved',
      })
      seedActivityLog(db, {
        itemId: 'item_1',
        action: 'undo',
        description: 'Undone',
      })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/history'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns empty array for item with no history', async () => {
      seedQueueItem(db, { id: 'item_1' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/history'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('POST /api/cmcc/queue/:id/undo', () => {
    it('undoes a recent moderation action', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'approved' })

      const moderateRes = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/moderate'),
      ).send({
        action: 'approve',
        moderatorId: 'mod_1',
        moderatorName: 'Admin',
      })

      expect(moderateRes.status).toBe(200)
      expect(moderateRes.body.item.status).toBe('approved')

      const undoRes = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/undo'),
      ).send({ moderatorId: 'mod_1', moderatorName: 'Admin' })

      expect(undoRes.status).toBe(200)
      expect(undoRes.body.success).toBe(true)
    })

    it('returns 404 for non-existent item undo', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/nonexistent/undo'),
      ).send({ moderatorId: 'mod_1', moderatorName: 'Admin' })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/cmcc/queue/:id/evaluate', () => {
    it('evaluates content through firewall', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        content: 'Buy cheap stuff now!!! http://spam.com',
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/evaluate'),
      )

      expect(res.status).toBe(200)
      expect(res.body.evaluation).toBeDefined()
    })
  })
})
