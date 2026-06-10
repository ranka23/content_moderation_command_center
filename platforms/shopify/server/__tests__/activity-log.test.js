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

describe('Activity Log Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/activity-log', () => {
    it('should return activity log entries with pagination', async () => {
      mockPrepareObj.all.mockReturnValue([
        {
          id: 1,
          moderator_id: 'mod-1',
          action: 'approved',
          content_type: 'review',
          item_title: 'Great!',
          created_at: '2025-01-01',
        },
        {
          id: 2,
          moderator_id: 'mod-2',
          action: 'rejected',
          content_type: 'comment',
          item_title: 'Spam',
          created_at: '2025-01-02',
        },
      ])
      mockPrepareObj.get.mockReturnValue({ count: 2 })

      const res = await request(app).get('/api/cmcc/activity-log').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.entries).toHaveLength(2)
      expect(res.body.data.pagination).toBeDefined()
    })

    it('should accept filter parameters', async () => {
      mockPrepareObj.all.mockReturnValue([])
      mockPrepareObj.get.mockReturnValue({ count: 0 })

      const res = await request(app)
        .get('/api/cmcc/activity-log')
        .query({ action: 'approved', moderatorId: 'mod-1', page: 1, limit: 10 })
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })
})
