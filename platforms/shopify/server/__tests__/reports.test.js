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

describe('Reports Routes', () => {
  let app
  let scheduledReportService

  beforeAll(() => {
    const setup = setupApp()
    app = setup.app
    scheduledReportService = setup.scheduledReportService
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/cmcc/reports/moderation-activity', () => {
    it('should generate a moderation activity report', async () => {
      mockPrepareObj.all
        .mockReturnValueOnce([
          { status: 'pending', count: 5 },
          { status: 'approved', count: 10 },
        ])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])

      const res = await request(app)
        .post('/api/cmcc/reports/moderation-activity')
        .send({ days: 7 })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/cmcc/reports/compliance-audit', () => {
    it('should generate a compliance audit report', async () => {
      mockPrepareObj.all.mockReturnValue([])
      mockPrepareObj.get.mockReturnValue({ count: 0 })

      const res = await request(app)
        .post('/api/cmcc/reports/compliance-audit')
        .send({ days: 30 })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/cmcc/reports/scheduled', () => {
    it('should schedule a new report', async () => {
      const res = await request(app)
        .post('/api/cmcc/reports/scheduled')
        .send({
          type: 'moderation_activity',
          frequency: 'daily',
          format: 'csv',
          emails: ['admin@example.com'],
          createdBy: 'mod-1',
        })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.type).toBe('moderation_activity')
    })

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/cmcc/reports/scheduled')
        .send({ type: 'moderation_activity' })
        .expect(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/cmcc/reports/scheduled', () => {
    it('should list scheduled reports', async () => {
      // Pre-schedule a report so the list is not empty
      await scheduledReportService.schedule({
        type: 'test',
        frequency: 'daily',
        emails: ['a@b.com'],
        createdBy: 'mod-1',
      })

      const res = await request(app)
        .get('/api/cmcc/reports/scheduled')
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('DELETE /api/cmcc/reports/scheduled/:id', () => {
    it('should delete a scheduled report', async () => {
      // Pre-schedule a report so we can delete it
      const report = await scheduledReportService.schedule({
        type: 'test',
        frequency: 'daily',
        emails: ['a@b.com'],
        createdBy: 'mod-1',
      })

      const res = await request(app)
        .delete(`/api/cmcc/reports/scheduled/${report.id}`)
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })
})
