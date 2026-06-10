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

describe('Retention Routes', () => {
  let app
  let retentionService

  beforeAll(() => {
    const setup = setupApp()
    app = setup.app
    retentionService = setup.retentionService
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/cmcc/notify/purge', () => {
    it('should trigger retention purge', async () => {
      mockPrepareObj.run.mockReturnValue({ changes: 5 })

      const res = await request(app).post('/api/cmcc/notify/purge').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.activityLogPurged).toBeDefined()
    })
  })

  describe('RetentionService', () => {
    it('should purge activity logs', async () => {
      const result = await retentionService.purgeOldActivityLogs(() =>
        Promise.resolve(10),
      )
      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(10)
    })

    it('should purge archived items', async () => {
      const result = await retentionService.purgeOldArchivedItems(() =>
        Promise.resolve(3),
      )
      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(3)
    })
  })
})
