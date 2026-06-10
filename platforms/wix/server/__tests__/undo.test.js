const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Undo Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/queue/:id/undo-info', () => {
    it('returns undo info for an item that was recently moderated', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      // Moderate first
      await withAuth(request(app).post('/api/cmcc/queue/item_1/moderate')).send(
        { action: 'approve', moderatorId: 'mod_1', moderatorName: 'Admin' },
      )

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/undo-info'),
      )

      expect(res.status).toBe(200)
      expect(res.body.available).toBeDefined()
      expect(res.body.remainingSeconds).toBeDefined()
      // currentStatus reflects the status BEFORE moderation (from undo snapshot)
      expect(res.body.currentStatus).toBe('pending')
    })

    it('returns no undo info for item without snapshot', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      const res = await withAuth(
        request(app).get('/api/cmcc/queue/item_1/undo-info'),
      )

      expect(res.status).toBe(200)
      expect(res.body.available).toBe(false)
    })
  })

  describe('POST /api/cmcc/queue/:id/undo', () => {
    it('successfully undoes a moderation action', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })

      // Moderate
      await withAuth(request(app).post('/api/cmcc/queue/item_1/moderate')).send(
        { action: 'reject', moderatorId: 'mod_1', moderatorName: 'Admin' },
      )

      // Verify rejected
      const item = db
        .prepare('SELECT * FROM queue_items WHERE id = ?')
        .get('item_1')
      expect(item.status).toBe('rejected')

      // Undo
      const undoRes = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/undo'),
      ).send({ moderatorId: 'mod_1', moderatorName: 'Admin' })

      expect(undoRes.status).toBe(200)
      expect(undoRes.body.success).toBe(true)
    })

    it('cannot undo a non-existent item', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/nonexistent/undo'),
      ).send({ moderatorId: 'mod_1', moderatorName: 'Admin' })

      expect(res.status).toBe(404)
    })
  })

  describe('UndoService integration', () => {
    it('uses UndoService from @cmcc/server-core', () => {
      const { UndoService } = require('@cmcc/server-core')
      const service = new UndoService({ windowMinutes: 5 })
      expect(service).toBeDefined()
    })
  })
})
