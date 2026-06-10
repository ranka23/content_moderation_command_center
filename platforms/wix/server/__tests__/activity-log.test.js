const {
  setupTestDb,
  createTestApp,
  seedActivityLog,
  withAuth,
  request,
} = require('./helpers')

describe('Activity Log Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/activity-log', () => {
    it('returns empty array when no logs', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/activity-log'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toEqual([])
      expect(res.body.pagination).toBeDefined()
    })

    it('returns paginated activity logs', async () => {
      seedActivityLog(db, { id: 'log_1', action: 'moderate' })
      seedActivityLog(db, { id: 'log_2', action: 'moderate' })

      const res = await withAuth(request(app).get('/api/cmcc/activity-log'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('filters by action', async () => {
      seedActivityLog(db, { id: 'log_1', action: 'moderate' })
      seedActivityLog(db, { id: 'log_2', action: 'undo' })

      const res = await withAuth(request(app).get('/api/cmcc/activity-log?action=undo'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].action).toBe('undo')
    })

    it('filters by contentType', async () => {
      seedActivityLog(db, { id: 'log_1', contentType: 'comment' })
      seedActivityLog(db, { id: 'log_2', contentType: 'review' })

      const res = await withAuth(request(app).get('/api/cmcc/activity-log?contentType=review'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].contentType).toBe('review')
    })

    it('searches by description or actor', async () => {
      seedActivityLog(db, { id: 'log_1', description: 'Approved item', actorName: 'Alice' })
      seedActivityLog(db, { id: 'log_2', description: 'Flagged as spam', actorName: 'Bob' })

      const res = await withAuth(request(app).get('/api/cmcc/activity-log?search=Alice'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toHaveLength(1)
      expect(res.body.entries[0].id).toBe('log_1')
    })

    it('paginates correctly', async () => {
      for (let i = 1; i <= 3; i++) {
        seedActivityLog(db, { id: `log_${i}` })
      }

      const res = await withAuth(request(app).get('/api/cmcc/activity-log?page=0&pageSize=2'))
      expect(res.status).toBe(200)
      expect(res.body.entries).toHaveLength(2)
      expect(res.body.pagination.total).toBe(3)
    })
  })
})
