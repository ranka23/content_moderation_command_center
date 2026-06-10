const {
  setupTestDb,
  createTestApp,
  seedActivityLog,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Retention Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/cmcc/notify/purge', () => {
    it('purges old activity logs', async () => {
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 2)

      seedActivityLog(db, { id: 'log_old', createdAt: oldDate.toISOString() })
      seedActivityLog(db, {
        id: 'log_new',
        createdAt: new Date().toISOString(),
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/notify/purge'),
      ).send({ type: 'activity_logs' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.purged).toBeDefined()
    })

    it('purges old archived items', async () => {
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 2)

      seedQueueItem(db, {
        id: 'item_old',
        status: 'spam',
        createdAt: oldDate.toISOString(),
      })
      seedQueueItem(db, {
        id: 'item_new',
        status: 'approved',
        createdAt: new Date().toISOString(),
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/notify/purge'),
      ).send({ type: 'archived_items' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('returns 400 for unknown purge type', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/notify/purge'),
      ).send({ type: 'unknown' })

      expect(res.status).toBe(400)
    })
  })

  describe('RetentionService integration', () => {
    it('uses RetentionService from @cmcc/server-core', () => {
      const {
        RetentionService,
        getDefaultRetentionConfig,
      } = require('@cmcc/server-core')
      const config = getDefaultRetentionConfig()
      expect(config.activityLogRetentionDays).toBe(90)
      const service = new RetentionService(config)
      expect(service.getConfig().activityLogRetentionDays).toBe(90)
    })
  })
})
