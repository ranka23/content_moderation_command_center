/**
 * ScheduledReportService
 *
 * Manages recurring report scheduling:
 * - Schedule daily/weekly/monthly reports
 * - Determine which reports are due at any given time
 * - Track active/inactive state and last-sent timestamps
 *
 * Usage:
 *   const service = new ScheduledReportService()
 *   const report = await service.schedule({ type, frequency, format, emails, createdBy })
 *   const due = await service.getDueReports()
 *   await service.markSent(report.id)
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Scheduled report definition.
 */
export interface ScheduledReport {
  /** Unique report schedule ID */
  id: string
  /** Report type: moderation_activity, compliance_audit, moderator_performance */
  type: string
  /** How often to send: daily, weekly, monthly */
  frequency: 'daily' | 'weekly' | 'monthly'
  /** Output format: csv, json */
  format: 'csv' | 'json'
  /** Recipient email addresses */
  emails: string[]
  /** Who created the schedule */
  createdBy: string
  /** When the schedule was created */
  createdAt: string
  /** Timestamp of the last successful delivery */
  lastSentAt?: string
  /** Whether the schedule is active */
  active: boolean
}

/**
 * Input for creating a new scheduled report.
 */
export interface ScheduleReportInput {
  type: string
  frequency: 'daily' | 'weekly' | 'monthly'
  format?: 'csv' | 'json'
  emails: string[]
  createdBy: string
}

/**
 * Service for scheduling and managing recurring reports.
 */
export class ScheduledReportService {
  private schedules: ScheduledReport[] = []

  /**
   * Schedule a new recurring report.
   *
   * @param input - Schedule input
   * @returns The created ScheduledReport
   */
  async schedule(input: ScheduleReportInput): Promise<ScheduledReport> {
    const report: ScheduledReport = {
      id: uuidv4(),
      type: input.type,
      frequency: input.frequency,
      format: input.format || 'csv',
      emails: input.emails,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      active: true,
    }

    this.schedules.push(report)
    return report
  }

  /**
   * Get all scheduled reports.
   */
  async getAll(): Promise<ScheduledReport[]> {
    return [...this.schedules]
  }

  /**
   * Get a single scheduled report by ID.
   */
  async getById(id: string): Promise<ScheduledReport | undefined> {
    return this.schedules.find((s) => s.id === id)
  }

  /**
   * Delete a scheduled report.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const index = this.schedules.findIndex((s) => s.id === id)
    if (index === -1) return { success: false }

    this.schedules.splice(index, 1)
    return { success: true }
  }

  /**
   * Toggle a scheduled report's active state.
   */
  async toggleActive(
    id: string,
    active: boolean,
  ): Promise<{ success: boolean }> {
    const report = this.schedules.find((s) => s.id === id)
    if (!report) return { success: false }

    report.active = active
    return { success: true }
  }

  /**
   * Get all reports that are due to be sent now.
   * Respects frequency and active state.
   */
  async getDueReports(): Promise<ScheduledReport[]> {
    return this.schedules.filter((report) => {
      if (!report.active) return false
      return this.shouldRunNow(report)
    })
  }

  /**
   * Mark a report as sent (updates lastSentAt).
   */
  async markSent(id: string): Promise<void> {
    const report = this.schedules.find((s) => s.id === id)
    if (report) {
      report.lastSentAt = new Date().toISOString()
    }
  }

  /**
   * Build a hash of this service's state for comparison.
   */
  async toJSON(): Promise<{ schedules: ScheduledReport[] }> {
    return { schedules: [...this.schedules] }
  }

  /**
   * Determine if a report should run based on its frequency.
   */
  private shouldRunNow(report: ScheduledReport): boolean {
    switch (report.frequency) {
      case 'daily':
        return true
      case 'weekly':
        return new Date().getDay() === 1 // Monday
      case 'monthly':
        return new Date().getDate() === 1 // 1st of month
      default:
        return false
    }
  }
}
