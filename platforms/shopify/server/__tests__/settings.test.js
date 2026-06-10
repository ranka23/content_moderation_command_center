const request = require('supertest')
const { setupApp } = require('../index')

const mockPrepareObj = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  bind: jest.fn(() => mockPrepareObj),
}
const mockDb = {
  prepare: jest.fn(() => mockPrepareObj),
  exec: jest.fn(),
  transaction: jest.fn((fn) => fn),
}

jest.mock('../db', () => ({
  getDb: jest.fn(() => mockDb),
  initDb: jest.fn(),
  runMigrations: jest.fn(),
}))

describe('Settings Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Settings service uses db.transaction which calls the fn immediately
    mockDb.transaction.mockImplementation((fn) => fn)
  })

  describe('GET /api/cmcc/settings', () => {
    it('should return settings as key-value pairs', async () => {
      mockPrepareObj.all.mockReturnValue([
        { key: 'auto_moderate', value: 'true' },
        { key: 'spam_threshold', value: '0.8' },
      ])
      const res = await request(app).get('/api/cmcc/settings').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.auto_moderate).toBe('true')
      expect(res.body.data.spam_threshold).toBe('0.8')
    })
  })

  describe('PUT /api/cmcc/settings', () => {
    it('should update settings', async () => {
      mockPrepareObj.run.mockReturnValue({ changes: 1 })
      mockPrepareObj.all.mockReturnValue([
        { key: 'auto_moderate', value: 'false' },
      ])

      const res = await request(app)
        .put('/api/cmcc/settings')
        .send({ auto_moderate: 'false' })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should accept empty object', async () => {
      mockPrepareObj.all.mockReturnValue([])

      const res = await request(app)
        .put('/api/cmcc/settings')
        .send({})
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/cmcc/settings/export', () => {
    it('should export settings', async () => {
      mockPrepareObj.all.mockReturnValue([
        { key: 'auto_moderate', value: 'true' },
      ])
      const res = await request(app)
        .post('/api/cmcc/settings/export')
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/cmcc/settings/import', () => {
    it('should import settings', async () => {
      mockPrepareObj.run.mockReturnValue({ changes: 1 })
      mockPrepareObj.all.mockReturnValue([
        { key: 'auto_moderate', value: 'true' },
      ])

      const res = await request(app)
        .post('/api/cmcc/settings/import')
        .send({ settings: { auto_moderate: 'true' } })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 400 if settings is missing', async () => {
      const res = await request(app)
        .post('/api/cmcc/settings/import')
        .send({})
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })
})
