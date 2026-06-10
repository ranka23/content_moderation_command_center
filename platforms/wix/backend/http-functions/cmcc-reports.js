/**
 * CMCC Reports — Wix HTTP Functions
 *
 * REST API endpoints for report generation and scheduling.
 * Mounted at: /api/cmcc/reports/*
 */

import {
  getQueueItems,
  getActivityLogs,
  getScheduledReports,
  createScheduledReport,
  deleteScheduledReport,
} from '../cmcc/data'

/**
 * POST /api/cmcc/reports/export-csv
 * Export moderation activity as CSV data.
 */
export async function post_export_csv(request) {
  const days = parseInt((request.body || {}).days, 10) || 7
  const type = (request.body || {}).type || 'moderation'

  try {
    const allItems = await getQueueItems({ pageSize: 2000 })
    const since = new Date(Date.now() - days * 86400000)

    const moderated = allItems.items.filter(
      (i) => i.moderatedAt && new Date(i.moderatedAt) >= since,
    )

    if (type === 'activity') {
      const logResult = await getActivityLogs({ pageSize: 2000 })
      const filtered = logResult.entries.filter(
        (e) => e.createdAt && new Date(e.createdAt) >= since,
      )

      const header =
        'ID,Action,Actor,Item ID,Content Type,Description,Created At\n'
      const rows = filtered
        .map(
          (e) =>
            `"${e._id || ''}","${e.action || ''}","${e.actorName || ''}","${e.itemId || ''}","${e.contentType || ''}","${(e.description || '').replace(/"/g, '\\"')}","${e.createdAt || ''}"`,
        )
        .join('\n')

      return ok({
        csv: header + rows,
        filename: `cmcc-activity-export-${new Date().toISOString().slice(0, 10)}.csv`,
        totalRows: filtered.length,
        period: `${days} days`,
      })
    }

    // Default: moderation activity export
    const header =
      'ID,Title,Author,Content Type,Status,Moderated By,Moderated At\n'
    const rows = moderated
      .map(
        (i) =>
          `"${i._id || ''}","${(i.title || '').replace(/"/g, '\\"')}","${i.authorName || ''}","${i.contentType || ''}","${i.status || ''}","${i.moderatedBy || ''}","${i.moderatedAt || ''}"`,
      )
      .join('\n')

    return ok({
      csv: header + rows,
      filename: `cmcc-moderation-export-${new Date().toISOString().slice(0, 10)}.csv`,
      totalRows: moderated.length,
      period: `${days} days`,
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/reports/moderation-activity
 * Generate a moderation activity report.
 */
export async function post_moderation_activity(request) {
  const days = parseInt((request.body || {}).days, 10) || 7

  try {
    const allItems = await getQueueItems({ pageSize: 1000 })
    const since = new Date(Date.now() - days * 86400000)

    const moderated = allItems.items.filter(
      (i) => i.moderatedAt && new Date(i.moderatedAt) >= since,
    )

    const breakdown = {}
    for (const item of moderated) {
      const key = `${item.moderatedBy || 'unknown'}|${item.contentType || 'unknown'}`
      if (!breakdown[key]) {
        breakdown[key] = {
          moderator: item.moderatedBy || 'unknown',
          contentType: item.contentType || 'unknown',
          count: 0,
          statuses: {},
        }
      }
      breakdown[key].count++
      breakdown[key].statuses[item.status] =
        (breakdown[key].statuses[item.status] || 0) + 1
    }

    return ok({
      report: {
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
        totalModerated: moderated.length,
        breakdown: Object.values(breakdown),
      },
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/reports/compliance-audit
 * Generate a compliance audit report.
 */
export async function post_compliance_audit(request) {
  const days = parseInt((request.body || {}).days, 10) || 30
  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    const logResult = await getActivityLogs({ pageSize: 1000 })
    const filtered = logResult.entries.filter((e) => e.createdAt >= since)

    const actionBreakdown = {}
    const moderatorActions = {}
    for (const entry of filtered) {
      actionBreakdown[entry.action] = (actionBreakdown[entry.action] || 0) + 1
      if (entry.actorName) {
        const key = `${entry.actorName}|${entry.action}`
        moderatorActions[key] = (moderatorActions[key] || 0) + 1
      }
    }

    return ok({
      report: {
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
        totalActions: filtered.length,
        actionBreakdown: Object.entries(actionBreakdown).map(
          ([action, count]) => ({ action, count }),
        ),
        moderatorActions: Object.entries(moderatorActions).map(
          ([key, count]) => {
            const [actorName, action] = key.split('|')
            return { actorName, action, count }
          },
        ),
      },
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/reports/scheduled
 * List all scheduled reports.
 */
export async function get_scheduled(_request) {
  try {
    const reports = await getScheduledReports()
    return ok(reports)
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/reports/scheduled
 * Schedule a new recurring report.
 */
export async function post_scheduled(request) {
  const { type, frequency, format, emails, createdBy } = request.body || {}

  if (!type || !frequency || !emails || !createdBy) {
    return badRequest(
      'Missing required fields: type, frequency, emails, createdBy',
    )
  }
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    return badRequest('frequency must be daily, weekly, or monthly')
  }
  if (!Array.isArray(emails) || emails.length === 0) {
    return badRequest('emails must be a non-empty array')
  }

  try {
    const report = await createScheduledReport({
      type,
      frequency,
      format: format || 'csv',
      emails: JSON.stringify(emails),
      createdBy,
    })
    return {
      headers: { 'Content-Type': 'application/json' },
      body: { report },
      statusCode: 201,
    }
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * DELETE /api/cmcc/reports/scheduled/:id
 * Delete a scheduled report.
 */
export async function delete_scheduled(request) {
  const id = request.path[0]
  try {
    await deleteScheduledReport(id)
    return ok({ success: true })
  } catch (err) {
    return fail(err.message)
  }
}

function ok(body) {
  return { headers: { 'Content-Type': 'application/json' }, body }
}

function badRequest(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 400,
  }
}

function fail(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 500,
  }
}
