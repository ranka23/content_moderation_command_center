'use strict'

const { PLUGIN_ID, notesStore, assignmentStore, activityFeedEvents } = require('./cmcc-service-store')

/**
 * Utility operations: undo, notifications, webhooks, hooks, retention, sync, cleanup.
 */
module.exports = ({ strapi, reputationService }) => {
  /**
   * Undo the last moderation action on an item
   */
  async function undoItem(itemId) {
    const undoService = strapi.plugin(PLUGIN_ID).service('undoService')
    if (!undoService) throw new Error('Undo service not available')
    return undoService.undoItem(itemId)
  }

  /**
   * Get undo availability info for an item
   */
  async function getUndoInfo(itemId) {
    const undoService = strapi.plugin(PLUGIN_ID).service('undoService')
    if (!undoService) return null
    return undoService.getUndoInfo(itemId)
  }

  /**
   * Send a notification
   */
  async function sendNotification(type, data, recipients) {
    const ns = strapi.plugin(PLUGIN_ID).service('notificationService')
    return ns.sendNotification(type, data, recipients)
  }

  /**
   * Get notification settings
   */
  async function getNotificationSettings() {
    const ns = strapi.plugin(PLUGIN_ID).service('notificationService')
    return ns.getSettings()
  }

  /**
   * Test a webhook endpoint
   */
  async function testWebhook(url, headers) {
    const ws = strapi.plugin(PLUGIN_ID).service('webhookService')
    return ws.testEndpoint(url, headers)
  }

  /**
   * Get registered content hooks
   */
  function getHooks() {
    return strapi.plugin(PLUGIN_ID).service('contentHookService').getHooks()
  }

  /**
   * Toggle a content hook
   */
  function toggleHook(name, enabled) {
    strapi.plugin(PLUGIN_ID).service('contentHookService').toggleHook(name, enabled)
  }

  /**
   * Manually trigger retention purge
   */
  async function purgeRetention() {
    const rs = strapi.plugin(PLUGIN_ID).service('retentionService')
    if (!rs) throw new Error('Retention service not available')
    return rs.runScheduledPurge()
  }

  /**
   * Receive a cross-platform sync payload
   */
  async function receivePlatformSync(payload) {
    const sync = strapi.plugin(PLUGIN_ID).service('syncReceiver')
    if (!sync) throw new Error('Sync receiver not available')
    return sync.receiveSync(payload)
  }

  /**
   * Cleanup resources on plugin destroy
   */
  async function cleanup() {
    Object.keys(notesStore).forEach((k) => delete notesStore[k])
    Object.keys(assignmentStore).forEach((k) => delete assignmentStore[k])
    activityFeedEvents.length = 0
    if (reputationService && typeof reputationService.cleanup === 'function') {
      try { reputationService.cleanup() } catch { /* non-critical */ }
    }
    strapi.log.info('CMCC: In-memory stores cleaned up')
  }

  return { undoItem, getUndoInfo, sendNotification, getNotificationSettings, testWebhook, getHooks, toggleHook, purgeRetention, receivePlatformSync, cleanup }
}
