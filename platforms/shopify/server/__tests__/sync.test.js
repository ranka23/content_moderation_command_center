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

describe('Sync Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/platforms/status', () => {
    it('should return platform status', async () => {
      const res = await request(app)
        .get('/api/cmcc/platforms/status')
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.platform).toBe('shopify')
    })
  })

  describe('POST /api/cmcc/platforms/sync-settings', () => {
    it('should trigger settings sync to other platforms', async () => {
      mockPrepareObj.all.mockReturnValue([
        { key: 'auto_moderate', value: 'true' },
      ])

      const res = await request(app)
        .post('/api/cmcc/platforms/sync-settings')
        .send({ targetPlatforms: ['wordpress'], source: 'shopify' })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/cmcc/platforms/receive-sync', () => {
    it('should receive sync from WordPress', async () => {
      mockPrepareObj.run.mockReturnValue({ changes: 1 })
      mockPrepareObj.all.mockReturnValue([])

      const res = await request(app)
        .post('/api/cmcc/platforms/receive-sync')
        .send({
          firewall_rules: { max_links: 3, global_action: 'spam' },
          auto_moderation: { threshold: 0.8 },
          timestamp: new Date().toISOString(),
          source: 'wordpress',
        })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return error for invalid payload (success false)', async () => {
      const res = await request(app)
        .post('/api/cmcc/platforms/receive-sync')
        .send({ invalid: true })
        .expect(200) // Route returns 200 even on validation failure
      expect(res.body.success).toBe(false)
    })
  })
})
