/**
 * Sync route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Sync Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('sync_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  describe('GET /api/cmcc/platforms/status', () => {
    it('returns platform connection status', async () => {
      const res = await request(app)
        .get('/api/cmcc/platforms/status')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.platforms).toBeDefined()
      expect(res.body.platforms).toBeInstanceOf(Array)
      expect(res.body.current).toBe('storyblok')
    })
  })

  describe('POST /api/cmcc/platforms/sync-settings', () => {
    it('syncs settings to other platforms', async () => {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('spamThreshold', '0.8')

      const res = await request(app)
        .post('/api/cmcc/platforms/sync-settings')
        .set('x-api-key', 'test-key')
        .send({ targetPlatforms: ['wordpress', 'shopify'] })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.syncedTo).toBeInstanceOf(Array)
    })
  })

  describe('POST /api/cmcc/platforms/receive-sync', () => {
    it('receives settings sync from another platform', async () => {
      const res = await request(app)
        .post('/api/cmcc/platforms/receive-sync')
        .set('x-api-key', 'test-key')
        .send({
          firewall_rules: {
            max_links: 3,
            blacklisted_keywords: 'spam,buy now',
          },
          auto_moderation: {
            autoApprove: true,
          },
          timestamp: new Date().toISOString(),
          source: 'wordpress',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.platform).toBe('storyblok')
    })

    it('returns 400 for invalid sync payload', async () => {
      const res = await request(app)
        .post('/api/cmcc/platforms/receive-sync')
        .set('x-api-key', 'test-key')
        .send({})
        .expect(400)

      expect(res.body.error).toBeDefined()
    })
  })

  describe('GET /api/cmcc/unified-queue', () => {
    it('returns aggregated queue from all platforms', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at, platform)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'pending', 'SB Item', 'C', 'Auth', 'a@t.com', 'ip', 10, new Date().toISOString(), 'storyblok')

      const res = await request(app)
        .get('/api/cmcc/unified-queue')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.items).toBeDefined()
      expect(res.body.items.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('POST /api/cmcc/webhooks/test', () => {
    it('tests a webhook URL', async () => {
      const res = await request(app)
        .post('/api/cmcc/webhooks/test')
        .set('x-api-key', 'test-key')
        .send({ url: 'https://hooks.example.com/test' })
        .expect(200)

      expect(res.body.result).toBeDefined()
    })
  })

  describe('GET /api/cmcc/hooks', () => {
    it('lists registered content hooks', async () => {
      const res = await request(app)
        .get('/api/cmcc/hooks')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.hooks).toBeInstanceOf(Array)
    })
  })

  describe('POST /api/cmcc/hooks/:name/toggle', () => {
    it('toggles a content hook', async () => {
      const res = await request(app)
        .post('/api/cmcc/hooks/storyblok-content/toggle')
        .set('x-api-key', 'test-key')
        .send({ enabled: false })
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('returns 401 without API key', async () => {
      const res = await request(app)
        .get('/api/cmcc/queue')
        .expect(401)

      expect(res.body.error).toBeDefined()
    })

    it('returns 403 with wrong API key', async () => {
      const res = await request(app)
        .get('/api/cmcc/queue')
        .set('x-api-key', 'wrong-key')
        .expect(403)

      expect(res.body.error).toBeDefined()
    })
  })
})
