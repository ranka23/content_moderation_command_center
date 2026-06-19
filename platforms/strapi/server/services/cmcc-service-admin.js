'use strict'

const {
  PLUGIN_ID,
  createAiAdapter,
  getDefaultAiConfig,
} = require('./cmcc-service-store')

/**
 * Reports, compliance, schedules, platform status, settings, and AI evaluation.
 */
module.exports = ({ strapi, getQueue }) => {
  /**
   * Generate a moderation activity report within a date range
   */
  async function getModerationReport({
    startDate,
    endDate,
    format: _format = 'csv',
  }) {
    const filters = {}
    if (startDate) filters.createdAt = { $gte: startDate }
    if (endDate) filters.createdAt = { ...filters.createdAt, $lte: endDate }
    const logs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
      { filters, sort: { createdAt: 'desc' } },
    )
    const header =
      'Timestamp,Moderator,Action,Content Type,Item ID,Previous Status,New Status\n'
    const rows = (logs || []).map(
      (l) =>
        `${l.createdAt || ''},${l.moderatorId || ''},${l.action || ''},${l.contentType || ''},${l.itemId || ''},${l.previousStatus || ''},${l.newStatus || ''}`,
    )
    return {
      success: true,
      data: [header, ...rows],
      filename: `cmcc-moderation-${new Date().toISOString().slice(0, 10)}.csv`,
    }
  }

  /**
   * Generate a compliance audit report
   */
  async function getComplianceAudit({ startDate, endDate }) {
    const filters = {}
    if (startDate) filters.createdAt = { $gte: startDate }
    if (endDate) filters.createdAt = { ...filters.createdAt, $lte: endDate }
    const logs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
      { filters, sort: { createdAt: 'desc' } },
    )
    const auditData = (logs || []).map((l) => ({
      timestamp: l.createdAt,
      moderatorId: l.moderatorId,
      action: l.action,
      contentType: l.contentType,
      itemId: l.itemId,
      previousStatus: l.previousStatus,
      newStatus: l.newStatus,
    }))
    return {
      success: true,
      data: auditData,
      filename: `cmcc-compliance-${new Date().toISOString().slice(0, 10)}.json`,
    }
  }

  /**
   * Schedule a recurring report
   */
  async function scheduleReport({
    type,
    frequency,
    format,
    emails,
    createdBy,
  }) {
    if (!strapi.cmccScheduledReports) strapi.cmccScheduledReports = []
    const schedule = {
      id: String(Date.now()),
      type,
      frequency,
      format,
      emails,
      createdBy,
      createdAt: new Date().toISOString(),
      active: true,
    }
    strapi.cmccScheduledReports.push(schedule)
    return { success: true, schedule }
  }

  /**
   * Get platform connection status
   */
  async function getPlatformStatus() {
    const platforms = [
      {
        id: 'strapi',
        name: 'Strapi',
        label: 'Strapi',
        icon: 'strapi',
        status: 'connected',
        connected: true,
        pendingCount: await strapi.entityService.count(
          `plugin::${PLUGIN_ID}.queue-item`,
          { filters: { status: { $eq: 'pending' } } },
        ),
        moderatedCount: await strapi.entityService.count(
          `plugin::${PLUGIN_ID}.queue-item`,
        ),
        spamCount: await strapi.entityService.count(
          `plugin::${PLUGIN_ID}.queue-item`,
          { filters: { status: { $eq: 'spam' } } },
        ),
      },
      {
        id: 'wordpress',
        name: 'WordPress',
        label: 'WordPress',
        icon: 'wordpress',
        status: 'available',
        connected: false,
        pendingCount: 0,
        moderatedCount: 0,
        spamCount: 0,
      },
      {
        id: 'shopify',
        name: 'Shopify',
        label: 'Shopify',
        icon: 'shopify',
        status: 'available',
        connected: false,
        pendingCount: 0,
        moderatedCount: 0,
        spamCount: 0,
      },
      {
        id: 'storyblok',
        name: 'Storyblok',
        label: 'Storyblok',
        icon: 'storyblok',
        status: 'available',
        connected: false,
        pendingCount: 0,
        moderatedCount: 0,
        spamCount: 0,
      },
      {
        id: 'wix',
        name: 'Wix',
        label: 'Wix',
        icon: 'wix',
        status: 'available',
        connected: false,
        pendingCount: 0,
        moderatedCount: 0,
        spamCount: 0,
      },
    ]
    return { platforms }
  }

  /**
   * Sync settings across platforms
   */
  async function syncSettings({ targetPlatforms, settings }) {
    strapi.log.debug(
      `CMCC: Syncing settings to platforms: ${(targetPlatforms || []).join(', ')}`,
    )
    return { success: true, syncedPlatforms: targetPlatforms || [], settings }
  }

  /**
   * Get unified queue across all platforms
   */
  async function getUnifiedQueue(params) {
    return getQueue(params || {})
  }

  /**
   * Get plugin settings
   */
  async function getSettings() {
    const entries = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.settings`,
    )
    if (!entries || entries.length === 0) return null
    const settings = entries[0]
    if (typeof settings.blacklistedKeywords === 'string') {
      try {
        settings.blacklistedKeywords = JSON.parse(settings.blacklistedKeywords)
      } catch {
        settings.blacklistedKeywords = []
      }
    }
    if (typeof settings.aiConfig === 'string') {
      try {
        settings.aiConfig = JSON.parse(settings.aiConfig)
      } catch {
        settings.aiConfig = { engine: 'none' }
      }
    }
    return settings
  }

  /**
   * Update plugin settings (create or update first record)
   */
  async function updateSettings(data) {
    const entries = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.settings`,
    )
    const settingsData = {
      autoModerate: data.autoModerate,
      moderationBehavior: data.moderationBehavior,
      maxLinks: data.maxLinks,
      blacklistedKeywords: Array.isArray(data.blacklistedKeywords)
        ? JSON.stringify(data.blacklistedKeywords)
        : data.blacklistedKeywords,
      duplicateDetection: data.duplicateDetection,
      notifyOnSpam: data.notifyOnSpam,
      aiConfig:
        data.aiConfig && typeof data.aiConfig === 'object'
          ? JSON.stringify(data.aiConfig)
          : data.aiConfig,
    }
    if (entries && entries.length > 0) {
      return strapi.entityService.update(
        `plugin::${PLUGIN_ID}.settings`,
        entries[0].id,
        { data: settingsData },
      )
    }
    return strapi.entityService.create(`plugin::${PLUGIN_ID}.settings`, {
      data: settingsData,
    })
  }

  /**
   * Export all settings as JSON
   */
  async function exportSettings() {
    const settings = await getSettings()
    return { data: settings, exportedAt: new Date().toISOString() }
  }

  /**
   * Import settings from JSON
   */
  async function importSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue
      await strapi.entityService.update(`plugin::${PLUGIN_ID}.settings`, 1, {
        data: { [key]: value },
      })
    }
    return { success: true }
  }

  /**
   * Evaluate a queue item against firewall rules and optionally run AI evaluation
   */
  async function evaluateItem(itemId) {
    const fw = strapi.plugin(PLUGIN_ID).service('firewallService')
    const firewallResult = await fw.evaluate(itemId)
    let aiResult = null
    if (typeof createAiAdapter === 'function') {
      try {
        const settings = await getSettings()
        const aiConfig =
          settings?.aiConfig ||
          (getDefaultAiConfig ? getDefaultAiConfig() : { engine: 'none' })
        if (
          aiConfig.engine &&
          aiConfig.engine !== 'none' &&
          aiConfig.apiKey &&
          aiConfig.model
        ) {
          const adapter = createAiAdapter(aiConfig.engine, aiConfig)
          if (adapter.isConfigured()) {
            const item = await strapi.entityService.findOne(
              `plugin::${PLUGIN_ID}.queue-item`,
              itemId,
              { populate: { content: true } },
            )
            if (item) {
              const contentToModerate = [item.title, item.excerpt]
                .filter(Boolean)
                .join(' ')
              if (contentToModerate) {
                aiResult = await adapter.moderateContent(contentToModerate)
                await strapi.entityService.update(
                  `plugin::${PLUGIN_ID}.queue-item`,
                  itemId,
                  { data: { aiEvaluation: JSON.stringify(aiResult) } },
                )
              }
            }
          }
        }
      } catch (err) {
        strapi.log.warn(
          `AI evaluation failed for item ${itemId}: ${err.message}`,
        )
      }
    }
    return { ...firewallResult, aiEvaluation: aiResult }
  }

  return {
    getModerationReport,
    getComplianceAudit,
    scheduleReport,
    getPlatformStatus,
    syncSettings,
    getUnifiedQueue,
    getSettings,
    updateSettings,
    exportSettings,
    importSettings,
    evaluateItem,
  }
}
