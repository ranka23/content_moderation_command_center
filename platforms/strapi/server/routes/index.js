'use strict'

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/queue',
      handler: 'cmccController.getQueue',
      config: {
        policies: [],
        auth: {
          scope: 'plugin::cmcc.queue.read',
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
          scope: 'plugin::cmcc.queue.moderate',
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
          scope: 'plugin::cmcc.queue.bulk',
        },
      },
    },
    {
      method: 'GET',
      path: '/analytics',
      handler: 'cmccController.getAnalytics',
      config: {
        policies: [],
        auth: {
          scope: 'plugin::cmcc.analytics.read',
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
          scope: 'plugin::cmcc.activity-log.read',
        },
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'cmccController.getSettings',
      config: {
        policies: [],
        auth: {
          scope: 'plugin::cmcc.settings.read',
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
          scope: 'plugin::cmcc.settings.update',
        },
      },
    },
  ],
}
