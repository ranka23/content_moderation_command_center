/**
 * Mock for @cmcc/server-core
 * Used in both frontend (jsdom) and server (node) tests.
 * Server tests get a more functional mock; this provides the interface.
 */

// ── FirewallService ────────────────────────────────────────────────────────
class FirewallService {
  constructor(config, storage) {
    this.config = config || {}
    this.storage = storage || null
    this.evaluateCount = 0
    this.lastEvaluation = null
  }

  async evaluateContent(context) {
    this.evaluateCount++
    this.lastEvaluation = context
    return {
      triggered: false,
      action: 'approve',
      reason: 'Mock: no rules triggered',
      evaluatedAt: new Date().toISOString(),
      breakdown: {},
    }
  }

  getStats() {
    return { mock: true }
  }

  resetStats() {}

  updateConfig(config) {
    Object.assign(this.config, config)
  }

  getConfig() {
    return { ...this.config }
  }

  // Test helper
  __setNextResult(result) {
    this._nextResult = result
  }

  async evaluateContent(context) {
    this.evaluateCount++
    this.lastEvaluation = context
    if (this._nextResult) {
      const r = this._nextResult
      delete this._nextResult
      return r
    }
    return {
      triggered: false,
      action: 'approve',
      reason: 'Mock: no rules triggered',
      evaluatedAt: new Date().toISOString(),
      breakdown: {},
    }
  }
}

function getDefaultFirewallConfig() {
  return {
    maxLinks: 5,
    blacklistedKeywords: [],
    blacklistedIPs: [],
    blacklistedEmailDomains: [],
    blockedCountries: [],
    minSubmitTime: 3,
    enableDuplicateDetection: true,
    duplicateLookbackDays: 7,
    duplicateThreshold: 3,
    globalAction: 'flag',
    ruleActions: {},
  }
}

// ── EmailService ──────────────────────────────────────────────────────────
class EmailService {
  constructor(config, defaults) {
    this.config = config
    this.defaults = defaults || []
    this.sent = []
  }

  async sendNotification(type, data, to) {
    const result = {
      success: true,
      messageId: `mock-${Date.now()}`,
    }
    this.sent.push({ type, data, to, result })
    return result
  }

  async sendDigest(to, data) {
    return this.sendNotification('digest', data, to)
  }
}

// ── WebhookService ────────────────────────────────────────────────────────
class WebhookService {
  constructor(defaultTimeout) {
    this.defaultTimeout = defaultTimeout || 10000
    this.dispatched = []
  }

  async dispatch(url, payload, headers, _timeout) {
    const result = { success: true, url, statusCode: 200 }
    this.dispatched.push({ url, payload, headers, result })
    return result
  }

  async dispatchMulti(targets) {
    return Promise.all(
      targets.map((t) => this.dispatch(t.url, t.payload, t.headers)),
    )
  }

  static buildPayload(eventType, data) {
    return {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0',
    }
  }
}

// ── RetentionService ──────────────────────────────────────────────────────
class RetentionService {
  constructor(config) {
    this.config = config || {}
    this.purgeLogsCount = 0
    this.purgeArchivesCount = 0
  }

  async purgeOldActivityLogs(deleteFn) {
    const result = await deleteFn(new Date())
    this.purgeLogsCount++
    return {
      success: true,
      deletedCount: typeof result === 'number' ? result : 5,
    }
  }

  async purgeOldArchivedItems(deleteFn) {
    const result = await deleteFn(new Date())
    this.purgeArchivesCount++
    return {
      success: true,
      deletedCount: typeof result === 'number' ? result : 3,
    }
  }

  async runScheduledPurge(deleteLogsFn, deleteArchivesFn) {
    const [activityLogPurged, archivePurged] = await Promise.all([
      this.purgeOldActivityLogs(deleteLogsFn),
      this.purgeOldArchivedItems(deleteArchivesFn),
    ])
    return {
      activityLogPurged,
      archivePurged,
      timestamp: new Date().toISOString(),
    }
  }

  updateConfig(config) {
    Object.assign(this.config, config)
  }

  getConfig() {
    return { ...this.config }
  }
}

function getDefaultRetentionConfig() {
  return {
    activityLogRetentionDays: 90,
    archivedItemRetentionDays: 365,
    autoPurgeSchedule: 'weekly',
    exportBeforePurge: false,
  }
}

// ── UndoService ────────────────────────────────────────────────────────────
class UndoService {
  constructor(config) {
    this.config = { windowMinutes: 5, ...config }
    this.snapshots = new Map()
  }

  async saveSnapshot(itemId, state) {
    const snapshot = {
      id: `snap-${Date.now()}`,
      itemId,
      state: { ...state },
      timestamp: new Date().toISOString(),
    }
    this.snapshots.set(itemId, snapshot)
    return snapshot
  }

  async undo(itemId, applyUndoFn) {
    const snapshot = this.snapshots.get(itemId)
    if (!snapshot) {
      return { success: false, error: 'No snapshot found' }
    }
    const result = await applyUndoFn(snapshot.state)
    if (result.success) {
      this.snapshots.delete(itemId)
      return { success: true, restoredState: snapshot.state }
    }
    return { success: false, error: 'Failed to apply undo' }
  }

  async getUndoInfo(itemId) {
    const snapshot = this.snapshots.get(itemId)
    if (!snapshot) return null
    return {
      available: true,
      remainingSeconds: 240,
      currentStatus: snapshot.state.status || 'unknown',
    }
  }

  cleanExpiredSnapshots() {}
}

// ── ScheduledReportService ─────────────────────────────────────────────────
class ScheduledReportService {
  constructor() {
    this.schedules = []
  }

  async schedule(input) {
    const report = {
      id: `report-${Date.now()}`,
      type: input.type,
      frequency: input.frequency,
      format: input.format || 'csv',
      emails: input.emails,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      active: true,
    }
    this.schedules.push(report)
    return report
  }

  async getAll() {
    return [...this.schedules]
  }

  async getById(id) {
    return this.schedules.find((s) => s.id === id)
  }

  async delete(id) {
    const idx = this.schedules.findIndex((s) => s.id === id)
    if (idx === -1) return { success: false }
    this.schedules.splice(idx, 1)
    return { success: true }
  }

  async toggleActive(id, active) {
    const report = this.schedules.find((s) => s.id === id)
    if (!report) return { success: false }
    report.active = active
    return { success: true }
  }

  async getDueReports() {
    return this.schedules.filter((s) => s.active)
  }

  async markSent(id) {
    const report = this.schedules.find((s) => s.id === id)
    if (report) report.lastSentAt = new Date().toISOString()
  }

  async toJSON() {
    return { schedules: [...this.schedules] }
  }
}

// ── SyncReceiver ─────────────────────────────────────────────────────────
class SyncReceiver {
  constructor(platformName) {
    this.platformName = platformName || 'Shopify'
    this.firewallCallbacks = []
    this.settingsCallbacks = []
  }

  onFirewallSync(callback) {
    this.firewallCallbacks.push(callback)
  }

  onSettingsSync(callback) {
    this.settingsCallbacks.push(callback)
  }

  async receiveSync(payload) {
    if (!payload.firewall_rules || !payload.auto_moderation) {
      return {
        success: false,
        platform: this.platformName,
        timestamp: new Date().toISOString(),
        error: 'Validation failed',
      }
    }
    await Promise.all([
      ...this.firewallCallbacks.map((cb) => cb(payload.firewall_rules)),
      ...this.settingsCallbacks.map((cb) => cb(payload.auto_moderation)),
    ])
    return {
      success: true,
      platform: this.platformName,
      timestamp: new Date().toISOString(),
      rulesVersion: 'mock-version',
    }
  }

  getLastSyncPayload() {
    return null
  }
}

// ── WebSocketEventBus ─────────────────────────────────────────────────────
class WebSocketEventBus {
  constructor() {
    this.handlers = new Set()
    this.eventHistory = []
  }

  subscribe(handler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  publish(event) {
    const enriched = {
      ...event,
      id: event.id || `evt_${this.eventHistory.length + 1}`,
      timestamp: event.timestamp || new Date().toISOString(),
    }
    this.eventHistory.unshift(enriched)
    for (const handler of this.handlers) {
      try {
        handler(enriched)
      } catch {
        /* ignore */
      }
    }
  }

  publishAction(actorId, actorName, description, itemId, itemTitle) {
    this.publish({
      type: 'action',
      actorId,
      actorName,
      description,
      itemId,
      itemTitle,
      timestamp: new Date().toISOString(),
    })
  }

  publishNote(actorId, actorName, description, itemId) {
    this.publish({
      type: 'note',
      actorId,
      actorName,
      description,
      itemId,
      timestamp: new Date().toISOString(),
    })
  }

  publishAssignment(actorId, actorName, description, itemId) {
    this.publish({
      type: 'assignment',
      actorId,
      actorName,
      description,
      itemId,
      timestamp: new Date().toISOString(),
    })
  }

  publishEscalation(actorId, actorName, description, itemId) {
    this.publish({
      type: 'escalation',
      actorId,
      actorName,
      description,
      itemId,
      timestamp: new Date().toISOString(),
    })
  }

  getRecentEvents(limit) {
    return this.eventHistory.slice(0, limit || 50)
  }

  subscriberCount() {
    return this.handlers.size
  }
}

// ── ContentHookService ────────────────────────────────────────────────────
class ContentHookService {
  constructor(addToQueueFn) {
    this.addToQueue = addToQueueFn
    this.hooks = []
  }

  registerHook(hook) {
    this.hooks.push(hook)
  }

  getHooks() {
    return [...this.hooks]
  }

  enableHook(name) {
    const hook = this.hooks.find((h) => h.name === name)
    if (hook) hook.enabled = true
  }

  disableHook(name) {
    const hook = this.hooks.find((h) => h.name === name)
    if (hook) hook.enabled = false
  }

  async processContent(contentType, data) {
    const hook = this.hooks.find(
      (h) =>
        h.contentType.toLowerCase() === contentType.toLowerCase() && h.enabled,
    )
    if (!hook) return
    await this.addToQueue(
      contentType,
      data.itemId,
      data.authorName,
      data.authorEmail || '',
      data.authorIP || '',
      data.content,
      data.title || '',
    )
  }

  clearHooks() {
    this.hooks = []
  }
}

module.exports = {
  FirewallService,
  getDefaultFirewallConfig,
  EmailService,
  WebhookService,
  RetentionService,
  getDefaultRetentionConfig,
  UndoService,
  ScheduledReportService,
  SyncReceiver,
  WebSocketEventBus,
  ContentHookService,
}
