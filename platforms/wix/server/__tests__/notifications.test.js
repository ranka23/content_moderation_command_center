const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Notifications Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/cmcc/notifications/send', () => {
    it('returns success when notification is queued', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        title: 'Test Item',
        contentType: 'comment',
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/notifications/send'),
      ).send({
        type: 'new_item',
        itemId: 'item_1',
        recipients: ['mod@example.com'],
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('returns 400 for missing required fields', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/notifications/send'),
      ).send({ type: 'new_item' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/cmcc/webhooks/test', () => {
    it('tests a webhook URL', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/webhooks/test'),
      ).send({
        url: 'https://hooks.example.com/test',
        event: 'moderate',
      })

      expect(res.status).toBe(200)
      expect(res.body.result).toBeDefined()
    })

    it('returns 400 for missing URL', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/webhooks/test'),
      ).send({ event: 'moderate' })

      expect(res.status).toBe(400)
    })
  })
})
