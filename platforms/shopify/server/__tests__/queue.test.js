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

describe('Queue Routes', () => {
  let app

  beforeAll(() => {
    const setup = setupApp()
    app = setup.app
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cmcc/queue', () => {
    it('should return paginated queue items with default params', async () => {
      const mockItems = [
        {
          id: 1,
          item_id: 'item-1',
          content_type: 'review',
          status: 'pending',
          spam_score: 0,
          author_name: 'Alice',
          title: 'Great product',
          created_at: '2025-01-01',
        },
        {
          id: 2,
          item_id: 'item-2',
          content_type: 'comment',
          status: 'approved',
          spam_score: 0.1,
          author_name: 'Bob',
          title: 'Nice!',
          created_at: '2025-01-02',
        },
      ]

      mockPrepareObj.all.mockReturnValue(mockItems)
      mockPrepareObj.get.mockReturnValue({ count: 2 })

      const res = await request(app).get('/api/cmcc/queue').expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.items).toHaveLength(2)
      expect(res.body.data.pagination).toBeDefined()
      expect(res.body.data.pagination.total).toBe(2)
    })

    it('should accept query parameters for filtering', async () => {
      mockPrepareObj.all.mockReturnValue([])
      mockPrepareObj.get.mockReturnValue({ count: 0 })

      const res = await request(app)
        .get('/api/cmcc/queue')
        .query({ status: 'pending', contentType: 'review', page: 1, limit: 20 })
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/cmcc/queue/:id/moderate', () => {
    it('should moderate an item and return updated item', async () => {
      const existingItem = {
        id: 1,
        item_id: 'item-1',
        status: 'pending',
        content_type: 'review',
        title: 'Test review',
      }
      const updatedItem = { ...existingItem, status: 'approved' }

      // First get returns existing, second get returns updated (after status change)
      mockPrepareObj.get
        .mockReturnValueOnce(existingItem)
        .mockReturnValueOnce(updatedItem)
      mockPrepareObj.run.mockReturnValue({ changes: 1 })

      const res = await request(app)
        .post('/api/cmcc/queue/1/moderate')
        .send({
          action: 'approve',
          moderatorId: 'mod-1',
          moderatorName: 'Admin',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })

    it('should return 404 for non-existent item', async () => {
      mockPrepareObj.get.mockReturnValue(undefined)

      const res = await request(app)
        .post('/api/cmcc/queue/999/moderate')
        .send({ action: 'approve', moderatorId: 'mod-1' })
        .expect(404)

      expect(res.body.success).toBe(false)
    })

    it('should return 400 for invalid action', async () => {
      mockPrepareObj.get.mockReturnValue({ id: 1, status: 'pending' })

      const res = await request(app)
        .post('/api/cmcc/queue/1/moderate')
        .send({ action: 'invalid', moderatorId: 'mod-1' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/cmcc/queue/bulk', () => {
    it('should bulk moderate items', async () => {
      mockPrepareObj.get
        .mockReturnValueOnce({
          id: 1,
          status: 'pending',
          content_type: 'review',
          item_id: 'i1',
        })
        .mockReturnValueOnce({
          id: 2,
          status: 'pending',
          content_type: 'review',
          item_id: 'i2',
        })
        .mockReturnValueOnce({
          id: 3,
          status: 'pending',
          content_type: 'review',
          item_id: 'i3',
        })
      mockPrepareObj.run.mockReturnValue({ changes: 1 })

      const res = await request(app)
        .post('/api/cmcc/queue/bulk')
        .send({
          action: 'reject',
          ids: [1, 2, 3],
          moderatorId: 'mod-1',
          moderatorName: 'Admin',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.moderated).toBeGreaterThanOrEqual(0)
    })
  })

  describe('GET /api/cmcc/queue/:id/history', () => {
    it('should return item history', async () => {
      mockPrepareObj.all.mockReturnValue([
        {
          id: 1,
          action: 'approved',
          moderator_id: 'mod-1',
          created_at: '2025-01-01',
        },
      ])
      mockPrepareObj.get.mockReturnValue({ item_id: 'item-1' })

      const res = await request(app)
        .get('/api/cmcc/queue/1/history')
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('POST /api/cmcc/queue/:id/undo', () => {
    it('should undo last moderation action', async () => {
      mockPrepareObj.get.mockReturnValue({
        id: 1,
        status: 'approved',
        item_id: 'item-1',
      })

      const res = await request(app)
        .post('/api/cmcc/queue/1/undo')
        .send({ moderatorId: 'mod-1' })
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/cmcc/queue/:id/undo-info', () => {
    it('should return undo availability info', async () => {
      mockPrepareObj.get.mockReturnValue({ id: 1, status: 'approved' })

      const res = await request(app)
        .get('/api/cmcc/queue/1/undo-info')
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/cmcc/queue/:id/evaluate', () => {
    it('should run firewall evaluation on an item', async () => {
      mockPrepareObj.get.mockReturnValue({
        id: 1,
        item_id: 'item-1',
        content_type: 'review',
        title: 'Test',
        excerpt: 'This is a test review',
        author_ip: '192.168.1.1',
        author_email: 'test@example.com',
        status: 'pending',
      })

      const res = await request(app)
        .post('/api/cmcc/queue/1/evaluate')
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.evaluation).toBeDefined()
    })

    it('should return 404 for non-existent item', async () => {
      mockPrepareObj.get.mockReturnValue(undefined)

      const res = await request(app)
        .post('/api/cmcc/queue/999/evaluate')
        .expect(404)

      expect(res.body.success).toBe(false)
    })
  })
})
