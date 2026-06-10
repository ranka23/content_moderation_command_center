const {
  setupTestDb,
  createTestApp,
  seedQueueItem,
  withAuth,
  request,
} = require('./helpers')

describe('Reputation Routes', () => {
  let db
  let app

  beforeEach(() => {
    db = setupTestDb()
    app = createTestApp(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('GET /api/cmcc/reputation/users', () => {
    it('returns empty array when no queue items', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/reputation/users'))
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns user reputation list with trust levels', async () => {
      seedQueueItem(db, { id: 'item_1', authorName: 'Alice', authorEmail: 'alice@example.com', status: 'approved', spamScore: 10 })
      seedQueueItem(db, { id: 'item_2', authorName: 'Alice', authorEmail: 'alice@example.com', status: 'pending', spamScore: 20 })
      seedQueueItem(db, { id: 'item_3', authorName: 'Bob', authorEmail: 'bob@example.com', status: 'spam', spamScore: 85 })

      const res = await withAuth(request(app).get('/api/cmcc/reputation/users'))
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)

      const alice = res.body.find(u => u.authorEmail === 'alice@example.com')
      expect(alice).toBeDefined()
      expect(alice.totalItems).toBe(2)
      expect(alice.spamCount).toBe(0)

      const bob = res.body.find(u => u.authorEmail === 'bob@example.com')
      expect(bob).toBeDefined()
      expect(bob.spamCount).toBe(1)
    })

    it('assigns trust level based on spam ratio', async () => {
      seedQueueItem(db, { id: 'item_1', authorEmail: 'trusted@example.com', status: 'approved' })
      seedQueueItem(db, { id: 'item_2', authorEmail: 'trusted@example.com', status: 'approved' })
      seedQueueItem(db, { id: 'item_3', authorEmail: 'risky@example.com', status: 'spam' })

      const res = await withAuth(request(app).get('/api/cmcc/reputation/users'))
      expect(res.status).toBe(200)

      const trusted = res.body.find(u => u.authorEmail === 'trusted@example.com')
      expect(trusted.trustLevel).toBe('trusted')

      const risky = res.body.find(u => u.authorEmail === 'risky@example.com')
      expect(risky.trustLevel).toBe('risky')
    })
  })

  describe('GET /api/cmcc/reputation/user/:id', () => {
    it('returns detailed user reputation', async () => {
      seedQueueItem(db, { id: 'item_1', authorName: 'Alice', authorEmail: 'alice@example.com', status: 'approved', contentType: 'comment' })
      seedQueueItem(db, { id: 'item_2', authorName: 'Alice', authorEmail: 'alice@example.com', status: 'pending', contentType: 'review' })

      const res = await withAuth(request(app).get('/api/cmcc/reputation/user/alice@example.com'))
      expect(res.status).toBe(200)
      expect(res.body.authorEmail).toBe('alice@example.com')
      expect(res.body.totalItems).toBe(2)
      expect(res.body.items).toHaveLength(2)
    })

    it('returns 404 for unknown user', async () => {
      const res = await withAuth(request(app).get('/api/cmcc/reputation/user/unknown@example.com'))
      expect(res.status).toBe(404)
    })
  })
})
