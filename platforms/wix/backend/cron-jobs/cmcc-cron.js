/**
 * CMCC Cron Jobs — Wix Velo Scheduled Tasks
 *
 * Runs on a schedule via wix-cron.
 * Configure the schedule in the Wix Editor → Settings → Cron Jobs.
 *
 * Required cron jobs to configure:
 *   - Retention purge: daily at 2:00 AM
 *   - Queue monitoring: every 30 minutes
 *
 * @see https://dev.wix.com/docs/velo/api-reference/wix-cron/about-wix-cron
 */

import { getQueueItems, getActivityLogs } from '../cmcc/data'

/**
 * Retention Purge — Run daily at 2:00 AM
 *
 * Deletes old activity logs and archived items past their retention period.
 */
export async function retentionPurge() {
  console.log('[CMCC Cron] Running retention purge...')

  try {
    // Activity logs older than 90 days
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString()
    const logs = await getActivityLogs({ pageSize: 1000 })
    const oldLogs = logs.entries.filter((e) => e.createdAt < cutoff)

    let logsPurged = 0
    for (const log of oldLogs) {
      try {
        await wixData.remove('cmcc_activity_logs', log._id)
        logsPurged++
      } catch {
        // skip individual deletion errors
      }
    }

    // Archived/spam/rejected items older than 365 days
    const archiveCutoff = new Date(Date.now() - 365 * 86400000).toISOString()
    const queue = await getQueueItems({ pageSize: 1000 })
    const oldItems = queue.items.filter(
      (i) =>
        ['approved', 'rejected', 'spam'].includes(i.status) &&
        i.moderatedAt &&
        i.moderatedAt < archiveCutoff,
    )

    let itemsPurged = 0
    for (const item of oldItems) {
      try {
        await wixData.remove('cmcc_queue_items', item._id)
        itemsPurged++
      } catch {
        // skip individual deletion errors
      }
    }

    console.log(
      `[CMCC Cron] Purge complete: ${logsPurged} logs, ${itemsPurged} items removed`,
    )
  } catch (err) {
    console.error('[CMCC Cron] Retention purge failed:', err.message)
  }
}

/**
 * Queue Monitoring — Run every 30 minutes
 *
 * Checks for anomalies like volume spikes or high spam ratios.
 */
export async function queueMonitor() {
  console.log('[CMCC Cron] Running queue monitor...')

  try {
    const queue = await getQueueItems({ pageSize: 1 })
    const pending = await getQueueItems({ pageSize: 1, status: 'pending' })
    const spam = await getQueueItems({ pageSize: 1, status: 'spam' })

    const totalItems = queue.total
    const pendingCount = pending.total
    const spamCount = spam.total
    const spamRatio = totalItems > 0 ? (spamCount / totalItems) * 100 : 0

    if (spamRatio > 50) {
      console.warn(
        `[CMCC Cron] High spam ratio alert: ${spamRatio.toFixed(1)}% (${spamCount}/${totalItems})`,
      )
    }

    if (pendingCount > 100) {
      console.warn(
        `[CMCC Cron] Queue backlog alert: ${pendingCount} items pending moderation`,
      )
    }

    console.log(
      `[CMCC Cron] Queue status: ${totalItems} total, ${pendingCount} pending, ${spamCount} spam`,
    )
  } catch (err) {
    console.error('[CMCC Cron] Queue monitor failed:', err.message)
  }
}
