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

describe('Webhook Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/cmcc/webhooks/test', () => {
    it('should test webhook dispatch', async () => {
      const res = await request(app)
        .post('/api/cmcc/webhooks/test')
        .send({
          url: 'https://example.com/webhook',
          event: 'moderation.action',
          data: { itemId: '1' },
        })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 400 for missing url', async () => {
      const res = await request(app)
        .post('/api/cmcc/webhooks/test')
        .send({ event: 'moderation.action' })
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })
})
