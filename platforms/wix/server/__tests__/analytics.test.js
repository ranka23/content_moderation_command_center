const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  seedActivityLog,
  withAuth,
  request,
} = require('./helpers')

describe('Analytics Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/analytics', () => {
    it('returns empty analytics when no data', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.totalItems).toBe(0)
      expect(res.body.statusCounts).toBeDefined()
      expect(res.body.statusCounts.pending).toBe(0)
      expect(res.body.heatmap).toBeDefined()
      expect(res.body.spamRatio).toBeDefined()
      expect(res.body.contentTypeBreakdown).toBeDefined()
      expect(res.body.moderatorPerformance).toBeDefined()
      expect(res.body.anomalyAlerts).toBeDefined()
    })

    it('returns status counts from queue items', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'pending' })
      seedQueueItem(db, { id: 'item_2', status: 'approved' })
      seedQueueItem(db, { id: 'item_3', status: 'pending' })
      seedQueueItem(db, { id: 'item_4', status: 'spam' })

      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.totalItems).toBe(4)
      expect(res.body.statusCounts.pending).toBe(2)
      expect(res.body.statusCounts.approved).toBe(1)
      expect(res.body.statusCounts.spam).toBe(1)
    })

    it('returns totalItems count', async () => {
      seedQueueItem(db, { id: 'item_1' })
      seedQueueItem(db, { id: 'item_2' })

      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.totalItems).toBe(2)
    })

    it('calculates spamRatio correctly', async () => {
      seedQueueItem(db, { id: 'item_1', status: 'spam' })
      seedQueueItem(db, { id: 'item_2', status: 'spam' })
      seedQueueItem(db, { id: 'item_3', status: 'approved' })
      seedQueueItem(db, { id: 'item_4', status: 'pending' })

      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.spamRatio.spamCount).toBe(2)
      expect(res.body.spamRatio.totalCount).toBe(4)
      expect(res.body.spamRatio.ratio).toBe(0.5)
    })

    it('returns contentTypeBreakdown', async () => {
      seedQueueItem(db, { id: 'item_1', contentType: 'comment' })
      seedQueueItem(db, { id: 'item_2', contentType: 'comment' })
      seedQueueItem(db, { id: 'item_3', contentType: 'review' })

      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.contentTypeBreakdown).toHaveLength(2)
      const commentType = res.body.contentTypeBreakdown.find(c => c.contentType === 'comment')
      expect(commentType.count).toBe(2)
    })

    it('returns heatmap data', async () => {
      seedActivityLog(db, { createdAt: '2024-01-15T10:00:00.000Z' })
      seedActivityLog(db, { createdAt: '2024-01-15T14:00:00.000Z' })
      seedActivityLog(db, { createdAt: '2024-01-16T10:00:00.000Z' })

      const res = await withAuth(request(app).get('/api/cmcc/analytics'))
      expect(res.status).toBe(200)
      expect(res.body.heatmap.data).toBeDefined()
    })
  })
})
