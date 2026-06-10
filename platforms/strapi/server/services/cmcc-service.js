'use strict'

const PLUGIN_ID = 'cmcc'

// Try to load AI adapter factory from @cmcc/core.
// If the package is not yet built/installed, AI evaluation is skipped gracefully.
let createAiAdapter
let getDefaultAiConfig
try {
  const cmccCore = require('@cmcc/core')
  createAiAdapter = cmccCore.createAiAdapter
  getDefaultAiConfig = cmccCore.getDefaultAiConfig
} catch {
  // @cmcc/core not available — AI moderation will be skipped gracefully
}

/** In-memory store for notes, assignments, and activity feed events */
const notesStore = {}
const assignmentStore = {}
const activityFeedEvents = []
let feedEventIdCounter = 1
let noteIdCounter = 1

module.exports = ({ strapi }) => ({
  // ── Core Queue Operations ────────────────────────────────────────────

  /**
   * Get paginated queue items with filters
   */
  async getQueue(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      status,
      contentType,
      search,
      sort = 'createdAt:DESC',
    } = params

    const filters = {}

    if (status) {
      filters.status = { $eq: status }
    }

    if (contentType) {
      filters.contentType = { $eq: contentType }
    }

    if (search) {
      filters.$or = [
        { title: { $containsi: search } },
        { excerpt: { $containsi: search } },
      ]
    }

    const [sortField, sortOrder] = sort.split(':')

    const results = await strapi.entityService.findPage(
      `plugin::${PLUGIN_ID}.queue-item`,
      {
        page: Number(page),
        pageSize: Number(pageSize),
        filters,
        sort: { [sortField]: sortOrder.toLowerCase() },
        populate: '*',
      },
    )

    return results
  },

  /**
   * Moderate a single item (approve, reject, mark as spam, defer)
   */
  async moderateItem(itemId, action, moderatorId) {
    const item = await strapi.entityService.findOne(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
    )

    if (!item) {
      throw new Error('Queue item not found')
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
      defer: 'deferred',
    }

    const actionMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
      defer: 'deferred',
    }

    const newStatus = statusMap[action]
    if (!newStatus) {
      throw new Error('Invalid action')
    }

    const updatedItem = await strapi.entityService.update(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
      { data: { status: newStatus } },
    )

    // Log the activity
    await this.logActivity({
      moderatorId,
      action: actionMap[action],
      contentType: item.contentType,
      itemId: item.itemId,
      previousStatus: item.status,
      newStatus,
    })

    // Update analytics counters
    await this.updateAnalytics(action)

    // Add activity feed event
    this.addFeedEvent({
      type: 'action',
      actorId: moderatorId,
      actorName: `Moderator #${moderatorId}`,
      description: `${actionMap[action]} item "${item.title || item.itemId}"`,
      itemId: item.itemId,
      itemTitle: item.title,
    })

    return updatedItem
  },

  /**
   * Perform a bulk action on multiple items
   */
  async bulkAction(itemIds, action, moderatorId) {
    const results = {
      succeeded: [],
      failed: [],
    }

    for (const id of itemIds) {
      try {
        const updated = await this.moderateItem(id, action, moderatorId)
        results.succeeded.push(updated)
      } catch (err) {
        results.failed.push({ id, error: err.message })
      }
    }

    return results
  },

  /**
   * Get history for a specific queue item
   */
  async getItemHistory(itemId) {
    const entries = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
      {
        filters: { itemId: { $eq: itemId } },
        sort: { createdAt: 'desc' },
        populate: '*',
      },
    )

    return entries || []
  },

  // ── Moderation Notes (Section 10.6) ─────────────────────────────────

  /**
   * Get notes for a queue item
   */
  async getNotes(itemId) {
    return notesStore[itemId] || []
  },

  /**
   * Add a note to a queue item
   */
  async addNote(itemId, { content, authorId, authorName, isInternal, type }) {
    if (!notesStore[itemId]) {
      notesStore[itemId] = []
    }

    const note = {
      id: String(noteIdCounter++),
      itemId,
      authorId,
      authorName,
      content,
      isInternal,
      type: type || 'general',
      createdAt: new Date().toISOString(),
    }

    notesStore[itemId].unshift(note)

    // Add activity feed event
    this.addFeedEvent({
      type: 'note',
      actorId: authorId,
      actorName: authorName,
      description: `Added a note on item #${itemId}`,
      itemId,
      itemTitle: '',
    })

    return note
  },

  // ── Assignment System (Section 10.1) ────────────────────────────────

  /**
   * Assign a queue item to a moderator or team
   */
  async assignItem(
    itemId,
    { assigneeId, teamId, assignedById, dueDate, priority },
  ) {
    assignmentStore[itemId] = {
      itemId,
      assigneeId,
      teamId,
      assignedById,
      assignedAt: new Date().toISOString(),
      dueDate,
      priority: priority || 'normal',
      status: 'pending',
    }

    // Add activity feed event
    this.addFeedEvent({
      type: 'assignment',
      actorId: assignedById,
      actorName: `Moderator #${assignedById}`,
      description: `Assigned item #${itemId} to ${assigneeId || teamId || 'unassigned'}`,
      itemId,
      itemTitle: '',
    })

    return assignmentStore[itemId]
  },

  // ── Activity Feed (Section 10.6) ────────────────────────────────────

  /**
   * Add an event to the activity feed
   */
  addFeedEvent({ type, actorId, actorName, description, itemId, itemTitle }) {
    activityFeedEvents.unshift({
      id: String(feedEventIdCounter++),
      type: type || 'action',
      actorId,
      actorName,
      description,
      itemId,
      itemTitle: itemTitle || '',
      timestamp: new Date().toISOString(),
    })

    // Keep feed at max 200 events
    if (activityFeedEvents.length > 200) {
      activityFeedEvents.length = 200
    }
  },

  /**
   * Get the most recent activity feed events
   */
  async getActivityFeed(limit = 20) {
    return activityFeedEvents.slice(0, limit)
  },

  // ── Activity Log ────────────────────────────────────────────────────

  /**
   * Log moderation activity
   */
  async logActivity(data) {
    return strapi.entityService.create(`plugin::${PLUGIN_ID}.activity-log`, {
      data,
    })
  },

  /**
   * Get paginated activity log
   */
  async getActivityLog(params = {}) {
    const { page = 1, pageSize = 20, moderatorId, action, contentType } = params

    const filters = {}

    if (moderatorId) {
      filters.moderatorId = { $eq: moderatorId }
    }

    if (action) {
      filters.action = { $eq: action }
    }

    if (contentType) {
      filters.contentType = { $eq: contentType }
    }

    return strapi.entityService.findPage(`plugin::${PLUGIN_ID}.activity-log`, {
      page: Number(page),
      pageSize: Number(pageSize),
      filters,
      sort: { createdAt: 'desc' },
      populate: '*',
    })
  },

  // ── Analytics ───────────────────────────────────────────────────────

  /**
   * Get analytics data
   */
  async getAnalytics() {
    const totalItems = await strapi.entityService.count(
      `plugin::${PLUGIN_ID}.queue-item`,
    )

    const statusCounts = await Promise.all(
      ['pending', 'approved', 'rejected', 'spam', 'deferred'].map(
        async (status) => {
          const count = await strapi.entityService.count(
            `plugin::${PLUGIN_ID}.queue-item`,
            { filters: { status: { $eq: status } } },
          )
          return { status, count }
        },
      ),
    )

    const recentActivity = await strapi.entityService.findPage(
      `plugin::${PLUGIN_ID}.activity-log`,
      {
        page: 1,
        pageSize: 50,
        sort: { createdAt: 'desc' },
      },
    )

    const topContentTypes = await this.getContentTypeBreakdown()

    // Build moderator performance from activity logs
    const allLogs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
    )
    const moderatorPerformance = this.buildModeratorPerformance(allLogs || [])

    return {
      totalItems,
      statusCounts,
      recentActivity: recentActivity.results,
      topContentTypes,
      moderatorPerformance,
    }
  },

  /**
   * Get content type breakdown
   */
  async getContentTypeBreakdown() {
    const allItems = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.queue-item`,
      { fields: ['contentType'] },
    )

    const breakdown = {}
    for (const item of allItems) {
      const ct = item.contentType
      breakdown[ct] = (breakdown[ct] || 0) + 1
    }

    return Object.entries(breakdown)
      .map(([contentType, count]) => ({ contentType, count }))
      .sort((a, b) => b.count - a.count)
  },

  /**
   * Build moderator performance from activity log entries
   */
  buildModeratorPerformance(logs) {
    const perfMap = {}

    for (const log of logs) {
      const modId = log.moderatorId
      if (!perfMap[modId]) {
        perfMap[modId] = {
          moderatorId: modId,
          moderatorName: `Moderator #${modId}`,
          actions: 0,
          approve: 0,
          reject: 0,
          spam: 0,
          defer: 0,
        }
      }

      perfMap[modId].actions++
      if (log.action === 'approved') perfMap[modId].approve++
      else if (log.action === 'rejected') perfMap[modId].reject++
      else if (log.action === 'spam') perfMap[modId].spam++
      else if (log.action === 'deferred') perfMap[modId].defer++
    }

    return Object.values(perfMap)
  },

  /**
   * Update analytics counters after moderation
   */
  async updateAnalytics(action) {
    strapi.log.debug(`CMCC: Analytics updated for action: ${action}`)
  },

  // ── User Reputation (Section 10.3) ───────────────────────────────────

  /**
   * Get user reputation scores from moderation history
   */
  async getUserReputation() {
    const logs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
    )

    const userMap = {}
    for (const log of logs || []) {
      const authorId = log.itemId || 'unknown'
      if (!userMap[authorId]) {
        userMap[authorId] = {
          userId: authorId,
          userName: `User #${authorId}`,
          totalItems: 0,
          spamCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          trustLevel: 'neutral',
          lastActive: null,
          spamRatio: 0,
        }
      }

      const entry = userMap[authorId]
      entry.totalItems++

      if (log.action === 'approved') entry.approvedCount++
      else if (log.action === 'rejected') entry.rejectedCount++
      else if (log.action === 'spam') entry.spamCount++

      if (
        log.createdAt &&
        (!entry.lastActive || log.createdAt > entry.lastActive)
      ) {
        entry.lastActive = log.createdAt
      }
    }

    // Calculate ratios and trust levels
    for (const entry of Object.values(userMap)) {
      entry.spamRatio =
        entry.totalItems > 0 ? entry.spamCount / entry.totalItems : 0

      // Determine trust level
      if (entry.totalItems < 5) {
        entry.trustLevel = 'new'
      } else if (entry.spamRatio > 0.5) {
        entry.trustLevel = 'low'
      } else if (entry.spamRatio > 0.2) {
        entry.trustLevel = 'neutral'
      } else {
        entry.trustLevel = 'trusted'
      }
    }

    return Object.values(userMap).sort((a, b) => b.totalItems - a.totalItems)
  },

  /**
   * Get detailed reputation for a specific user
   */
  async getUserReputationDetail(userId) {
    const logs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
      { filters: { itemId: { $eq: userId } } },
    )

    if (!logs || logs.length === 0) return null

    const history = logs.map((log) => ({
      id: log.id,
      action: log.action,
      contentType: log.contentType,
      timestamp: log.createdAt,
      moderatorId: log.moderatorId,
    }))

    return {
      userId,
      userName: `User #${userId}`,
      history,
      totalActions: history.length,
    }
  },

  // ── Reports & Compliance (Section 10.4) ──────────────────────────────

  /**
   * Generate a moderation activity report within a date range
   */
  async getModerationReport({ startDate, endDate, format: _format = 'csv' }) {
    const filters = {}
    if (startDate) {
      filters.createdAt = { $gte: startDate }
    }
    if (endDate) {
      filters.createdAt = { ...filters.createdAt, $lte: endDate }
    }

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
  },

  /**
   * Generate a compliance audit report
   */
  async getComplianceAudit({ startDate, endDate }) {
    const filters = {}
    if (startDate) {
      filters.createdAt = { $gte: startDate }
    }
    if (endDate) {
      filters.createdAt = { ...filters.createdAt, $lte: endDate }
    }

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
  },

  /**
   * Schedule a recurring report
   */
  async scheduleReport({ type, frequency, format, emails, createdBy }) {
    // Store scheduled report configuration (in-memory for now - extend to DB later)
    if (!strapi.cmccScheduledReports) {
      strapi.cmccScheduledReports = []
    }

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
  },

  /**
   * Get platform connection status (Section 10.5)
   */
  async getPlatformStatus() {
    // Check availability of known platforms
    const platforms = [
      {
        id: 'strapi',
        name: 'Strapi',
        label: 'Strapi',
        icon: '🟣',
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
        icon: '🔵',
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
        icon: '🟢',
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
        icon: '🔴',
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
        icon: '⚫',
        status: 'available',
        connected: false,
        pendingCount: 0,
        moderatedCount: 0,
        spamCount: 0,
      },
    ]

    return { platforms }
  },

  /**
   * Sync settings across platforms
   */
  async syncSettings({ targetPlatforms, settings }) {
    // In a production environment, this would push settings to each platform's API
    strapi.log.debug(
      `CMCC: Syncing settings to platforms: ${(targetPlatforms || []).join(', ')}`,
    )

    return {
      success: true,
      syncedPlatforms: targetPlatforms || [],
      settings,
    }
  },

  /**
   * Get unified queue across all platforms
   */
  async getUnifiedQueue(params = {}) {
    // Currently returns Strapi's local queue items
    // In production, this would aggregate from multiple platforms
    return this.getQueue(params)
  },

  /**
   * Get plugin settings
   */
  async getSettings() {
    const entries = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.settings`,
    )

    if (!entries || entries.length === 0) return null

    const settings = entries[0]

    // Parse JSON fields
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
  },

  /**
   * Update plugin settings (create or update first record)
   */
  async updateSettings(data) {
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
  },

  /**
   * Export all settings as JSON
   */
  async exportSettings() {
    const settings = await this.getSettings()
    return { data: settings, exportedAt: new Date().toISOString() }
  },

  /**
   * Import settings from JSON
   */
  async importSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue
      await strapi.entityService.update(`plugin::${PLUGIN_ID}.settings`, 1, {
        data: { [key]: value },
      })
    }
    return { success: true }
  },

  /**
   * Evaluate a queue item against firewall rules and optionally run AI evaluation.
   * Returns combined result: { ...firewallResult, aiEvaluation }
   * AI failures are caught and logged so they never break the firewall result.
   */
  async evaluateItem(itemId) {
    const fw = strapi.plugin(PLUGIN_ID).service('firewallService')
    const firewallResult = await fw.evaluate(itemId)

    // ── AI evaluation (optional, non-blocking) ─────────────────────────
    let aiResult = null
    if (typeof createAiAdapter === 'function') {
      try {
        const settings = await this.getSettings()
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

                // Persist the AI evaluation result on the queue item
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

    return {
      ...firewallResult,
      aiEvaluation: aiResult,
    }
  },

  /**
   * Undo the last moderation action on an item.
   */
  async undoItem(itemId) {
    const undoService = strapi.plugin(PLUGIN_ID).service('undoService')
    if (!undoService) {
      throw new Error('Undo service not available')
    }
    return undoService.undoItem(itemId)
  },

  /**
   * Get undo availability info for an item.
   */
  async getUndoInfo(itemId) {
    const undoService = strapi.plugin(PLUGIN_ID).service('undoService')
    if (!undoService) {
      return null
    }
    return undoService.getUndoInfo(itemId)
  },

  /**
   * Send a notification (delegates to notification service).
   */
  async sendNotification(type, data, recipients) {
    const ns = strapi.plugin(PLUGIN_ID).service('notificationService')
    return ns.sendNotification(type, data, recipients)
  },

  /**
   * Get notification settings.
   */
  async getNotificationSettings() {
    const ns = strapi.plugin(PLUGIN_ID).service('notificationService')
    return ns.getSettings()
  },

  /**
   * Test a webhook endpoint.
   */
  async testWebhook(url, headers) {
    const ws = strapi.plugin(PLUGIN_ID).service('webhookService')
    return ws.testEndpoint(url, headers)
  },

  /**
   * Get registered content hooks.
   */
  getHooks() {
    const hs = strapi.plugin(PLUGIN_ID).service('contentHookService')
    return hs.getHooks()
  },

  /**
   * Toggle a content hook.
   */
  toggleHook(name, enabled) {
    const hs = strapi.plugin(PLUGIN_ID).service('contentHookService')
    hs.toggleHook(name, enabled)
  },

  /**
   * Manually trigger retention purge.
   */
  async purgeRetention() {
    const rs = strapi.plugin(PLUGIN_ID).service('retentionService')
    if (!rs) {
      throw new Error('Retention service not available')
    }
    return rs.runScheduledPurge()
  },

  /**
   * Receive a cross-platform sync payload.
   */
  async receivePlatformSync(payload) {
    const sync = strapi.plugin(PLUGIN_ID).service('syncReceiver')
    if (!sync) {
      throw new Error('Sync receiver not available')
    }
    return sync.receiveSync(payload)
  },

  /**
   * Cleanup resources on plugin destroy
   */
  async cleanup() {
    Object.keys(notesStore).forEach((k) => delete notesStore[k])
    Object.keys(assignmentStore).forEach((k) => delete assignmentStore[k])
    activityFeedEvents.length = 0
    strapi.log.info('CMCC: In-memory stores cleaned up')
  },
})
