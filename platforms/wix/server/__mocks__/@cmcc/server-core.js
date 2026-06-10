/**
 * Mock for @cmcc/server-core
 * Provides lightweight in-memory implementations of all services
 * for use in server tests without needing to compile TypeScript.
 */

// ── WebSocketEventBus ────────────────────────────────────────────────────
class WebSocketEventBus {
  constructor() {
    this.handlers = new Set()
    this.eventHistory = []
    this.eventIdCounter = 0
    this.maxHistory = 200
  }

  subscribe(handler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  publish(event) {
    const enriched = {
      ...event,
      id: event.id || `evt_${++this.eventIdCounter}`,
      timestamp: event.timestamp || new Date().toISOString(),
    }
    this.eventHistory.unshift(enriched)
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.length = this.maxHistory
    }
    for (const handler of this.handlers) {
      try {
        handler(enriched)
      } catch {
        /* skip */
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

  getRecentEvents(limit = 50) {
    return this.eventHistory.slice(0, limit)
  }

  subscriberCount() {
    return this.handlers.size
  }
}

// ── FirewallService ──────────────────────────────────────────────────────
class FirewallService {
  constructor(config) {
    this.config = {
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
      ...config,
    }
  }

  async evaluateContent(context) {
    const content = context.content || ''
    const linkCount = (content.match(/https?:\/\//g) || []).length
    const triggered = linkCount > (this.config.maxLinks || 5)

    return {
      triggered,
      action: triggered ? this.config.globalAction : 'pass',
      reason: triggered
        ? `Too many links: ${linkCount}`
        : 'Content passed all rules',
      evaluatedAt: new Date().toISOString(),
    }
  }

  getStats() {
    return {}
  }
  resetStats() {}
  updateConfig(config) {
    this.config = { ...this.config, ...config }
  }
  getConfig() {
    return { ...this.config }
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

// ── EmailService ─────────────────────────────────────────────────────────
class EmailService {
  constructor(config, defaults) {
    this.config = config
    this.defaultRecipients = defaults || []
  }

  async sendNotification(_type, _data, _to) {
    return { success: true, messageId: `mock-${Date.now()}` }
  }

  async sendDigest(_to, _data) {
    return { success: true, messageId: `mock-digest-${Date.now()}` }
  }
}

// ── WebhookService ───────────────────────────────────────────────────────
class WebhookService {
  constructor(defaultTimeout = 10000) {
    this.defaultTimeout = defaultTimeout
  }

  async dispatch(url, _payload, _headers, _timeout) {
    return { success: true, url, statusCode: 200 }
  }

  async dispatchMulti(targets) {
    return targets.map((t) => ({ success: true, url: t.url, statusCode: 200 }))
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

// ── RetentionService ─────────────────────────────────────────────────────
function getDefaultRetentionConfig() {
  return {
    activityLogRetentionDays: 90,
    archivedItemRetentionDays: 365,
    autoPurgeSchedule: 'weekly',
    exportBeforePurge: false,
  }
}

class RetentionService {
  constructor(config) {
    this.config = { ...getDefaultRetentionConfig(), ...config }
  }

  async purgeOldActivityLogs(deleteFn) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(
        cutoffDate.getDate() - this.config.activityLogRetentionDays,
      )
      const deletedCount = await deleteFn(cutoffDate)
      return { success: true, deletedCount }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async purgeOldArchivedItems(deleteFn) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(
        cutoffDate.getDate() - this.config.archivedItemRetentionDays,
      )
      const deletedCount = await deleteFn(cutoffDate)
      return { success: true, deletedCount }
    } catch (err) {
      return { success: false, error: err.message }
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
    this.config = { ...this.config, ...config }
  }
  getConfig() {
    return { ...this.config }
  }
}

// ── UndoService ──────────────────────────────────────────────────────────
class UndoService {
  constructor(config) {
    this.config = { windowMinutes: 5, ...config }
    this.snapshots = new Map()
  }

  async saveSnapshot(itemId, state) {
    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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

    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = this.config.windowMinutes * 60 * 1000

    if (elapsed > windowMs) {
      this.snapshots.delete(itemId)
      return { success: false, error: 'Undo window expired' }
    }

    try {
      const result = await applyUndoFn(snapshot.state)
      if (result.success) {
        this.snapshots.delete(itemId)
        return { success: true, restoredState: snapshot.state }
      }
      return { success: false, error: 'Failed to apply undo state' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async getUndoInfo(itemId) {
    const snapshot = this.snapshots.get(itemId)
    if (!snapshot) return null

    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = this.config.windowMinutes * 60 * 1000
    const remaining = windowMs - elapsed

    return {
      available: remaining > 0,
      remainingSeconds: Math.max(0, Math.floor(remaining / 1000)),
      currentStatus: snapshot.state.status || 'unknown',
    }
  }

  cleanExpiredSnapshots() {
    const now = Date.now()
    const windowMs = this.config.windowMinutes * 60 * 1000
    for (const [itemId, snapshot] of this.snapshots.entries()) {
      if (now - new Date(snapshot.timestamp).getTime() > windowMs) {
        this.snapshots.delete(itemId)
      }
    }
  }
}

// ── ScheduledReportService ──────────────────────────────────────────────
class ScheduledReportService {
  constructor() {
    this.schedules = []
  }

  async schedule(input) {
    const report = {
      id: `report_${Date.now()}`,
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
    return this.schedules.filter((r) => r.active)
  }

  async markSent(id) {
    const report = this.schedules.find((s) => s.id === id)
    if (report) report.lastSentAt = new Date().toISOString()
  }
}

// ── SyncReceiver ─────────────────────────────────────────────────────────
class SyncReceiver {
  constructor(platformName) {
    this.platformName = platformName || 'Unknown'
    this.firewallCallbacks = []
    this.settingsCallbacks = []
    this.lastSyncPayload = undefined
  }

  onFirewallSync(callback) {
    this.firewallCallbacks.push(callback)
  }
  onSettingsSync(callback) {
    this.settingsCallbacks.push(callback)
  }

  async receiveSync(payload) {
    if (
      !payload.firewall_rules ||
      !payload.auto_moderation ||
      !payload.timestamp ||
      !payload.source
    ) {
      return {
        success: false,
        platform: this.platformName,
        timestamp: new Date().toISOString(),
        error: 'Validation failed: Missing required fields',
      }
    }
    this.lastSyncPayload = payload

    await Promise.all([
      ...this.firewallCallbacks.map((cb) => cb(payload.firewall_rules)),
      ...this.settingsCallbacks.map((cb) => cb(payload.auto_moderation)),
    ])

    return {
      success: true,
      platform: this.platformName,
      timestamp: new Date().toISOString(),
      rulesVersion: payload.rules_version || 'mock-version',
    }
  }

  getLastSyncPayload() {
    return this.lastSyncPayload
  }
}

// ── ContentHookService ──────────────────────────────────────────────────
class ContentHookService {
  constructor(addToQueueFn) {
    this.hooks = []
    this.addToQueue = addToQueueFn || (() => Promise.resolve())
  }

  registerHook(hook) {
    this.hooks.push(hook)
  }
  getHooks() {
    return [...this.hooks]
  }
  enableHook(name) {
    const h = this.hooks.find((h) => h.name === name)
    if (h) h.enabled = true
  }
  disableHook(name) {
    const h = this.hooks.find((h) => h.name === name)
    if (h) h.enabled = false
  }
  clearHooks() {
    this.hooks = []
  }

  async processContent(contentType, data) {
    const normalizedType = contentType.toLowerCase()
    const matchingHook = this.hooks.find(
      (h) => h.contentType.toLowerCase() === normalizedType && h.enabled,
    )
    if (!matchingHook) return
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
