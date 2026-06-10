/**
 * RetentionService
 *
 * Manages data retention policies:
 * - Automatic purging of activity logs older than configured days
 * - Automatic purging of archived items older than configured days
 * - Scheduled cleanup cron integration
 *
 * Platform-agnostic; each platform provides the delete function.
 *
 * Usage:
 *   const service = new RetentionService(config)
 *   await service.purgeOldActivityLogs(deleteFn)
 *   await service.runScheduledPurge(deleteLogsFn, deleteArchivesFn)
 */

/**
 * Data retention configuration.
 */
export interface RetentionConfig {
  /** Activity log entries older than this many days will be purged */
  activityLogRetentionDays: number
  /** Archived queue items older than this many days will be purged */
  archivedItemRetentionDays: number
  /** How often to run the auto-purge: 'daily' | 'weekly' | 'monthly' | 'never' */
  autoPurgeSchedule: 'daily' | 'weekly' | 'monthly' | 'never'
  /** Whether to export data before purging */
  exportBeforePurge: boolean
}

/**
 * Result of a purge operation.
 */
export interface PurgeResult {
  success: boolean
  deletedCount?: number
  error?: string
}

/**
 * Combined result of a scheduled purge run.
 */
export interface ScheduledPurgeResult {
  activityLogPurged: PurgeResult
  archivePurged: PurgeResult
  timestamp: string
}

/**
 * Creates a default retention configuration.
 */
export function getDefaultRetentionConfig(): RetentionConfig {
  return {
    activityLogRetentionDays: 90,
    archivedItemRetentionDays: 365,
    autoPurgeSchedule: 'weekly',
    exportBeforePurge: false,
  }
}

/**
 * Service for managing data retention and purging.
 * Accepts platform-specific delete functions to remain agnostic.
 */
export class RetentionService {
  private config: RetentionConfig

  /**
   * @param config - Retention configuration
   */
  constructor(config?: Partial<RetentionConfig>) {
    this.config = { ...getDefaultRetentionConfig(), ...config }
  }

  /**
   * Purge activity log entries older than the configured retention period.
   *
   * @param deleteFn - Platform function that deletes records with createdAt < cutoff
   * @returns PurgeResult with deleted count
   */
  async purgeOldActivityLogs(
    deleteFn: (cutoffDate: Date) => Promise<number>,
  ): Promise<PurgeResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.activityLogRetentionDays)

    try {
      const deletedCount = await deleteFn(cutoffDate)
      return { success: true, deletedCount }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purge failed'
      return { success: false, error: message }
    }
  }

  /**
   * Purge archived queue items older than the configured retention period.
   *
   * @param deleteFn - Platform function that deletes records with archivedAt < cutoff
   * @returns PurgeResult with deleted count
   */
  async purgeOldArchivedItems(
    deleteFn: (cutoffDate: Date) => Promise<number>,
  ): Promise<PurgeResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archivedItemRetentionDays)

    try {
      const deletedCount = await deleteFn(cutoffDate)
      return { success: true, deletedCount }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archive purge failed'
      return { success: false, error: message }
    }
  }

  /**
   * Run a full scheduled purge of both activity logs and archived items.
   *
   * @param deleteLogsFn  - Delete function for activity logs
   * @param deleteArchivesFn  - Delete function for archived items
   * @returns Combined purge result
   */
  async runScheduledPurge(
    deleteLogsFn: (cutoffDate: Date) => Promise<number>,
    deleteArchivesFn: (cutoffDate: Date) => Promise<number>,
  ): Promise<ScheduledPurgeResult> {
    const [activityLogPurged, archivePurged] = await Promise.all([
      this.purgeOldActivityLogs(deleteLogsFn),
      this.purgeOldArchivedItems(deleteArchivesFn),
    ])

    return {
      activityLogPurged,
      archivePurged,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Update the retention configuration at runtime.
   */
  updateConfig(config: Partial<RetentionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get the current retention configuration.
   */
  getConfig(): RetentionConfig {
    return { ...this.config }
  }
}
