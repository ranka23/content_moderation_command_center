/**
 * FirewallService
 *
 * Server-side firewall wrapper that integrates @cmcc/core firewall rules
 * with settings persistence and statistics tracking. Provides a platform-
 * agnostic interface that can be used by Strapi, Shopify, Storyblok, and
 * Wix backends.
 *
 * Usage:
 *   const service = new FirewallService(config, storageAdapter)
 *   const result = await service.evaluateContent({ content, authorIP, ... })
 *   const stats = service.getStats()
 */

import type { FirewallRuleOptions, FirewallResult } from '@cmcc/core'
import {
  evaluateFirewallRules,
  getFirewallRuleStats,
  resetFirewallRuleStats,
  simhash,
} from '@cmcc/core'

/**
 * Storage adapter interface for persisting firewall evaluation results
 * and recent content hashes for duplicate detection.
 */
export interface FirewallStorageAdapter {
  /** Get recent content simhashes for duplicate detection */
  getRecentHashes(lookbackDays: number): Promise<Set<string>>
  /** Persist a content hash for future duplicate detection */
  storeContentHash(hash: string, timestamp: string): Promise<void>
  /** Get failed evaluation log entries */
  getFailedEvaluations(): Promise<Array<{ timestamp: string; reason: string }>>
}

/**
 * Input context for content evaluation.
 */
export interface EvaluationContext {
  /** The content text to evaluate */
  content: string
  /** Author's IP address */
  authorIP?: string
  /** Author's email address */
  authorEmail?: string
  /** Time delta since form focus/page load (anti-honeypot) */
  submitTimeDelta?: number
  /** ISO country code for geo-blocking */
  countryCode?: string
  /** Unique identifier for the content being evaluated */
  contentId?: string
}

/**
 * Result of a content evaluation, including whether the firewall
 * was triggered and what action to take.
 */
export interface EvaluationResult extends FirewallResult {
  /** Whether any firewall rule was triggered */
  triggered: boolean
  /** Timestamp of evaluation */
  evaluatedAt: string
}

/**
 * Configuration for the FirewallService.
 * Extends @cmcc/core FirewallRuleOptions with per-rule action overrides.
 */
export interface FirewallServiceConfig extends FirewallRuleOptions {
  /** Per-rule action overrides */
  ruleActions?: Record<string, 'flag' | 'discard' | 'spam'>
}

/**
 * Creates a default firewall configuration.
 */
export function getDefaultFirewallConfig(): FirewallServiceConfig {
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

/**
 * Server-side firewall service wrapping @cmcc/core firewall rules.
 * Provides configuration management, stats tracking, and storage integration.
 */
export class FirewallService {
  private config: FirewallServiceConfig
  private storage: FirewallStorageAdapter | null

  /**
   * Create a new FirewallService.
   *
   * @param config  - Initial firewall configuration
   * @param storage - Optional storage adapter for persisting evaluations
   */
  constructor(
    config?: Partial<FirewallServiceConfig>,
    storage?: FirewallStorageAdapter | null,
  ) {
    this.config = { ...getDefaultFirewallConfig(), ...config }
    this.storage = storage || null
  }

  /**
   * Evaluate content against all configured firewall rules.
   * Returns the evaluation result with triggered state, action, and reason.
   *
   * @param context - The content and author context to evaluate
   * @returns Promise resolving to the evaluation result
   */
  async evaluateContent(context: EvaluationContext): Promise<EvaluationResult> {
    const { content, authorIP, authorEmail, submitTimeDelta, countryCode } =
      context

    // Get recent hashes for duplicate detection if storage is available
    let recentHashes: Set<string> | undefined
    if (this.storage && this.config.enableDuplicateDetection) {
      recentHashes = await this.storage.getRecentHashes(
        this.config.duplicateLookbackDays || 7,
      )
    }

    const contentHash =
      this.config.enableDuplicateDetection && content
        ? simhash(content)
        : undefined

    const result = evaluateFirewallRules(content || '', this.config, {
      ...(authorIP !== undefined ? { authorIP } : {}),
      ...(authorEmail !== undefined ? { authorEmail } : {}),
      ...(submitTimeDelta !== undefined ? { submitTimeDelta } : {}),
      ...(contentHash !== undefined ? { contentHash } : {}),
      ...(recentHashes !== undefined ? { recentHashes } : {}),
      ...(countryCode !== undefined ? { countryCode } : {}),
    })

    const evaluation: EvaluationResult = {
      ...result,
      evaluatedAt: new Date().toISOString(),
    }

    // Persist the content hash for future duplicate detection
    // contentHash was computed above for the evaluation call
    if (this.storage && contentHash && this.config.enableDuplicateDetection) {
      await this.storage.storeContentHash(contentHash, new Date().toISOString())
    }

    // Note: The storage adapter does not have a generic set() method.
    // Platforms can extend the adapter or store results via their own mechanism.

    return evaluation
  }

  /**
   * Get current firewall rule hit statistics.
   */
  getStats(): Record<string, number> {
    return getFirewallRuleStats()
  }

  /**
   * Reset all firewall rule statistics.
   */
  resetStats(): void {
    resetFirewallRuleStats()
  }

  /**
   * Update the firewall configuration at runtime.
   * Merges the provided partial config with the existing config.
   *
   * @param partialConfig - Partial configuration to merge
   */
  updateConfig(partialConfig: Partial<FirewallServiceConfig>): void {
    this.config = { ...this.config, ...partialConfig }
  }

  /**
   * Get the current firewall configuration.
   */
  getConfig(): FirewallServiceConfig {
    return { ...this.config }
  }
}
