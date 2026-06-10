const {
  setupTestDb,
  createTestApp,
  seedSetting,
  withAuth,
  request,
} = require('./helpers')

describe('Settings Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/settings', () => {
    it('returns empty object when no settings', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/settings'))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('returns all settings as key-value pairs', async () => {
      seedSetting(db, 'maxLinks', '5')
      seedSetting(db, 'minSubmitTime', '3')
      seedSetting(db, 'notifyOnSpam', 'true')

      const res = await withAuth(request(app).get('/api/cmcc/settings'))
      expect(res.status).toBe(200)
      expect(res.body.maxLinks).toBe(5)
      expect(res.body.minSubmitTime).toBe(3)
      expect(res.body.notifyOnSpam).toBe(true)
    })

    it('parses JSON values', async () => {
      seedSetting(db, 'blockedKeywords', JSON.stringify(['spam', 'viagra']))

      const res = await withAuth(request(app).get('/api/cmcc/settings'))
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.blockedKeywords)).toBe(true)
      expect(res.body.blockedKeywords).toEqual(['spam', 'viagra'])
    })
  })

  describe('PUT /api/cmcc/settings', () => {
    it('updates settings', async () => {
      const res = await withAuth(request(app).put('/api/cmcc/settings')).send({
        maxLinks: '10',
        minSubmitTime: '5',
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const saved = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('maxLinks')
      expect(saved.value).toBe('10')
    })

    it('returns 400 for non-object body', async () => {
      const res = await withAuth(
        request(app).put('/api/cmcc/settings').type('json'),
      ).send('invalid')
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/cmcc/settings/export', () => {
    it('exports settings as JSON object', async () => {
      seedSetting(db, 'maxLinks', '5')
      seedSetting(db, 'minSubmitTime', '3')

      const res = await withAuth(request(app).post('/api/cmcc/settings/export'))
      expect(res.status).toBe(200)
      expect(res.body.maxLinks).toBe(5)
      expect(res.body.minSubmitTime).toBe(3)
    })
  })

  describe('POST /api/cmcc/settings/import', () => {
    it('imports settings from JSON object', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/settings/import'),
      ).send({ maxLinks: '8', minSubmitTime: '4' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.imported).toBe(2)

      const saved = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('maxLinks')
      expect(saved.value).toBe('8')
    })

    it('returns 400 for non-object body', async () => {
      const res = await withAuth(
        request(app).post('/api/cmcc/settings/import').type('json'),
      ).send('invalid')
      expect(res.status).toBe(400)
    })
  })
})
