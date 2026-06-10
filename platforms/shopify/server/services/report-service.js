/**
 * Report service - handles scheduled report management.
 */

/**
 * Create a new scheduled report.
 */
function createScheduledReport(scheduledReportService, input) {
  if (!input.type || !input.frequency || !input.emails || !input.createdBy) {
    const err = new Error(
      'Missing required fields: type, frequency, emails, createdBy',
    )
    err.statusCode = 400
    throw err
  }

  if (!['daily', 'weekly', 'monthly'].includes(input.frequency)) {
    const err = new Error(
      'Invalid frequency. Must be daily, weekly, or monthly',
    )
    err.statusCode = 400
    throw err
  }

  return scheduledReportService.schedule(input)
}

/**
 * List all scheduled reports.
 */
function listScheduledReports(scheduledReportService) {
  return scheduledReportService.getAll()
}

/**
 * Delete a scheduled report.
 */
function deleteScheduledReport(scheduledReportService, id) {
  return scheduledReportService.delete(id)
}

module.exports = {
  createScheduledReport,
  listScheduledReports,
  deleteScheduledReport,
}
