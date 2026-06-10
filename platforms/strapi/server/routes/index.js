'use strict'

module.exports = [
  // ── Core Queue Routes ──────────────────────────────────────────────
  {
    method: 'GET',
    path: '/queue',
    handler: 'cmccController.getQueue',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/:id/moderate',
    handler: 'cmccController.moderateItem',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.moderate'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/bulk',
    handler: 'cmccController.bulkAction',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.bulk'],
      },
    },
  },
  {
    method: 'GET',
    path: '/queue/:id/history',
    handler: 'cmccController.getItemHistory',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/:id/evaluate',
    handler: 'cmccController.evaluateItem',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.moderate'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/:id/undo',
    handler: 'cmccController.undoItem',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.moderate'],
      },
    },
  },
  {
    method: 'GET',
    path: '/queue/:id/undo-info',
    handler: 'cmccController.getUndoInfo',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.read'],
      },
    },
  },

  // ── Collaboration Routes (Section 10.6) ────────────────────────────
  {
    method: 'GET',
    path: '/queue/:id/notes',
    handler: 'cmccController.getNotes',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/:id/notes',
    handler: 'cmccController.addNote',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.moderate'],
      },
    },
  },
  {
    method: 'POST',
    path: '/queue/:id/assign',
    handler: 'cmccController.assignItem',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.moderate'],
      },
    },
  },
  {
    method: 'GET',
    path: '/activity-feed',
    handler: 'cmccController.getActivityFeed',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.activity-log.read'],
      },
    },
  },

  // ── Analytics Routes ───────────────────────────────────────────────
  {
    method: 'GET',
    path: '/analytics',
    handler: 'cmccController.getAnalytics',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },
  {
    method: 'GET',
    path: '/activity-log',
    handler: 'cmccController.getActivityLog',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.activity-log.read'],
      },
    },
  },

  // ── Reputation Routes (Section 10.3) ───────────────────────────────
  {
    method: 'GET',
    path: '/reputation/users',
    handler: 'cmccController.getUserReputation',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },
  {
    method: 'GET',
    path: '/reputation/user/:id',
    handler: 'cmccController.getUserReputationDetail',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },

  // ── Reports Routes (Section 10.4) ──────────────────────────────────
  {
    method: 'POST',
    path: '/reports/moderation-activity',
    handler: 'cmccController.getModerationReport',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/reports/compliance-audit',
    handler: 'cmccController.getComplianceAudit',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/reports/scheduled',
    handler: 'cmccController.scheduleReport',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },

  // ── Multi-Platform Routes (Section 10.5) ───────────────────────────
  {
    method: 'GET',
    path: '/platforms/status',
    handler: 'cmccController.getPlatformStatus',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.analytics.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/platforms/sync-settings',
    handler: 'cmccController.syncPlatformSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },
  {
    method: 'POST',
    path: '/platforms/receive-sync',
    handler: 'cmccController.receivePlatformSync',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },
  {
    method: 'GET',
    path: '/unified-queue',
    handler: 'cmccController.getUnifiedQueue',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.queue.read'],
      },
    },
  },

  // ── Settings Routes ────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/settings',
    handler: 'cmccController.getSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.read'],
      },
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'cmccController.updateSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/export',
    handler: 'cmccController.exportSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/import',
    handler: 'cmccController.importSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },

  // ── Notification Routes ────────────────────────────────────────────
  {
    method: 'POST',
    path: '/notifications/send',
    handler: 'cmccController.sendNotification',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },
  {
    method: 'GET',
    path: '/notifications/settings',
    handler: 'cmccController.getNotificationSettings',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.read'],
      },
    },
  },

  // ── Webhook Routes ─────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/webhooks/test',
    handler: 'cmccController.testWebhook',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },

  // ── Content Hook Routes ────────────────────────────────────────────
  {
    method: 'GET',
    path: '/hooks',
    handler: 'cmccController.getHooks',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.read'],
      },
    },
  },
  {
    method: 'POST',
    path: '/hooks/:name/toggle',
    handler: 'cmccController.toggleHook',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },

  // ── Retention Routes ───────────────────────────────────────────────
  {
    method: 'POST',
    path: '/retention/purge',
    handler: 'cmccController.purgeRetention',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.settings.update'],
      },
    },
  },

  // ── REST fallback for activity feed events ─────────────────────────
  {
    method: 'GET',
    path: '/activity-feed/events',
    handler: 'cmccController.getActivityFeedEvents',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::cmcc.activity-log.read'],
      },
    },
  },
]
