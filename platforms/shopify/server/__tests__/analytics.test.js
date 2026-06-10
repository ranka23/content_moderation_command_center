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

describe('Analytics Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/analytics', () => {
    it('should return analytics data with defaults', async () => {
      mockPrepareObj.all
        .mockReturnValueOnce([
          { status: 'pending', count: 5 },
          { status: 'approved', count: 10 },
          { status: 'rejected', count: 3 },
          { status: 'spam', count: 2 },
        ])
        .mockReturnValueOnce([
          { content_type: 'review', count: 8 },
          { content_type: 'comment', count: 12 },
        ])
        .mockReturnValueOnce([
          { moderator_id: 'mod-1', action_count: 15 },
          { moderator_id: 'mod-2', action_count: 7 },
        ])

      // 4 get calls: totalItems, pendingItems, spamCount, approvedCount
      mockPrepareObj.get
        .mockReturnValueOnce({ count: 20 })
        .mockReturnValueOnce({ count: 5 })
        .mockReturnValueOnce({ count: 2 })
        .mockReturnValueOnce({ count: 10 })

      const res = await request(app).get('/api/cmcc/analytics').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.queueBreakdown).toBeDefined()
    })

    it('should accept days parameter', async () => {
      mockPrepareObj.all.mockReturnValue([])
      mockPrepareObj.get.mockReturnValue({ count: 0 })

      const res = await request(app)
        .get('/api/cmcc/analytics')
        .query({ days: 30 })
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })
})
