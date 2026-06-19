'use strict'

const {
  PLUGIN_ID,
  processAnalytics,
  getEmptyAnalytics,
  generateContentTypeBreakdown,
  generateModeratorPerformance,
  generateUserReputationSummary,
} = require('./cmcc-service-store')

/**
 * Activity log, analytics, content type breakdown, moderator performance, and user reputation.
 */
module.exports = ({ strapi, reputationService }) => {
  /**
   * Get paginated activity log
   */
  async function getActivityLog(params) {
    const p = params || {}
    const { page = 1, pageSize = 20, moderatorId, action, contentType } = p
    const filters = {}
    if (moderatorId) filters.moderatorId = { $eq: moderatorId }
    if (action) filters.action = { $eq: action }
    if (contentType) filters.contentType = { $eq: contentType }
    return strapi.entityService.findPage(`plugin::${PLUGIN_ID}.activity-log`, {
      page: Number(page),
      pageSize: Number(pageSize),
      filters,
      sort: { createdAt: 'desc' },
      populate: '*',
    })
  }

  /**
   * Get analytics data
   */
  async function getAnalytics() {
    const allLogs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
    )

    if (processAnalytics && getEmptyAnalytics) {
      const queueItems = await strapi.entityService.findMany(
        `plugin::${PLUGIN_ID}.queue-item`,
        { limit: 1000 },
      )
      const mappedItems = (queueItems || []).map((i) => ({
        id: String(i.id),
        contentType: i.contentType,
        status: i.status,
        spamScore: i.spamScore || 0,
        authorId: i.authorId || '',
        itemId: i.itemId,
        title: i.title,
        excerpt: i.excerpt,
        createdAt: i.createdAt,
      }))
      const mappedLogs = (allLogs || []).map((l) => ({
        id: l.id,
        timestamp: l.createdAt,
        action: l.action,
        contentType: l.contentType,
        itemId: l.itemId,
        userId: l.moderatorId || 'unknown',
        moderatorId: l.moderatorId,
      }))
      return processAnalytics(mappedItems, mappedLogs, {})
    }

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
    const topContentTypes = await getContentTypeBreakdown()
    const moderatorPerformance = buildModeratorPerformance(allLogs || [])

    return {
      totalItems,
      statusCounts,
      recentActivity: recentActivity.results,
      topContentTypes,
      moderatorPerformance,
    }
  }

  /**
   * Get content type breakdown
   */
  async function getContentTypeBreakdown() {
    const allItems = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.queue-item`,
      { fields: ['contentType'] },
    )
    if (!generateContentTypeBreakdown) {
      const breakdown = {}
      for (const item of allItems) {
        const ct = item.contentType
        breakdown[ct] = (breakdown[ct] || 0) + 1
      }
      return Object.entries(breakdown)
        .map(([contentType, count]) => ({ contentType, count }))
        .sort((a, b) => b.count - a.count)
    }
    const mappedItems = (allItems || []).map((i) => ({
      id: String(i.id),
      contentType: i.contentType,
      originalId: '',
      status: 'pending',
      spamScore: 0,
      authorId: '',
      dateGmt: '',
      title: '',
      excerpt: '',
    }))
    return generateContentTypeBreakdown(mappedItems)
  }

  /**
   * Build moderator performance from activity log entries
   */
  function buildModeratorPerformance(logs) {
    if (!generateModeratorPerformance) {
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
    }
    const events = (logs || []).map((l) => ({
      id: l.id,
      timestamp: l.createdAt,
      contentType: l.contentType,
      action: l.action,
      itemId: l.itemId,
      userId: l.moderatorId || 'unknown',
      moderatorId: l.moderatorId,
    }))
    const modNames = {}
    for (const l of logs || []) {
      if (l.moderatorId) modNames[l.moderatorId] = `Moderator #${l.moderatorId}`
    }
    return generateModeratorPerformance(events, modNames)
  }

  /**
   * Update analytics counters after moderation (legacy stub)
   */
  async function updateAnalytics() {
    // Kept for backward compatibility
  }

  /**
   * Get user reputation scores from moderation history
   */
  async function getUserReputation() {
    const logs = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
    )

    if (reputationService && generateUserReputationSummary) {
      const userIds = [
        ...new Set((logs || []).map((l) => l.itemId).filter(Boolean)),
      ]
      const summaries = []
      for (const userId of userIds) {
        try {
          const summary = await reputationService.getUserSummary(userId)
          const coreSummary = generateUserReputationSummary(summary)
          const riskLevel = (coreSummary.riskLevel || 'medium').toLowerCase()
          const trustLevelMap = {
            low: 'trusted',
            medium: 'neutral',
            high: 'low',
            critical: 'low',
          }
          summaries.push({
            userId,
            userName: `User #${userId}`,
            totalItems: coreSummary.totalItems || 0,
            spamCount: coreSummary.spamCount || 0,
            approvedCount: coreSummary.approvedCount || 0,
            rejectedCount: coreSummary.rejectedCount || 0,
            trustLevel: trustLevelMap[riskLevel] || 'neutral',
            lastActive: coreSummary.lastActive || null,
            spamRatio: coreSummary.spamRatio || 0,
          })
        } catch {
          /* skip users where reputation lookup fails */
        }
      }
      return summaries.sort((a, b) => b.totalItems - a.totalItems)
    }

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
      )
        entry.lastActive = log.createdAt
    }

    for (const entry of Object.values(userMap)) {
      entry.spamRatio =
        entry.totalItems > 0 ? entry.spamCount / entry.totalItems : 0
      if (entry.totalItems < 5) entry.trustLevel = 'new'
      else if (entry.spamRatio > 0.5) entry.trustLevel = 'low'
      else if (entry.spamRatio > 0.2) entry.trustLevel = 'neutral'
      else entry.trustLevel = 'trusted'
    }
    return Object.values(userMap).sort((a, b) => b.totalItems - a.totalItems)
  }

  /**
   * Get detailed reputation for a specific user
   */
  async function getUserReputationDetail(userId) {
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

    let reputationScore = null
    let riskLevel = 'medium'
    if (reputationService && generateUserReputationSummary) {
      try {
        const summary = await reputationService.getUserSummary(userId)
        const coreSummary = generateUserReputationSummary(summary)
        reputationScore = coreSummary
        riskLevel = (coreSummary.riskLevel || 'medium').toLowerCase()
      } catch {
        /* reputation lookup failed */
      }
    }
    const trustLevelMap = {
      low: 'trusted',
      medium: 'neutral',
      high: 'low',
      critical: 'low',
    }
    return {
      userId,
      userName: `User #${userId}`,
      history,
      totalActions: history.length,
      reputationScore,
      riskLevel,
      trustLevel: trustLevelMap[riskLevel] || 'neutral',
    }
  }

  return {
    getActivityLog,
    getAnalytics,
    getContentTypeBreakdown,
    buildModeratorPerformance,
    updateAnalytics,
    getUserReputation,
    getUserReputationDetail,
  }
}
