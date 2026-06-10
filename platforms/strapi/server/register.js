'use strict'

const PLUGIN_ID = 'cmcc'

module.exports = async ({ strapi }) => {
  // Register plugin permissions (Strapi v5 format)
  const permissions = [
    {
      uid: 'queue.read',
      displayName: 'Queue',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'queue.moderate',
      displayName: 'Moderate',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'queue.bulk',
      displayName: 'Bulk Moderation',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'analytics.read',
      displayName: 'Analytics',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'settings.read',
      displayName: 'Read Settings',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'settings.update',
      displayName: 'Update Settings',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'activity-log.read',
      displayName: 'Activity Log',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'notifications.send',
      displayName: 'Send Notifications',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'webhooks.manage',
      displayName: 'Manage Webhooks',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'hooks.manage',
      displayName: 'Manage Content Hooks',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'retention.manage',
      displayName: 'Manage Retention',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
    {
      uid: 'sync.receive',
      displayName: 'Receive Platform Sync',
      section: 'plugins',
      pluginName: PLUGIN_ID,
    },
  ]

  await strapi.admin.services.permission.actionProvider.registerMany(
    permissions,
  )

  // Register content types
  const contentTypes = strapi.plugin(PLUGIN_ID).contentTypes

  if (contentTypes['queue-item'] && contentTypes['activity-log']) {
    strapi.log.info('CMCC: Content types registered')
  }
}
