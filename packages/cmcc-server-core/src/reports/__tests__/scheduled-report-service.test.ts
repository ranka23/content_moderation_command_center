/**
 * Scheduled Report Service — Unit Tests
 */
import { ScheduledReportService } from '../scheduled-report-service'

describe('ScheduledReportService', () => {
  let service: ScheduledReportService

  beforeEach(() => {
    service = new ScheduledReportService()
  })

  describe('schedule', () => {
    it('creates a scheduled report with all required fields', async () => {
      const report = await service.schedule({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@example.com'],
        createdBy: 'mod-1',
      })

      expect(report.id).toBeDefined()
      expect(report.type).toBe('moderation_activity')
      expect(report.frequency).toBe('daily')
      expect(report.format).toBe('csv')
      expect(report.emails).toEqual(['admin@example.com'])
      expect(report.active).toBe(true)
    })

    it('accepts JSON format', async () => {
      const report = await service.schedule({
        type: 'compliance_audit',
        frequency: 'weekly',
        format: 'json',
        emails: ['audit@example.com'],
        createdBy: 'admin',
      })

      expect(report.format).toBe('json')
    })
  })

  describe('getAll', () => {
    it('returns an empty array when no reports are scheduled', async () => {
      const reports = await service.getAll()
      expect(reports).toEqual([])
    })

    it('returns all scheduled reports', async () => {
      await service.schedule({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['a@example.com'],
        createdBy: 'mod-1',
      })

      await service.schedule({
        type: 'compliance_audit',
        frequency: 'weekly',
        format: 'json',
        emails: ['b@example.com'],
        createdBy: 'mod-2',
      })

      const reports = await service.getAll()
      expect(reports).toHaveLength(2)
    })
  })

  describe('delete', () => {
    it('deletes a scheduled report by ID', async () => {
      const report = await service.schedule({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['test@example.com'],
        createdBy: 'mod-1',
      })

      const result = await service.delete(report.id)
      expect(result.success).toBe(true)

      const reports = await service.getAll()
      expect(reports).toHaveLength(0)
    })

    it('returns false when report ID is not found', async () => {
      const result = await service.delete('nonexistent-id')
      expect(result.success).toBe(false)
    })
  })

  describe('getDueReports', () => {
    it('returns daily reports as due', async () => {
      await service.schedule({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@example.com'],
        createdBy: 'mod-1',
      })

      const due = await service.getDueReports()
      expect(due.length).toBeGreaterThanOrEqual(1)
    })

    it('excludes inactive reports from due list', async () => {
      const report = await service.schedule({
        type: 'moderation_activity',
        frequency: 'daily',
        format: 'csv',
        emails: ['admin@example.com'],
        createdBy: 'mod-1',
      })

      // Manually deactivate
      await service.toggleActive(report.id, false)

      const due = await service.getDueReports()
      // Inactive reports should NOT appear in the due list at all
      expect(due.find((r) => r.id === report.id)).toBeUndefined()
    })
  })

  describe('shouldRunNow', () => {
    it('returns true for daily frequency', () => {
      const result = (service as any).shouldRunNow({ frequency: 'daily' })
      expect(result).toBe(true)
    })

    it('returns true for weekly on Mondays (day 1)', () => {
      // Mock current day to Monday
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1)
      const result = (service as any).shouldRunNow({ frequency: 'weekly' })
      expect(result).toBe(true)
      jest.restoreAllMocks()
    })

    it('returns true for monthly on 1st day', () => {
      jest.spyOn(Date.prototype, 'getDate').mockReturnValue(1)
      const result = (service as any).shouldRunNow({ frequency: 'monthly' })
      expect(result).toBe(true)
      jest.restoreAllMocks()
    })
  })
})
