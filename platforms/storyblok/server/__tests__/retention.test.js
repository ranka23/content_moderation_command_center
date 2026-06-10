/**
 * Retention route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Retention Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('retention_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM activity_logs')
    db.exec('DELETE FROM queue_items')
  })

  describe('POST /api/cmcc/retention/purge', () => {
    it('purges old activity logs', async () => {
      // Create old activity log entries
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      // Old entries (over 90 days)
      stmt.run('item-old-1', 'approve', 'mod-1', 'Mod', '2020-01-01T00:00:00.000Z')
      stmt.run('item-old-2', 'reject', 'mod-1', 'Mod', '2020-01-02T00:00:00.000Z')
      // Recent entry
      stmt.run('item-new', 'approve', 'mod-1', 'Mod', new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/retention/purge')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body).toBeDefined()
      expect(res.body.activityLogPurged).toBeDefined()
    })
  })
})
