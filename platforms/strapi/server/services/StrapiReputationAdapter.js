'use strict'

const PLUGIN_ID = 'cmcc'

/**
 * Strapi-backed adapter for the core ReputationService.
 * Reads/writes reputation scores and breach records
 * via strapi.entityService.
 */
class StrapiReputationAdapter {
  constructor(strapi) {
    this.strapi = strapi
  }

  async getReputationScore(userId) {
    const entries = await this.strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.reputation-score`,
      { filters: { userId: { $eq: String(userId) } }, limit: 1 },
    )
    if (!entries || entries.length === 0) return null
    const e = entries[0]
    return {
      score: e.score,
      lastUpdated: e.lastUpdated,
      totalApproved: e.totalApproved,
      totalRejected: e.totalRejected,
      timesDeactivated: e.timesDeactivated,
    }
  }

  async saveReputationScore(userId, score) {
    const existing = await this.strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.reputation-score`,
      { filters: { userId: { $eq: String(userId) } }, limit: 1 },
    )
    const data = {
      userId: String(userId),
      score: score.score,
      lastUpdated: score.lastUpdated,
      totalApproved: score.totalApproved,
      totalRejected: score.totalRejected,
      timesDeactivated: score.timesDeactivated,
    }
    if (existing && existing.length > 0) {
      return this.strapi.entityService.update(
        `plugin::${PLUGIN_ID}.reputation-score`,
        existing[0].id,
        { data },
      )
    }
    return this.strapi.entityService.create(
      `plugin::${PLUGIN_ID}.reputation-score`,
      { data },
    )
  }

  async getUserBreaches(userId, limit = 100) {
    const entries = await this.strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.breach-record`,
      {
        filters: { userId: { $eq: String(userId) } },
        sort: { timestamp: 'desc' },
        limit,
      },
    )
    return (entries || []).map((e) => ({
      id: String(e.id),
      userId: e.userId,
      timestamp: e.timestamp,
      reason: e.reason,
      moderatorId: e.moderatorId,
      contentType: e.contentType,
      contentId: e.contentId,
    }))
  }

  async addBreachRecord(breach) {
    const created = await this.strapi.entityService.create(
      `plugin::${PLUGIN_ID}.breach-record`,
      { data: breach },
    )
    return String(created.id)
  }

  async clearOldBreachRecords(beforeDate) {
    const old = await this.strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.breach-record`,
      { filters: { timestamp: { $lt: beforeDate } } },
    )
    for (const record of old || []) {
      await this.strapi.entityService.delete(
        `plugin::${PLUGIN_ID}.breach-record`,
        record.id,
      )
    }
  }
}

module.exports = StrapiReputationAdapter
