/**
 * Reports route tests
 */
const request = require('supertest')
const { createApp, setupDb, teardownDb } = require('./test-helper')

describe('Reports Routes', () => {
  let app
  let db

  beforeAll(async () => {
    const setup = await setupDb('reports_test')
    db = setup.db
    app = createApp(db)
  })

  afterAll(async () => {
    await teardownDb(db)
  })

  beforeEach(async () => {
    db.exec('DELETE FROM scheduled_reports')
    db.exec('DELETE FROM queue_items')
    db.exec('DELETE FROM activity_logs')
  })

  describe('POST /api/cmcc/reports/moderation-activity', () => {
    it('generates moderation activity report', async () => {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'approve', 'mod-1', 'Mod One', new Date().toISOString())
      stmt.run('item-2', 'reject', 'mod-1', 'Mod One', new Date().toISOString())
      stmt.run('item-3', 'spam', 'mod-2', 'Mod Two', new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/reports/moderation-activity')
        .set('x-api-key', 'test-key')
        .send({ dateFrom: '2020-01-01', dateTo: '2030-01-01' })
        .expect(200)

      expect(res.body.report).toBeDefined()
      expect(res.body.report.totalActions).toBe(3)
      expect(res.body.report.type).toBe('moderation_activity')
    })
  })

  describe('POST /api/cmcc/reports/compliance-audit', () => {
    it('generates compliance audit report', async () => {
      const stmt = db.prepare(`
        INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run('item-1', 'comment', 'spam', 'Bad', 'Content', 'Author', 'a@t.com', 'ip', 95, new Date().toISOString())
      stmt.run('item-2', 'comment', 'approved', 'Good', 'Content', 'Author', 'a@t.com', 'ip', 5, new Date().toISOString())

      const res = await request(app)
        .post('/api/cmcc/reports/compliance-audit')
        .set('x-api-key', 'test-key')
        .send({ dateFrom: '2020-01-01', dateTo: '2030-01-01' })
        .expect(200)

      expect(res.body.report).toBeDefined()
      expect(res.body.report.type).toBe('compliance_audit')
      expect(res.body.report.totalItems).toBe(2)
    })
  })

  describe('POST /api/cmcc/reports/scheduled', () => {
    it('schedules a recurring report', async () => {
      const res = await request(app)
        .post('/api/cmcc/reports/scheduled')
        .set('x-api-key', 'test-key')
        .send({
          type: 'moderation_activity',
          frequency: 'daily',
          format: 'csv',
          emails: ['mod@example.com'],
          createdBy: 'mod-1',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.report).toBeDefined()
      expect(res.body.report.type).toBe('moderation_activity')
      expect(res.body.report.frequency).toBe('daily')
    })
  })

  describe('GET /api/cmcc/reports/scheduled', () => {
    it('lists scheduled reports', async () => {
      db.prepare(`
        INSERT INTO scheduled_reports (id, type, frequency, format, emails, created_by, created_at, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('report-1', 'moderation_activity', 'daily', 'csv', JSON.stringify(['mod@a.com']), 'mod-1', new Date().toISOString(), 1)

      const res = await request(app)
        .get('/api/cmcc/reports/scheduled')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.reports).toBeInstanceOf(Array)
      expect(res.body.reports.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('DELETE /api/cmcc/reports/scheduled/:id', () => {
    it('deletes a scheduled report', async () => {
      db.prepare(`
        INSERT INTO scheduled_reports (id, type, frequency, format, emails, created_by, created_at, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('report-1', 'moderation_activity', 'daily', 'csv', JSON.stringify(['mod@a.com']), 'mod-1', new Date().toISOString(), 1)

      const res = await request(app)
        .delete('/api/cmcc/reports/scheduled/report-1')
        .set('x-api-key', 'test-key')
        .expect(200)

      expect(res.body.success).toBe(true)

      const row = db.prepare('SELECT * FROM scheduled_reports WHERE id = ?').get('report-1')
      expect(row).toBeUndefined()
    })
  })
})
