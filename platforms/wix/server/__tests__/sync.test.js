const {
  setupTestDb,
  createTestApp,
  seedSetting,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Sync Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('platforms routes', () => {
    describe('GET /api/cmcc/platforms/status', () => {
      it('returns platform connection status', async () => {
        const res = await withAuth(
          request(app).get('/api/cmcc/platforms/status'),
        )
        expect(res.status).toBe(200)
        expect(res.body.platform).toBe('wix')
        expect(res.body.connected).toBe(true)
        expect(res.body.services).toBeDefined()
      })
    })

    describe('POST /api/cmcc/platforms/sync-settings', () => {
      it('syncs settings to other platforms', async () => {
        seedSetting(db, 'maxLinks', '5')
        seedSetting(db, 'minSubmitTime', '3')

        const res = await withAuth(
          request(app).post('/api/cmcc/platforms/sync-settings'),
        ).send({ targetPlatforms: ['shopify', 'storyblok'] })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.platform).toBe('wix')
        expect(res.body.syncedSettings).toBeDefined()
      })
    })

    describe('POST /api/cmcc/platforms/receive-sync', () => {
      it('receives sync payload from hub', async () => {
        const res = await withAuth(
          request(app).post('/api/cmcc/platforms/receive-sync'),
        ).send({
          firewall_rules: { max_links: 3 },
          auto_moderation: { enabled: true },
          timestamp: new Date().toISOString(),
          source: 'wordpress-hub',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.platform).toBe('wix')
      })

      it('returns 400 for invalid payload', async () => {
        const res = await withAuth(
          request(app).post('/api/cmcc/platforms/receive-sync'),
        ).send({ invalid: true })

        expect(res.status).toBe(400)
      })
    })

    describe('GET /api/cmcc/unified-queue', () => {
      it('returns aggregated queue across platforms', async () => {
        seedQueueItem(db, { id: 'item_1', platform: 'wix', title: 'Wix Item' })
        seedQueueItem(db, {
          id: 'item_2',
          platform: 'shopify',
          title: 'Shopify Item',
        })

        const res = await withAuth(request(app).get('/api/cmcc/unified-queue'))
        expect(res.status).toBe(200)
        expect(res.body.items).toHaveLength(2)
        expect(res.body.platforms).toContain('wix')
        expect(res.body.platforms).toContain('shopify')
      })
    })
  })

  describe('hooks routes', () => {
    describe('GET /api/cmcc/hooks', () => {
      it('returns list of content hooks', async () => {
        const res = await withAuth(request(app).get('/api/cmcc/hooks'))
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
      })
    })

    describe('POST /api/cmcc/hooks/:name/toggle', () => {
      it('toggles a content hook', async () => {
        const {
          ContentHookService: _ContentHookService,
        } = require('@cmcc/server-core')
        const hookService = app.locals.contentHookService
        hookService.registerHook({
          name: 'comment_hook',
          contentType: 'comment',
          description: 'Import comments',
          enabled: true,
        })

        const res = await withAuth(
          request(app).post('/api/cmcc/hooks/comment_hook/toggle'),
        ).send({ enabled: false })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const hooks = hookService.getHooks()
        const hook = hooks.find((h) => h.name === 'comment_hook')
        expect(hook.enabled).toBe(false)
      })

      it('returns 404 for non-existent hook', async () => {
        const res = await withAuth(
          request(app).post('/api/cmcc/hooks/nonexistent/toggle'),
        ).send({ enabled: false })

        expect(res.status).toBe(404)
      })
    })
  })
})
