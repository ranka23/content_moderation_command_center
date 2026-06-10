/**
 * Settings route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Settings Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('settings_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM settings')
  })

  describe('GET /api/cmcc/settings', () => {
    it('returns default settings when none stored', async () => {
      const res = await request(app)
        .get('/api/cmcc/settings')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toBeDefined()
      expect(typeof res.body).toBe('object')
      expect(res.body.apiEndpoint).toBe('')
      expect(res.body.spamThreshold).toBe(0.7)
    })

    it('returns stored settings', async () => {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
        'spamThreshold', '0.8',
      )
      const res = await request(app)
        .get('/api/cmcc/settings')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.spamThreshold).toBe(0.8)
    })
  })

  describe('PUT /api/cmcc/settings', () => {
    it('updates settings', async () => {
      const res = await request(app)
        .put('/api/cmcc/settings')
        .set('x-api-key', 'test-key')
        .send({ spamThreshold: 0.9, autoApprove: true })
        .expect(200)

      expect(res.body.success).toBe(true)

      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('spamThreshold')
      expect(row.value).toBe('0.9')
    })
  })

  describe('POST /api/cmcc/settings/export', () => {
    it('exports settings as JSON', async () => {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('spamThreshold', '0.75')
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('autoApprove', 'true')

      const res = await request(app)
        .post('/api/cmcc/settings/export')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.spamThreshold).toBe(0.75)
      expect(res.body.autoApprove).toBe(true)
    })
  })

  describe('POST /api/cmcc/settings/import', () => {
    it('imports settings from JSON', async () => {
      const res = await request(app)
        .post('/api/cmcc/settings/import')
        .set('x-api-key', 'test-key')
        .send({ spamThreshold: 0.85, autoApprove: false })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.imported).toBe(2)

      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('spamThreshold')
      expect(row.value).toBe('0.85')
    })
  })
})
