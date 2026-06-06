'use strict'

const PLUGIN_ID = 'cmcc'

module.exports = async ({ strapi }) => {
  // Register plugin permissions
  const permissions = [
    {
      action: 'plugin::cmcc.queue.read',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.queue.moderate',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.queue.bulk',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.analytics.read',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.settings.read',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.settings.update',
      subject: null,
      properties: {},
      conditions: [],
    },
    {
      action: 'plugin::cmcc.activity-log.read',
      subject: null,
      properties: {},
      conditions: [],
    },
  ]

  await strapi.admin.services.permission.actionProvider.registerMany(
    permissions.map((p) => ({
      ...p,
      section: 'plugins',
      pluginName: PLUGIN_ID,
      category: 'plugins',
    })),
  )

  // Register content types
  const contentTypes = strapi.plugin(PLUGIN_ID).contentTypes

  if (contentTypes['queue-item'] && contentTypes['activity-log']) {
    strapi.log.info('CMCC: Content types registered')
  }
}
