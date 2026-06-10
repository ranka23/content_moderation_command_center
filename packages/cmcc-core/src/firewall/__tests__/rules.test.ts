/**
 * Unit tests for CMCC Firewall Rule Engine
 *
 * Tests each rule checker in isolation, helpers (simhash, CIDR),
 * the master evaluateFirewallRules function, and stats tracking.
 */

import {
  evaluateFirewallRules,
  getFirewallRuleStats,
  resetFirewallRuleStats,
  simhash,
  isIPInCIDRRange,
  checkLinkCount,
  checkBlacklistedKeywords,
  checkBlacklistedIP,
  checkBlacklistedEmailDomain,
  checkBlockedCountry,
  checkSubmitTime,
  checkDuplicateContent,
  getDefaultFirewallOptions,
} from '../rules'

describe('simhash()', () => {
  it('returns a 64-bit hex string (16 characters)', () => {
    const hash = simhash('Hello, world!')
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('produces the same hash for identical content', () => {
    const a = simhash('The quick brown fox jumps over the lazy dog')
    const b = simhash('The quick brown fox jumps over the lazy dog')
    expect(a).toBe(b)
  })

  it('produces different hashes for different content', () => {
    const a = simhash('Content A')
    const b = simhash('Content B')
    expect(a).not.toBe(b)
  })

  it('handles empty string', () => {
    const hash = simhash('')
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('isIPInCIDRRange()', () => {
  it('returns true for IP within a /24 range', () => {
    expect(isIPInCIDRRange('192.168.1.5', '192.168.1.0/24')).toBe(true)
  })

  it('returns false for IP outside a /24 range', () => {
    expect(isIPInCIDRRange('192.168.2.5', '192.168.1.0/24')).toBe(false)
  })

  it('handles exact match with /32', () => {
    expect(isIPInCIDRRange('10.0.0.1', '10.0.0.1/32')).toBe(true)
    expect(isIPInCIDRRange('10.0.0.2', '10.0.0.1/32')).toBe(false)
  })

  it('handles /0 as allow-all', () => {
    expect(isIPInCIDRRange('1.2.3.4', '0.0.0.0/0')).toBe(true)
  })

  it('returns false for invalid CIDR prefix', () => {
    expect(isIPInCIDRRange('1.2.3.4', '10.0.0.0/33')).toBe(false)
  })
})

describe('checkLinkCount()', () => {
  it('returns not triggered when links are within limit', () => {
    const result = checkLinkCount('Hello world', 3)
    expect(result.triggered).toBe(false)
    expect(result.count).toBe(0)
  })

  it('returns triggered when links exceed max', () => {
    const content =
      'Check https://a.com and https://b.com and https://c.com and https://d.com'
    const result = checkLinkCount(content, 3)
    expect(result.triggered).toBe(true)
    expect(result.count).toBe(4)
  })
})

describe('checkBlacklistedKeywords()', () => {
  it('returns not triggered when no keywords match', () => {
    const result = checkBlacklistedKeywords('Clean content', ['spam', 'viagra'])
    expect(result.triggered).toBe(false)
  })

  it('returns triggered on exact keyword match', () => {
    const result = checkBlacklistedKeywords('Buy viagra now', ['viagra'])
    expect(result.triggered).toBe(true)
    expect(result.matchedKeyword).toBe('viagra')
  })

  it('matches wildcard *keyword* pattern', () => {
    const result = checkBlacklistedKeywords('This contains spammy text', [
      '*spam*',
    ])
    expect(result.triggered).toBe(true)
    expect(result.matchedKeyword).toBe('*spam*')
  })

  it('matches keyword* prefix pattern', () => {
    const result = checkBlacklistedKeywords('spam-123 content', ['spam*'])
    expect(result.triggered).toBe(true)
  })

  it('matches *keyword suffix pattern', () => {
    const result = checkBlacklistedKeywords('content-viagra', ['*viagra'])
    expect(result.triggered).toBe(true)
  })
})

describe('checkBlacklistedIP()', () => {
  it('returns not triggered for non-blacklisted IP', () => {
    const result = checkBlacklistedIP('10.0.0.1', ['192.168.1.1'])
    expect(result.triggered).toBe(false)
  })

  it('returns triggered for exact IP match', () => {
    const result = checkBlacklistedIP('192.168.1.1', ['192.168.1.1'])
    expect(result.triggered).toBe(true)
    expect(result.matchedIP).toBe('192.168.1.1')
  })

  it('matches CIDR notation', () => {
    const result = checkBlacklistedIP('10.0.0.5', ['10.0.0.0/24'])
    expect(result.triggered).toBe(true)
  })
})

describe('checkBlacklistedEmailDomain()', () => {
  it('returns not triggered for clean domain', () => {
    const result = checkBlacklistedEmailDomain('user@gmail.com', ['spam.com'])
    expect(result.triggered).toBe(false)
  })

  it('returns triggered for blacklisted domain', () => {
    const result = checkBlacklistedEmailDomain('user@spam.com', ['spam.com'])
    expect(result.triggered).toBe(true)
    expect(result.matchedDomain).toBe('spam.com')
  })

  it('returns not triggered for missing email domain', () => {
    const result = checkBlacklistedEmailDomain('noat', ['spam.com'])
    expect(result.triggered).toBe(false)
  })
})

describe('checkBlockedCountry()', () => {
  it('returns not triggered for non-blocked country', () => {
    const result = checkBlockedCountry('US', ['CN', 'RU'])
    expect(result.triggered).toBe(false)
  })

  it('returns triggered for blocked country', () => {
    const result = checkBlockedCountry('CN', ['CN', 'RU'])
    expect(result.triggered).toBe(true)
    expect(result.matchedCountry).toBe('CN')
  })

  it('is case-insensitive', () => {
    const result = checkBlockedCountry('cn', ['CN'])
    expect(result.triggered).toBe(true)
  })
})

describe('checkSubmitTime()', () => {
  it('returns not triggered when time delta is sufficient', () => {
    const result = checkSubmitTime(30, 5)
    expect(result.triggered).toBe(false)
  })

  it('returns triggered when submitted too fast', () => {
    const result = checkSubmitTime(2, 5)
    expect(result.triggered).toBe(true)
    expect(result.timeDelta).toBe(2)
  })
})

describe('checkDuplicateContent()', () => {
  it('returns not triggered when no duplicates exist', () => {
    const hash = simhash('Unique content')
    const result = checkDuplicateContent(hash, new Set())
    expect(result.triggered).toBe(false)
  })

  it('returns triggered for exact duplicate', () => {
    const content = 'Duplicate content here'
    const hash = simhash(content)
    const existingHashes = new Set([simhash('Duplicate content here')])
    const result = checkDuplicateContent(hash, existingHashes)
    expect(result.triggered).toBe(true)
  })
})

describe('evaluateFirewallRules()', () => {
  beforeEach(() => {
    resetFirewallRuleStats()
  })

  it('passes clean content through all rules', () => {
    const result = evaluateFirewallRules(
      'This is a perfectly normal comment',
      getDefaultFirewallOptions(),
      {
        authorIP: '192.168.1.1',
        submitTimeDelta: 30,
      },
    )
    expect(result.triggered).toBe(false)
    expect(result.action).toBeNull()
  })

  it('flags content with too many links', () => {
    const content =
      'Link1: https://a.com Link2: https://b.com Link3: https://c.com Link4: https://d.com'
    const result = evaluateFirewallRules(content, { maxLinks: 3 })
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('maxLinks')
    expect(result.action).toBe('flag')
  })

  it('discards content with blacklisted keywords', () => {
    const result = evaluateFirewallRules('Check out this viagra offer', {
      blacklistedKeywords: ['viagra'],
    })
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('blacklistedKeywords')
    expect(result.action).toBe('discard')
  })

  it('discards content from blacklisted IP', () => {
    const result = evaluateFirewallRules(
      'Normal content',
      { blacklistedIPs: ['10.0.0.5'] },
      { authorIP: '10.0.0.5' },
    )
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('blacklistedIPs')
  })

  it('discards content from blacklisted email domain', () => {
    const result = evaluateFirewallRules(
      'Normal content',
      { blacklistedEmailDomains: ['spamsite.com'] },
      { authorEmail: 'user@spamsite.com' },
    )
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('blacklistedEmailDomains')
  })

  it('blocks content from blocked country', () => {
    const result = evaluateFirewallRules(
      'Normal content',
      { blockedCountries: ['CN'] },
      { countryCode: 'CN' },
    )
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('blockedCountries')
  })

  it('catches too-fast submission', () => {
    const result = evaluateFirewallRules(
      'Normal content',
      { minSubmitTime: 5 },
      { submitTimeDelta: 1 },
    )
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('submitTime')
  })

  it('detects duplicate content', () => {
    const hash = simhash('Duplicate content')
    const result = evaluateFirewallRules(
      'Normal content',
      { enableDuplicateDetection: true },
      { contentHash: hash, recentHashes: new Set([hash]) },
    )
    expect(result.triggered).toBe(true)
    expect(result.ruleName).toBe('duplicateContent')
  })

  it('uses globalAction override', () => {
    const result = evaluateFirewallRules(
      'Link1: https://a.com Link2: https://b.com Link3: https://c.com Link4: https://d.com',
      { maxLinks: 3, globalAction: 'spam' },
    )
    expect(result.triggered).toBe(true)
    expect(result.action).toBe('spam')
  })

  it('uses per-rule action override over globalAction', () => {
    const result = evaluateFirewallRules(
      'Link1: https://a.com Link2: https://b.com Link3: https://c.com Link4: https://d.com',
      {
        maxLinks: 3,
        globalAction: 'flag',
        ruleActions: { maxLinks: 'discard' },
      },
    )
    expect(result.triggered).toBe(true)
    expect(result.action).toBe('discard')
  })
})

describe('getFirewallRuleStats()', () => {
  beforeEach(() => {
    resetFirewallRuleStats()
  })

  it('returns all zero stats initially', () => {
    const stats = getFirewallRuleStats()
    expect(stats.maxLinks).toBe(0)
    expect(stats.blacklistedKeywords).toBe(0)
    expect(stats.blacklistedIPs).toBe(0)
    expect(stats.blacklistedEmailDomains).toBe(0)
    expect(stats.blockedCountries).toBe(0)
    expect(stats.submitTime).toBe(0)
    expect(stats.duplicateContent).toBe(0)
  })

  it('increments after rule triggers', () => {
    evaluateFirewallRules('spam content', { blacklistedKeywords: ['spam'] })
    const stats = getFirewallRuleStats()
    expect(stats.blacklistedKeywords).toBe(1)
  })

  it('accumulates counts across multiple invocations', () => {
    evaluateFirewallRules('spam content', { blacklistedKeywords: ['spam'] })
    evaluateFirewallRules('spam again', { blacklistedKeywords: ['spam'] })
    const stats = getFirewallRuleStats()
    expect(stats.blacklistedKeywords).toBe(2)
  })
})

describe('getDefaultFirewallOptions()', () => {
  it('returns reasonable defaults', () => {
    const defaults = getDefaultFirewallOptions()
    expect(defaults.maxLinks).toBe(3)
    expect(defaults.blacklistedKeywords).toEqual([])
    expect(defaults.blacklistedIPs).toEqual([])
    expect(defaults.blacklistedEmailDomains).toEqual([])
    expect(defaults.blockedCountries).toEqual([])
    expect(defaults.minSubmitTime).toBe(5)
    expect(defaults.enableDuplicateDetection).toBe(true)
    expect(defaults.duplicateLookbackDays).toBe(30)
    expect(defaults.duplicateThreshold).toBe(3)
  })
})
