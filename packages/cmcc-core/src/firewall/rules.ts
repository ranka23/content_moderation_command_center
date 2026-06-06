/**
 * CMCC Firewall Rule Engine
 *
 * This module contains pure functions for evaluating content against spam firewall rules.
 * It's designed to be platform-agnostic and can be used in WordPress (PHP port),
 * Strapi, Storyblok, and Wix implementations.
 */

export interface FirewallRuleOptions {
  maxLinks?: number
  blacklistedKeywords?: string[]
  blacklistedIPs?: string[]
  blacklistedEmailDomains?: string[]
  blockedCountries?: string[] // ISO country codes
  minSubmitTime?: number // seconds
  enableDuplicateDetection?: boolean
  duplicateLookbackDays?: number
  duplicateThreshold?: number // max Hamming distance for simhash (default: 3)
  globalAction?: 'flag' | 'discard' | 'spam'
  ruleActions?: Record<string, 'flag' | 'discard' | 'spam'>
}

export interface FirewallRuleStats {
  maxLinks: number
  blacklistedKeywords: number
  blacklistedIPs: number
  blacklistedEmailDomains: number
  blockedCountries: number
  submitTime: number
  duplicateContent: number
  [key: string]: number
}

// ---------------------------------------------------------------------------
// Internal stats tracking
// ---------------------------------------------------------------------------

const ruleStatsMap = new Map<string, number>()

function incrementRuleStat(ruleName: string): void {
  const current = ruleStatsMap.get(ruleName) ?? 0
  ruleStatsMap.set(ruleName, current + 1)
}

/**
 * Return a snapshot of the current rule-hit statistics.
 */
export function getFirewallRuleStats(): FirewallRuleStats {
  const stats: FirewallRuleStats = {
    maxLinks: 0,
    blacklistedKeywords: 0,
    blacklistedIPs: 0,
    blacklistedEmailDomains: 0,
    blockedCountries: 0,
    submitTime: 0,
    duplicateContent: 0,
  }
  for (const [key, value] of ruleStatsMap) {
    stats[key] = value
  }
  return stats
}

/**
 * Reset all rule-hit statistics (useful for testing or periodic resets).
 */
export function resetFirewallRuleStats(): void {
  ruleStatsMap.clear()
}

// ---------------------------------------------------------------------------
// Simhash helpers
// ---------------------------------------------------------------------------

/**
 * Compute a 64-bit simhash of the given content.
 * @param content The input string
 * @returns A 64-bit hex string representing the simhash
 */
export function simhash(content: string): string {
  // We'll return a 64-bit hex string (16 hex characters)
  const hashBits = 64
  const vectors = Array(hashBits).fill(0)

  // Simple tokenization: split by non-alphanumeric
  const tokens = content.toLowerCase().split(/[^a-z0-9]+/)

  for (const token of tokens) {
    if (token === '') continue
    // Compute a 64-bit hash for the token using BigInt
    let tokenHash = 0n
    for (let i = 0; i < token.length; i++) {
      // tokenHash * 31 + charCode (as BigInt for 64-bit precision)
      tokenHash = (tokenHash << 5n) - tokenHash + BigInt(token.charCodeAt(i))
      tokenHash = tokenHash & 0xffffffffffffffffn
    }
    // Use the 64 bits of the token hash
    for (let i = 0; i < hashBits; i++) {
      const bit = Number((tokenHash >> BigInt(i)) & 1n)
      if (bit === 1) {
        vectors[i] += 1
      } else {
        vectors[i] -= 1
      }
    }
  }

  // Build the simhash bit array
  let simhashValue = 0n
  for (let i = 0; i < hashBits; i++) {
    if (vectors[i] >= 0) {
      simhashValue |= BigInt(1) << BigInt(i)
    }
  }

  // Convert to hex string
  return simhashValue.toString(16).padStart(16, '0')
}

/**
 * Compute the Hamming distance between two hex strings (assuming same length).
 * @param hash1 First hex string
 * @param hash2 Second hex string
 * @returns Number of differing bits
 */
function hammingDistance(hash1: string, hash2: string): number {
  // Convert hex strings to big integers
  const num1 = BigInt(`0x${hash1}`)
  const num2 = BigInt(`0x${hash2}`)
  const xor = num1 ^ num2
  // Count the number of 1 bits in xor
  let count = 0
  let v = xor
  while (v) {
    count += Number(v & 1n)
    v >>= 1n
  }
  return count
}

export interface FirewallResult {
  triggered: boolean
  action: 'flag' | 'discard' | 'spam' | null
  reason: string
  ruleName: string
}

// ---------------------------------------------------------------------------
// IP / CIDR helpers
// ---------------------------------------------------------------------------

/**
 * Convert a dotted-quad IPv4 string into a 32-bit unsigned integer.
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.')
  return (
    ((parseInt(parts[0] ?? '0', 10) << 24) |
      (parseInt(parts[1] ?? '0', 10) << 16) |
      (parseInt(parts[2] ?? '0', 10) << 8) |
      parseInt(parts[3] ?? '0', 10)) >>>
    0
  )
}

/**
 * Check whether an IPv4 address falls within a CIDR range.
 *
 * @param ip  The IP address to test (e.g. "192.168.1.5")
 * @param cidr  CIDR notation (e.g. "192.168.1.0/24")
 * @returns `true` if the IP is within the range
 */
export function isIPInCIDRRange(ip: string, cidr: string): boolean {
  const parts = cidr.split('/')
  const cidrIp = parts[0] ?? ''
  const prefixBits = parts[1]
  const prefix = parseInt(prefixBits ?? '', 10)

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const ipInt = ipToInt(ip)
  const cidrInt = ipToInt(cidrIp)

  if (prefix === 0) return true
  if (prefix === 32) return ipInt === cidrInt

  const shift = 32 - prefix
  const mask = (~0 << shift) >>> 0
  return (ipInt & mask) >>> 0 === (cidrInt & mask) >>> 0
}

// ---------------------------------------------------------------------------
// Individual rule checkers
// ---------------------------------------------------------------------------

/**
 * Check if content has too many links
 */
export function checkLinkCount(
  content: string,
  maxLinks: number = 3,
): { triggered: boolean; count: number } {
  // Simple regex to find HTTP/HTTPS links
  const linkPattern = /https?:\/\/[^\s]+/gi
  const matches = content.match(linkPattern) || []
  return {
    triggered: matches.length > maxLinks,
    count: matches.length,
  }
}

/**
 * Check for blacklisted keywords
 */
export function checkBlacklistedKeywords(
  content: string,
  keywords: string[] = [],
): { triggered: boolean; matchedKeyword: string | null } {
  const lowerContent = content.toLowerCase()

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase().trim()
    if (!lowerKeyword) continue

    // Handle wildcards
    if (lowerKeyword.startsWith('*') && lowerKeyword.endsWith('*')) {
      // *keyword* - contains
      const checkWord = lowerKeyword.substring(1, lowerKeyword.length - 1)
      if (lowerContent.includes(checkWord)) {
        return { triggered: true, matchedKeyword: keyword }
      }
    } else if (lowerKeyword.endsWith('*')) {
      // keyword* - starts with
      const checkWord = lowerKeyword.substring(0, lowerKeyword.length - 1)
      if (lowerContent.startsWith(checkWord)) {
        return { triggered: true, matchedKeyword: keyword }
      }
    } else if (lowerKeyword.startsWith('*')) {
      // *keyword - ends with
      const checkWord = lowerKeyword.substring(1)
      if (lowerContent.endsWith(checkWord)) {
        return { triggered: true, matchedKeyword: keyword }
      }
    } else {
      // exact match or contains
      if (lowerContent.includes(lowerKeyword)) {
        return { triggered: true, matchedKeyword: keyword }
      }
    }
  }

  return { triggered: false, matchedKeyword: null }
}

/**
 * Check if IP is blacklisted (supports exact IP and CIDR notation)
 */
export function checkBlacklistedIP(
  ip: string,
  blacklistedIPs: string[] = [],
): { triggered: boolean; matchedIP: string | null } {
  for (const entry of blacklistedIPs) {
    if (entry.includes('/')) {
      // CIDR notation
      if (isIPInCIDRRange(ip, entry)) {
        return { triggered: true, matchedIP: entry }
      }
    } else {
      // Exact match
      if (ip === entry) {
        return { triggered: true, matchedIP: entry }
      }
    }
  }

  return { triggered: false, matchedIP: null }
}

/**
 * Check if email domain is blacklisted
 */
export function checkBlacklistedEmailDomain(
  email: string,
  blacklistedDomains: string[] = [],
): { triggered: boolean; matchedDomain: string | null } {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return { triggered: false, matchedDomain: null }

  for (const blacklisted of blacklistedDomains) {
    if (domain === blacklisted.toLowerCase()) {
      return { triggered: true, matchedDomain: blacklisted }
    }
  }

  return { triggered: false, matchedDomain: null }
}

/**
 * Check if country is blocked (simplified - would use GeoLite2 in production)
 */
export function checkBlockedCountry(
  countryCode: string,
  blockedCountries: string[] = [],
): { triggered: boolean; matchedCountry: string | null } {
  const normalizedCode = countryCode.toUpperCase()
  const normalizedBlocked = blockedCountries.map((c) => c.toUpperCase())
  if (normalizedBlocked.includes(normalizedCode)) {
    return { triggered: true, matchedCountry: countryCode }
  }

  return { triggered: false, matchedCountry: null }
}

/**
 * Check if content was submitted too quickly (honeypot technique)
 */
export function checkSubmitTime(
  timeDelta: number, // seconds since page load or form focus
  minTime: number = 5,
): { triggered: boolean; timeDelta: number } {
  return {
    triggered: timeDelta < minTime,
    timeDelta,
  }
}

/**
 * Check for duplicate content using simhash and Hamming distance.
 * @param contentHash The simhash of the content (as a hex string)
 * @param recentHashes Set of recent simhashes (hex strings)
 * @param threshold Maximum Hamming distance to consider as duplicate (default: 3)
 * @returns Object indicating if duplicate content was triggered
 */
export function checkDuplicateContent(
  contentHash: string,
  recentHashes: Set<string> = new Set(),
  threshold: number = 3,
): { triggered: boolean; isDuplicate: boolean } {
  for (const recent of recentHashes) {
    if (hammingDistance(contentHash, recent) <= threshold) {
      return { triggered: true, isDuplicate: true }
    }
  }
  return { triggered: false, isDuplicate: false }
}

// ---------------------------------------------------------------------------
// Action resolution helper
// ---------------------------------------------------------------------------

/**
 * Resolve the action for a triggered rule using the priority:
 * 1. Per-rule override (`ruleActions`)
 * 2. Global default (`globalAction`)
 * 3. Hard-coded per-rule default
 */
function resolveAction(
  ruleName: string,
  defaultAction: 'flag' | 'discard' | 'spam',
  globalAction?: 'flag' | 'discard' | 'spam',
  ruleActions?: Record<string, 'flag' | 'discard' | 'spam'>,
): 'flag' | 'discard' | 'spam' {
  return ruleActions?.[ruleName] ?? globalAction ?? defaultAction
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

/**
 * Main firewall evaluation function
 */
export function evaluateFirewallRules(
  content: string,
  options: FirewallRuleOptions = {},
  context: {
    authorIP?: string
    authorEmail?: string
    submitTimeDelta?: number // seconds
    contentHash?: string
    recentHashes?: Set<string>
    countryCode?: string // ISO country code
  } = {},
): FirewallResult {
  const {
    maxLinks = 3,
    blacklistedKeywords = [],
    blacklistedIPs = [],
    blacklistedEmailDomains = [],
    blockedCountries = [],
    minSubmitTime = 5,
    enableDuplicateDetection = true,
    duplicateThreshold = 3,
    globalAction,
    ruleActions,
  } = options

  const {
    authorIP,
    authorEmail,
    submitTimeDelta,
    contentHash,
    recentHashes,
    countryCode,
  } = context

  // Check each rule in order of priority

  // 1. Link count
  const linkResult = checkLinkCount(content, maxLinks)
  if (linkResult.triggered) {
    incrementRuleStat('maxLinks')
    return {
      triggered: true,
      action: resolveAction('maxLinks', 'flag', globalAction, ruleActions),
      reason: `Content contains ${linkResult.count} links (max allowed: ${maxLinks})`,
      ruleName: 'maxLinks',
    }
  }

  // 2. Blacklisted keywords
  const keywordResult = checkBlacklistedKeywords(content, blacklistedKeywords)
  if (keywordResult.triggered) {
    incrementRuleStat('blacklistedKeywords')
    return {
      triggered: true,
      action: resolveAction(
        'blacklistedKeywords',
        'discard',
        globalAction,
        ruleActions,
      ),
      reason: `Content contains blacklisted keyword: "${keywordResult.matchedKeyword}"`,
      ruleName: 'blacklistedKeywords',
    }
  }

  // 3. Blacklisted IP
  if (authorIP) {
    const ipResult = checkBlacklistedIP(authorIP, blacklistedIPs)
    if (ipResult.triggered) {
      incrementRuleStat('blacklistedIPs')
      return {
        triggered: true,
        action: resolveAction(
          'blacklistedIPs',
          'discard',
          globalAction,
          ruleActions,
        ),
        reason: `Author IP address is blacklisted: ${ipResult.matchedIP}`,
        ruleName: 'blacklistedIPs',
      }
    }
  }

  // 4. Blacklisted email domain
  if (authorEmail) {
    const emailResult = checkBlacklistedEmailDomain(
      authorEmail,
      blacklistedEmailDomains,
    )
    if (emailResult.triggered) {
      incrementRuleStat('blacklistedEmailDomains')
      return {
        triggered: true,
        action: resolveAction(
          'blacklistedEmailDomains',
          'discard',
          globalAction,
          ruleActions,
        ),
        reason: `Author email domain is blacklisted: ${emailResult.matchedDomain}`,
        ruleName: 'blacklistedEmailDomains',
      }
    }
  }

  // 5. Blocked country
  if (countryCode) {
    const countryResult = checkBlockedCountry(countryCode, blockedCountries)
    if (countryResult.triggered) {
      incrementRuleStat('blockedCountries')
      return {
        triggered: true,
        action: resolveAction(
          'blockedCountries',
          'discard',
          globalAction,
          ruleActions,
        ),
        reason: `Author country is blocked: ${countryResult.matchedCountry}`,
        ruleName: 'blockedCountries',
      }
    }
  }

  // 6. Submit time too fast
  if (submitTimeDelta !== undefined) {
    const timeResult = checkSubmitTime(submitTimeDelta, minSubmitTime)
    if (timeResult.triggered) {
      incrementRuleStat('submitTime')
      return {
        triggered: true,
        action: resolveAction(
          'submitTime',
          'discard',
          globalAction,
          ruleActions,
        ),
        reason: `Content submitted too quickly (${timeResult.timeDelta.toFixed(1)}s < ${minSubmitTime}s)`,
        ruleName: 'submitTime',
      }
    }
  }

  // 7. Duplicate content
  if (enableDuplicateDetection && contentHash && recentHashes) {
    const duplicateResult = checkDuplicateContent(
      contentHash,
      recentHashes,
      duplicateThreshold,
    )
    if (duplicateResult.triggered) {
      incrementRuleStat('duplicateContent')
      return {
        triggered: true,
        action: resolveAction(
          'duplicateContent',
          'flag',
          globalAction,
          ruleActions,
        ),
        reason: 'Duplicate content detected',
        ruleName: 'duplicateContent',
      }
    }
  }

  // No rules triggered
  return {
    triggered: false,
    action: null,
    reason: '',
    ruleName: '',
  }
}

/**
 * Get default firewall options
 */
export function getDefaultFirewallOptions(): FirewallRuleOptions {
  return {
    maxLinks: 3,
    blacklistedKeywords: [],
    blacklistedIPs: [],
    blacklistedEmailDomains: [],
    blockedCountries: [],
    minSubmitTime: 5,
    enableDuplicateDetection: true,
    duplicateLookbackDays: 30,
    duplicateThreshold: 3,
  }
}
