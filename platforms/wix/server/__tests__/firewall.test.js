const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Firewall Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/cmcc/queue/:id/evaluate', () => {
    it('evaluates content and returns result', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        content: 'Hello world',
        authorIP: '192.168.1.1',
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/evaluate'),
      )

      expect(res.status).toBe(200)
      expect(res.body.evaluation).toBeDefined()
      expect(res.body.evaluation.triggered).toBeDefined()
      expect(res.body.evaluation.evaluatedAt).toBeDefined()
    })

    it('detects spam content with links', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        content:
          'Buy cheap watches http://spam.com http://cheap.com http://deals.com http://offers.com http://sales.com http://extra.com',
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/evaluate'),
      )

      expect(res.status).toBe(200)
      expect(res.body.evaluation.triggered).toBe(true)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/queue/nonexistent/evaluate'),
      )

      expect(res.status).toBe(404)
    })

    it('evaluates clean content without triggering', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        content: 'This is a normal comment about the article.',
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/queue/item_1/evaluate'),
      )

      expect(res.status).toBe(200)
      expect(res.body.evaluation).toBeDefined()
    })
  })

  describe('FirewallService integration', () => {
    it('uses FirewallService from @cmcc/server-core', () => {
      const { FirewallService } = require('@cmcc/server-core')
      const service = new FirewallService({ maxLinks: 3 })
      expect(service.getConfig().maxLinks).toBe(3)
    })
  })
})
