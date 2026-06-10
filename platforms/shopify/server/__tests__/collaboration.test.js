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

describe('Collaboration Routes', () => {
  let app

  beforeAll(() => {
    app = setupApp().app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/queue/:id/notes', () => {
    it('should return notes for a queue item', async () => {
      mockPrepareObj.all.mockReturnValue([
        {
          id: 1,
          item_id: 1,
          moderator_id: 'mod-1',
          moderator_name: 'Admin',
          note: 'Checking this',
          created_at: '2025-01-01',
        },
      ])
      const res = await request(app).get('/api/cmcc/queue/1/notes').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
    })
  })

  describe('POST /api/cmcc/queue/:id/notes', () => {
    it('should add a note to a queue item', async () => {
      mockPrepareObj.run.mockReturnValue({ changes: 1 })
      mockPrepareObj.get.mockReturnValue({
        id: 1,
        item_id: 1,
        moderator_id: 'mod-1',
        note: 'Reviewed and looks good',
      })

      const res = await request(app)
        .post('/api/cmcc/queue/1/notes')
        .send({
          moderatorId: 'mod-1',
          moderatorName: 'Admin',
          note: 'Reviewed and looks good',
        })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 400 if note is missing', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/1/notes')
        .send({ moderatorId: 'mod-1' })
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/cmcc/queue/:id/assign', () => {
    it('should assign an item to a moderator', async () => {
      mockPrepareObj.get.mockReturnValue({ id: 1, status: 'pending' })
      mockPrepareObj.run.mockReturnValue({ changes: 1 })

      const res = await request(app)
        .post('/api/cmcc/queue/1/assign')
        .send({
          moderatorId: 'mod-1',
          moderatorName: 'Admin',
          assignTo: 'mod-2',
        })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 400 if assignTo is missing', async () => {
      const res = await request(app)
        .post('/api/cmcc/queue/1/assign')
        .send({ moderatorId: 'mod-1' })
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })
})
