/**
 * SyncReceiver
 *
 * Receives and processes cross-platform sync payloads from the WordPress
 * Multi-Platform Hub. Allows each platform to register callbacks that
 * are invoked when specific sync data arrives.
 *
 * Usage:
 *   const receiver = new SyncReceiver()
 *   receiver.onFirewallSync((rules) => { /* update local config *\/ })
 *   receiver.onSettingsSync((settings) => { /* update local settings *\/ })
 *   const result = await receiver.receiveSync(payload)
 */

import crypto from 'crypto'

/**
 * Sync payload received from the WordPress Multi-Platform Hub.
 */
export interface SyncPayload {
  /** Firewall rules configuration */
  firewall_rules: {
    max_links?: number
    blacklisted_keywords?: string
    blacklisted_email_domains?: string
    min_submit_time?: number
    enable_duplicate_detection?: boolean
    duplicate_lookback_days?: number
    global_action?: 'flag' | 'spam' | 'discard'
    [key: string]: unknown
  }
  /** Auto-moderation settings */
  auto_moderation: Record<string, unknown>
  /** ISO timestamp of the sync */
  timestamp: string
  /** URL of the source platform */
  source: string
  /** Optional rules version hash for deduplication */
  rules_version?: string
}

/**
 * Result of processing a sync payload.
 */
export interface SyncResult {
  success: boolean
  platform: string
  timestamp: string
  rulesVersion?: string
  error?: string
}

/**
 * Callback type for firewall rule syncs.
 */
export type FirewallSyncCallback = (
  rules: SyncPayload['firewall_rules'],
) => void | Promise<void>

/**
 * Callback type for auto-moderation settings syncs.
 */
export type SettingsSyncCallback = (
  settings: Record<string, unknown>,
) => void | Promise<void>

/**
 * Validates required fields in the sync payload.
 */
function validatePayload(payload: SyncPayload): string[] {
  const errors: string[] = []

  if (!payload.firewall_rules || typeof payload.firewall_rules !== 'object') {
    errors.push('Missing or invalid "firewall_rules"')
  }
  if (!payload.auto_moderation || typeof payload.auto_moderation !== 'object') {
    errors.push('Missing or invalid "auto_moderation"')
  }
  if (!payload.timestamp) {
    errors.push('Missing "timestamp"')
  }
  if (!payload.source) {
    errors.push('Missing "source"')
  }

  return errors
}

/**
 * Receives cross-platform sync payloads and dispatches them
 * to registered callbacks.
 */
export class SyncReceiver {
  private firewallCallbacks: FirewallSyncCallback[] = []
  private settingsCallbacks: SettingsSyncCallback[] = []
  private platformName: string
  private lastSyncPayload?: SyncPayload

  /**
   * @param platformName - Name of this platform for identification
   */
  constructor(platformName: string = 'Unknown') {
    this.platformName = platformName
  }

  /**
   * Register a callback for firewall rule sync events.
   */
  onFirewallSync(callback: FirewallSyncCallback): void {
    this.firewallCallbacks.push(callback)
  }

  /**
   * Register a callback for auto-moderation settings sync events.
   */
  onSettingsSync(callback: SettingsSyncCallback): void {
    this.settingsCallbacks.push(callback)
  }

  /**
   * Process an incoming sync payload from the WordPress hub.
   *
   * @param payload - The sync payload
   * @returns SyncResult with processing status
   */
  async receiveSync(payload: SyncPayload): Promise<SyncResult> {
    const errors = validatePayload(payload)

    if (errors.length > 0) {
      return {
        success: false,
        platform: this.platformName,
        timestamp: new Date().toISOString(),
        error: `Validation failed: ${errors.join('; ')}`,
      }
    }

    this.lastSyncPayload = payload

    // Compute a version hash for deduplication
    const computedVersion =
      payload.rules_version ||
      crypto
        .createHash('md5')
        .update(JSON.stringify(payload.firewall_rules))
        .digest('hex')

    // Dispatch to registered callbacks (wrap in Promise.resolve for safety)
    const dispatchPromises: Array<Promise<unknown>> = [
      ...this.firewallCallbacks.map((cb) =>
        Promise.resolve(cb(payload.firewall_rules)),
      ),
      ...this.settingsCallbacks.map((cb) =>
        Promise.resolve(cb(payload.auto_moderation)),
      ),
    ]

    await Promise.all(dispatchPromises)

    return {
      success: true,
      platform: this.platformName,
      timestamp: new Date().toISOString(),
      rulesVersion: computedVersion,
    }
  }

  /**
   * Get the last received sync payload (for inspection/debugging).
   */
  getLastSyncPayload(): SyncPayload | undefined {
    return this.lastSyncPayload
  }
}
