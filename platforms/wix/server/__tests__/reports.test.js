const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  seedScheduledReport,
  seedActivityLog,
  withAuth,
  request,
} = require('./helpers')

describe('Reports Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('POST /api/cmcc/reports/moderation-activity', () => {
    it('generates moderation activity report', async () => {
      seedQueueItem(db, {
        id: 'item_1',
        status: 'approved',
        moderatedAt: new Date().toISOString(),
        moderatedBy: 'mod_1',
        contentType: 'comment',
      })
      seedQueueItem(db, {
        id: 'item_2',
        status: 'rejected',
        moderatedAt: new Date().toISOString(),
        moderatedBy: 'mod_1',
        contentType: 'comment',
      })
      seedQueueItem(db, { id: 'item_3', status: 'pending' })

      const res = await withAuth(
        request(app).post('/api/cmcc/reports/moderation-activity'),
      ).send({ days: 7 })

      expect(res.status).toBe(200)
      expect(res.body.report).toBeDefined()
      expect(res.body.report.totalModerated).toBe(2)
      expect(res.body.report.breakdown).toBeDefined()
    })
  })

  describe('POST /api/cmcc/reports/compliance-audit', () => {
    it('generates compliance audit report', async () => {
      seedActivityLog(db, {
        id: 'log_1',
        action: 'moderate',
        actorName: 'Moderator',
        description: 'Approved item',
        createdAt: new Date().toISOString(),
      })
      seedActivityLog(db, {
        id: 'log_2',
        action: 'flag',
        actorName: 'Moderator',
        description: 'Flagged item',
        createdAt: new Date().toISOString(),
      })

      const res = await withAuth(
        request(app).post('/api/cmcc/reports/compliance-audit'),
      ).send({ days: 30 })

      expect(res.status).toBe(200)
      expect(res.body.report).toBeDefined()
      expect(res.body.report.totalActions).toBe(2)
    })

    it('gracefully handles no data', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/reports/compliance-audit'),
      ).send({ days: 30 })

      expect(res.status).toBe(200)
      expect(res.body.report.totalActions).toBe(0)
    })
  })

  describe('POST /api/cmcc/reports/scheduled', () => {
    it('schedules a new recurring report', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/reports/scheduled'),
      ).send({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@example.com'],
        createdBy: 'admin',
      })

      expect(res.status).toBe(201)
      expect(res.body.report).toBeDefined()
      expect(res.body.report.type).toBe('moderation_activity')
      expect(res.body.report.frequency).toBe('daily')
      expect(res.body.report.active).toBe(true)
    })

    it('returns 400 for missing required fields', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/reports/scheduled'),
      ).send({ type: 'moderation_activity' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/cmcc/reports/scheduled', () => {
    it('lists all scheduled reports', async () => {
      seedScheduledReport(db, { id: 'r1', type: 'moderation_activity' })
      seedScheduledReport(db, { id: 'r2', type: 'compliance_audit' })

      const res = await withAuth(
        request(app).get('/api/cmcc/reports/scheduled'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('returns empty array when none scheduled', async () => {
      const res = await withAuth(
        request(app).get('/api/cmcc/reports/scheduled'),
      )
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('DELETE /api/cmcc/reports/scheduled/:id', () => {
    it('deletes a scheduled report', async () => {
      seedScheduledReport(db, { id: 'r1' })

      const res = await withAuth(
        request(app).delete('/api/cmcc/reports/scheduled/r1'),
      )
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const remaining = db.prepare('SELECT * FROM scheduled_reports').all()
      expect(remaining).toHaveLength(0)
    })

    it('returns 404 for non-existent report', async () => {
      const res = await withAuth(
        request(app).delete('/api/cmcc/reports/scheduled/nonexistent'),
      )
      expect(res.status).toBe(404)
    })
  })
})
