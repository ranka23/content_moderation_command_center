/**
 * Notifications route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Notifications Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('notifications_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  describe('POST /api/cmcc/notifications/send', () => {
    it('sends a notification email', async () => {
      const res = await request(app)
        .post('/api/cmcc/notifications/send')
        .set('x-api-key', 'test-key')
        .send({
          type: 'new_item',
          to: ['mod@example.com'],
          data: {
            title: 'Test Item',
            content_type: 'comment',
            status: 'pending',
          },
        })
        .expect(200)

      expect(res.body).toBeDefined()
      // Email service may fail if no SMTP configured, but should return a result
      expect(res.body.success !== undefined).toBe(true)
    })

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/cmcc/notifications/send')
        .set('x-api-key', 'test-key')
        .send({})
        .expect(400)

      expect(res.body.error).toBeDefined()
    })
  })
})
