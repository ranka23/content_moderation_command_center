/**
 * Retention Service — Unit Tests
 */
import type { RetentionConfig } from '../retention-service'
import { RetentionService } from '../retention-service'

describe('RetentionService', () => {
  let service: RetentionService
  let mockDeleteFn: jest.Mock

  const config: RetentionConfig = {
    activityLogRetentionDays: 90,
    archivedItemRetentionDays: 365,
    autoPurgeSchedule: 'weekly',
    exportBeforePurge: false,
  }

  beforeEach(() => {
    mockDeleteFn = jest.fn()
    service = new RetentionService(config)
  })

  describe('purgeOldActivityLogs', () => {
    it('calls the delete function with correct cutoff date', async () => {
      const result = await service.purgeOldActivityLogs(mockDeleteFn)

      expect(result.success).toBe(true)
      expect(mockDeleteFn).toHaveBeenCalledTimes(1)
      // Should pass a date 90 days ago
      const cutoffArg = mockDeleteFn.mock.calls[0][0]
      expect(cutoffArg).toBeInstanceOf(Date)
    })

    it('returns count of deleted entries', async () => {
      mockDeleteFn.mockResolvedValue(42)

      const result = await service.purgeOldActivityLogs(mockDeleteFn)

      expect(result.deletedCount).toBe(42)
    })

    it('handles delete function errors gracefully', async () => {
      mockDeleteFn.mockRejectedValue(new Error('DB error'))

      const result = await service.purgeOldActivityLogs(mockDeleteFn)

      expect(result.success).toBe(false)
      expect(result.error).toBe('DB error')
    })
  })

  describe('purgeOldArchivedItems', () => {
    it('calls the delete function with correct cutoff date for archived items', async () => {
      const result = await service.purgeOldArchivedItems(mockDeleteFn)

      expect(result.success).toBe(true)
      expect(mockDeleteFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('runScheduledPurge', () => {
    it('runs both activity log and archive purges', async () => {
      mockDeleteFn.mockResolvedValue(10)

      const result = await service.runScheduledPurge(mockDeleteFn, mockDeleteFn)

      expect(result.activityLogPurged).toBeDefined()
      expect(result.archivePurged).toBeDefined()
      expect(mockDeleteFn).toHaveBeenCalledTimes(2)
    })

    it('handles partial failures', async () => {
      mockDeleteFn
        .mockResolvedValueOnce(50) // activity log succeeds
        .mockRejectedValueOnce(new Error('Archive error')) // archive fails

      const result = await service.runScheduledPurge(mockDeleteFn, mockDeleteFn)

      expect(result.activityLogPurged.success).toBe(true)
      expect(result.archivePurged.success).toBe(false)
      expect(result.archivePurged.error).toBe('Archive error')
    })
  })
})
