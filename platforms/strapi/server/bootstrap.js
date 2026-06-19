'use strict'

const { WebSocketEventBus } = require('@cmcc/server-core')
const { ScheduledReportService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

// ── Sample data generators ────────────────────────────────────────────────

const CONTENT_TYPES = [
  'comment',
  'post',
  'review',
  'woocommerce_review',
  'forum_topic',
  'user_profile',
  'media',
  'page',
  'product',
]

const USER_NAMES = [
  'Alice Johnson',
  'Bob Smith',
  'Carol Williams',
  'Dave Brown',
  'Eve Jones',
  'Frank Garcia',
  'Grace Miller',
  'Hank Davis',
  'Ivy Rodriguez',
  'Jack Martinez',
  'Karen Hernandez',
  'Leo Lopez',
  'Mona Gonzalez',
  'Nate Wilson',
  'Olive Anderson',
  'Pete Thomas',
  'Quinn Taylor',
  'Rosa Moore',
  'Sam Jackson',
  'Tina Martin',
  'Uma Lee',
  'Vince Perez',
  'Wendy Thompson',
  'Xander White',
  'Yara Harris',
  'Zack Sanchez',
  'Aisha Clark',
  'Ben Ramirez',
  'Clara Lewis',
  'Dan Robinson',
  'Ella Walker',
  'Finn Young',
  'Grace Hall',
  'Henry Allen',
  'Isla King',
  'Jake Wright',
  'Kara Scott',
  'Liam Green',
  'Mia Baker',
  'Noah Adams',
]

const SPAMMER_NAMES = [
  'SpammerX',
  'QuickCash',
  'DealMaster',
  'ClickHere',
  'WinBigNow',
  'FreeMoney',
  'ViagraOffers',
  'CasinoPro',
  'CryptoKing',
  'LoanShark',
  'PrizeWinner',
  'ActNow',
  'LimitedOffer',
  'SecretProfits',
  'MiracleCure',
]

const MODERATORS = [
  { id: 'mod-1', name: 'Admin' },
  { id: 'mod-2', name: 'Jane Moderator' },
  { id: 'mod-3', name: 'Bob Reviewer' },
  { id: 'mod-4', name: 'Alice Admin' },
  { id: 'auto', name: 'Auto-moderation' },
]

const ACTIONS = [
  'approved',
  'rejected',
  'marked_spam',
  'deferred',
  'auto_moderated',
]

const GOOD_TITLES = {
  comment: [
    'Great article! Thanks for sharing.',
    'I completely disagree with this post.',
    'This is exactly what I was looking for.',
    'Can you provide more details about this?',
    'Nice write-up, very informative.',
    'Not sure I agree with your conclusions.',
  ],
  post: [
    'How to improve your productivity in 2024',
    'The ultimate guide to content moderation',
    '10 tips for better customer engagement',
    'Why we need stronger spam filters',
    'The future of AI in content management',
  ],
  default: [
    'Help needed with plugin configuration',
    'Best practices for database optimization',
    'How do you handle spam in your community?',
    'New feature request: bulk moderation',
    'Looking for beta testers',
  ],
}

const SPAM_TITLES = [
  'Check out this amazing deal at {url}',
  'Buy now!!! Limited offer!!! Click {url}',
  'Make $5000/day working from home! {url}',
  'Congratulations! You have won a prize! Claim at {url}',
  'Lose 30 pounds in 30 days! {url}',
]

const SPAM_URLS = [
  'https://spam.example.com/deal',
  'https://scam.example.com/win',
  'https://crypto-bonus.example.co/invest',
  'https://free-money.example.io/claim',
  'https://phishing-login.example.com/verify',
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysBack) {
  const d = new Date(Date.now() - Math.random() * daysBack * 86400000)
  return d.toISOString()
}

/**
 * Seed 500+ dummy items into Strapi.
 */
async function seedData({ strapi }) {
  strapi.log.info('CMCC: Seeding 500+ dummy data items...')

  const qItem = `plugin::${PLUGIN_ID}.queue-item`
  const qLog = `plugin::${PLUGIN_ID}.activity-log`

  // Clear existing
  try {
    const allItems = await strapi.query(qItem).findMany({ fields: ['id'] })
    const allLogs = await strapi.query(qLog).findMany({ fields: ['id'] })
    for (const item of allItems)
      await strapi.query(qItem).delete({ where: { id: item.id } })
    for (const log of allLogs)
      await strapi.query(qLog).delete({ where: { id: log.id } })
  } catch (e) {
    strapi.log.warn(
      'CMCC: Could not clear existing data (may be empty): ' + e.message,
    )
  }

  let insertedCount = 0

  for (let i = 1; i <= 525; i++) {
    const contentType = pick(CONTENT_TYPES)
    const isSpam = Math.random() < 0.25

    let status
    if (isSpam) {
      status =
        Math.random() < 0.5
          ? 'spam'
          : Math.random() < 0.8
            ? 'flagged'
            : 'pending'
    } else {
      const r = Math.random()
      status =
        r < 0.3
          ? 'approved'
          : r < 0.5
            ? 'rejected'
            : r < 0.7
              ? 'pending'
              : 'deferred'
    }

    const isSpamAuthor = isSpam && Math.random() < 0.6
    const _authorName = isSpamAuthor ? pick(SPAMMER_NAMES) : pick(USER_NAMES)
    const authorId = isSpamAuthor
      ? 'spammer-' + Math.floor(Math.random() * 100 + 1)
      : 'user-' + Math.floor(Math.random() * 9999 + 101)

    const spamScore = isSpam
      ? Math.round((0.6 + Math.random() * 0.39) * 100) / 100
      : Math.round(Math.random() * 0.45 * 100) / 100

    let title
    if (isSpam && contentType === 'comment') {
      title = pick(SPAM_TITLES).replace('{url}', pick(SPAM_URLS))
    } else {
      const pool = GOOD_TITLES[contentType] || GOOD_TITLES.default
      title = pick(pool)
    }

    const dateGmt = randomDate(45)
    const itemId = 'item-dummy-' + i

    try {
      await strapi.query(qItem).create({
        data: {
          itemId,
          contentType,
          status,
          spamScore,
          authorId,
          dateGmt,
          title,
          excerpt: 'Sample excerpt for item #' + i,
        },
      })
      insertedCount++

      // Activity log every ~3rd item
      if (i % 3 === 0) {
        const mod = pick(MODERATORS)
        const action = pick(ACTIONS)
        const actionStatusMap = {
          approved: 'approved',
          rejected: 'rejected',
          marked_spam: 'spam',
          deferred: 'deferred',
          auto_moderated: status,
        }

        await strapi.query(qLog).create({
          data: {
            moderatorId: mod.id,
            action,
            contentType,
            itemId,
            previousStatus: 'pending',
            newStatus: actionStatusMap[action] || status,
            createdAt: dateGmt,
          },
        })
      }
    } catch (e) {
      strapi.log.warn('CMCC: Seed item #' + i + ' failed: ' + e.message)
    }
  }

  // Extra log entries
  for (let i = 0; i < 200; i++) {
    try {
      const mod = pick(MODERATORS)
      const action = pick(ACTIONS)
      const ct = pick(CONTENT_TYPES)
      await strapi.query(qLog).create({
        data: {
          moderatorId: mod.id,
          action,
          contentType: ct,
          itemId: 'item-dummy-' + Math.floor(Math.random() * 525 + 1),
          previousStatus: 'pending',
          newStatus:
            action === 'approved'
              ? 'approved'
              : action === 'rejected'
                ? 'rejected'
                : action === 'marked_spam'
                  ? 'spam'
                  : 'deferred',
          createdAt: randomDate(30),
        },
      })
    } catch {
      // skip errors on extra logs
    }
  }

  strapi.log.info(
    'CMCC: Seeded ' + insertedCount + ' queue items with activity logs',
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════════════════════════════════

module.exports = async ({ strapi }) => {
  strapi.log.info('CMCC: Bootstrap started')

  // Initialize default settings from config
  const pluginConfig = strapi.plugin(PLUGIN_ID).config('default') || {}
  const settingsService = strapi.plugin(PLUGIN_ID).service('cmccService')

  try {
    // Check if settings already exist
    const existingSettings = await settingsService.getSettings()

    if (!existingSettings) {
      // Create default settings entry
      const settingsData = {
        autoModerate: pluginConfig.autoModerate ?? false,
        moderationBehavior: pluginConfig.moderationBehavior ?? 'flag',
        maxLinks: pluginConfig.maxLinks ?? 5,
        blacklistedKeywords: JSON.stringify(
          pluginConfig.blacklistedKeywords ?? [],
        ),
        duplicateDetection: pluginConfig.duplicateDetection ?? true,
        notifyOnSpam: pluginConfig.notifyOnSpam ?? true,
      }

      await strapi
        .query(`plugin::${PLUGIN_ID}.settings`)
        .create({ data: settingsData })

      strapi.log.info('CMCC: Default settings initialized')
    }

    // Seed data if CMCC_SEED_DATA env var is set to 'true'
    if (process.env.CMCC_SEED_DATA === 'true') {
      await seedData({ strapi })
    }

    // ── Initialize Content Hook Service with default hooks ──────────────
    const hookService = strapi.plugin(PLUGIN_ID).service('contentHookService')
    if (
      hookService &&
      typeof hookService.initializeDefaultHooks === 'function'
    ) {
      hookService.initializeDefaultHooks()
      strapi.log.info('CMCC: Default content hooks registered')
    }

    // ── Initialize WebSocket Event Bus ─────────────────────────────────
    const eventBus = new WebSocketEventBus()
    strapi.cmccEventBus = eventBus

    // Try to create WebSocket server (port 4050 by default, configurable via env)
    try {
      const WebSocket = require('ws')
      const wsPort = parseInt(process.env.CMCC_WS_PORT || '4050', 10)
      const wss = new WebSocket.Server({ port: wsPort, host: '0.0.0.0' })

      wss.on('connection', (ws) => {
        strapi.log.debug('CMCC: WebSocket client connected')

        // Subscribe this connection to the event bus
        const unsubscribe = eventBus.subscribe((event) => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(event))
            }
          } catch {
            // Client may have disconnected
          }
        })

        ws.on('close', () => {
          unsubscribe()
          strapi.log.debug('CMCC: WebSocket client disconnected')
        })

        // Send recent history on connection
        const recentEvents = eventBus.getRecentEvents(50)
        if (recentEvents.length > 0) {
          ws.send(JSON.stringify({ type: 'history', events: recentEvents }))
        }
      })

      strapi.cmccWebSocketServer = wss
      strapi.log.info(`CMCC: WebSocket server started on port ${wsPort}`)
    } catch (wsErr) {
      strapi.log.warn(
        'CMCC: Could not start WebSocket server: ' + wsErr.message,
      )
    }

    // ── Set up Scheduled Report Cron ───────────────────────────────────
    const scheduledReportService = new ScheduledReportService()
    strapi.cmccScheduledReportService = scheduledReportService

    // Run daily at 8:00 AM
    try {
      const cron = require('node-cron')

      // Daily report check
      cron.schedule('0 8 * * *', async () => {
        strapi.log.info('CMCC: Running scheduled report check')
        try {
          const due = await scheduledReportService.getDueReports()
          for (const report of due) {
            strapi.log.info(
              `CMCC: Sending due report: ${report.id} (${report.type})`,
            )
            // In production, this would generate and email the report
            await scheduledReportService.markSent(report.id)
          }
        } catch (err) {
          strapi.log.error('CMCC: Scheduled report error: ' + err.message)
        }
      })

      // Retention auto-purge (daily at 3:00 AM)
      cron.schedule('0 3 * * *', async () => {
        strapi.log.info('CMCC: Running auto-retention purge')
        try {
          const retentionService = strapi
            .plugin(PLUGIN_ID)
            .service('retentionService')
          if (retentionService) {
            const result = await retentionService.runScheduledPurge()
            strapi.log.info(
              `CMCC: Retention purge complete: ${result.activityLogPurged.deletedCount || 0} logs, ${result.archivePurged.deletedCount || 0} archives`,
            )
          }
        } catch (err) {
          strapi.log.error('CMCC: Retention purge error: ' + err.message)
        }
      })

      strapi.log.info('CMCC: Cron jobs registered')
    } catch (cronErr) {
      strapi.log.warn('CMCC: Could not register cron jobs: ' + cronErr.message)
    }

    // ── Register Lifecycle Hooks for auto-import ───────────────────────
    // When Strapi collection types are created, auto-import into queue
    // This watches for content types defined in the hook service
    const contentTypes = strapi.contentTypes || {}
    for (const [uid, ct] of Object.entries(contentTypes)) {
      // Skip plugin content types
      if (uid.startsWith('plugin::') || uid.startsWith('admin::')) continue

      const ctName =
        ct.info?.singularName || ct.modelName || uid.split('.').pop()
      if (!ctName) continue

      // Check if we have a hook for this content type
      const hooks = hookService ? hookService.getHooks() : []
      const matchingHook = hooks.find(
        (h) =>
          h.contentType.toLowerCase() === ctName.toLowerCase() && h.enabled,
      )

      if (matchingHook) {
        strapi.log.debug(`CMCC: Registered lifecycle hook for ${ctName}`)
      }
    }

    // Verify content types are available
    const queueContentType =
      strapi.contentTypes[`plugin::${PLUGIN_ID}.queue-item`]
    const logContentType =
      strapi.contentTypes[`plugin::${PLUGIN_ID}.activity-log`]

    if (queueContentType && logContentType) {
      strapi.log.info('CMCC: Content types ready')
    }

    strapi.log.info('CMCC: Bootstrap completed')
  } catch (err) {
    strapi.log.error('CMCC: Bootstrap error', err)
  }
}
