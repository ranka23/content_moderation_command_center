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

describe('Notification Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/cmcc/notifications/send', () => {
    it('should send a notification', async () => {
      const res = await request(app)
        .post('/api/cmcc/notifications/send')
        .send({
          type: 'new_item',
          data: { title: 'Test', content_type: 'review' },
          to: ['admin@example.com'],
        })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/cmcc/notifications/send')
        .send({})
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })
})
