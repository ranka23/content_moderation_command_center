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
}

jest.mock('../db', () => ({
  getDb: jest.fn(() => mockDb),
  initDb: jest.fn(),
  runMigrations: jest.fn(),
}))

describe('Reputation Routes', () => {
  let app

  beforeAll(() => {
    const setup = setupApp()
    app = setup.app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/reputation/users', () => {
    it('should return user reputation list', async () => {
      mockPrepareObj.all.mockReturnValue([
        {
          author_id: 'user-1',
          author_name: 'Alice',
          total_items: 10,
          approved_items: 8,
          rejected_items: 1,
          spam_items: 1,
          reputation_score: 80,
        },
        {
          author_id: 'user-2',
          author_name: 'Bob',
          total_items: 5,
          approved_items: 2,
          rejected_items: 2,
          spam_items: 1,
          reputation_score: 40,
        },
      ])

      const res = await request(app)
        .get('/api/cmcc/reputation/users')
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
    })
  })

  describe('GET /api/cmcc/reputation/user/:id', () => {
    it('should return user reputation detail', async () => {
      mockPrepareObj.all.mockReturnValue([
        {
          author_id: 'user-1',
          author_name: 'Alice',
          total_items: 10,
          approved_items: 8,
          rejected_items: 1,
          spam_items: 1,
          reputation_score: 80,
        },
      ])

      const res = await request(app)
        .get('/api/cmcc/reputation/user/user-1')
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.author_id).toBe('user-1')
    })

    it('should return 404 for unknown user', async () => {
      mockPrepareObj.all.mockReturnValue([])

      const res = await request(app)
        .get('/api/cmcc/reputation/user/unknown-user')
        .expect(404)

      expect(res.body.success).toBe(false)
    })
  })
})
