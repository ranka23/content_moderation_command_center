import {
  checkLinkCount,
  checkBlacklistedKeywords,
  checkBlacklistedIP,
  checkBlacklistedEmailDomain,
  checkBlockedCountry,
  checkSubmitTime,
  checkDuplicateContent,
  evaluateFirewallRules,
  getDefaultFirewallOptions,
  isIPInCIDRRange,
  getFirewallRuleStats,
  resetFirewallRuleStats,
  simhash,
} from '../rules'

describe('Firewall Rule Engine', () => {
  describe('simhash', () => {
    it('should produce consistent hashes for the same content', () => {
      const hash1 = simhash('The quick brown fox jumps over the lazy dog')
      const hash2 = simhash('The quick brown fox jumps over the lazy dog')
      expect(hash1).toBe(hash2)
    })

    it('should produce similar hashes for similar content (low Hamming distance)', () => {
      const hash1 = simhash('The quick brown fox jumps over the lazy dog')
      const hash2 = simhash('The quick brown fox jumps over the lazy cat')
      // Compute Hamming distance via XOR bit count helper
      const num1 = BigInt(`0x${hash1}`)
      const num2 = BigInt(`0x${hash2}`)
      const xor = num1 ^ num2
      let distance = 0
      let v = xor
      while (v) {
        distance += Number(v & 1n)
        v >>= 1n
      }
      // Similar content should have low Hamming distance (< 20 bits diff)
      expect(distance).toBeLessThan(20)
    })

    it('should produce very different hashes for very different content', () => {
      const hash1 = simhash('The quick brown fox jumps over the lazy dog')
      const hash2 = simhash(
        'Totally unrelated content about completely different topics',
      )
      const num1 = BigInt(`0x${hash1}`)
      const num2 = BigInt(`0x${hash2}`)
      const xor = num1 ^ num2
      let distance = 0
      let v = xor
      while (v) {
        distance += Number(v & 1n)
        v >>= 1n
      }
      // Very different content should have higher Hamming distance
      expect(distance).toBeGreaterThan(10)
    })

    it('should handle empty string', () => {
      const hash = simhash('')
      expect(hash).toBe('ffffffffffffffff')
    })

    it('should handle single character', () => {
      const hash = simhash('a')
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should produce 64-bit hex string (16 hex characters)', () => {
      const hash = simhash('Some content here')
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should produce the same hash for content with extra whitespace differences', () => {
      const hash1 = simhash('hello   world')
      const hash2 = simhash('hello world')
      expect(hash1).toBe(hash2)
    })
  })

  describe('checkLinkCount', () => {
    it('should not trigger for content with fewer links than max', () => {
      const result = checkLinkCount(
        'Visit http://example.com and https://test.org',
        5,
      )
      expect(result.triggered).toBe(false)
      expect(result.count).toBe(2)
    })

    it('should trigger for content with more links than max', () => {
      const result = checkLinkCount(
        'Visit http://a.com https://b.org and https://c.net',
        2,
      )
      expect(result.triggered).toBe(true)
      expect(result.count).toBe(3)
    })

    it('should handle content with no links', () => {
      const result = checkLinkCount('Just plain text here', 3)
      expect(result.triggered).toBe(false)
      expect(result.count).toBe(0)
    })

    it('should handle various URL formats', () => {
      const result = checkLinkCount(
        'Check http://example.com and https://test.org/path?query=1',
        1,
      )
      expect(result.triggered).toBe(true)
      expect(result.count).toBe(2)
    })

    it('should not trigger when count equals max', () => {
      const result = checkLinkCount('http://a.com http://b.com http://c.com', 3)
      expect(result.triggered).toBe(false)
      expect(result.count).toBe(3)
    })

    it('should use default maxLinks of 3', () => {
      const result = checkLinkCount(
        'http://a.com http://b.com http://c.com http://d.com',
      )
      expect(result.triggered).toBe(true)
    })
  })

  describe('checkBlacklistedKeywords', () => {
    it('should not trigger when no keywords match', () => {
      const result = checkBlacklistedKeywords('This is clean content', [
        'spam',
        'viagra',
      ])
      expect(result.triggered).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should trigger for exact keyword match', () => {
      const result = checkBlacklistedKeywords('This is spam content', [
        'spam',
        'viagra',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('spam')
    })

    it('should trigger for partial keyword match', () => {
      const result = checkBlacklistedKeywords('Buy viagra now!', ['viagra'])
      expect(result.triggered).toBe(true)
    })

    it('should handle case insensitivity', () => {
      const result = checkBlacklistedKeywords('SPAM content here', ['spam'])
      expect(result.triggered).toBe(true)
    })

    it('should handle wildcard prefixes (*keyword)', () => {
      const result = checkBlacklistedKeywords('ends with spamword', [
        '*spamword',
      ])
      expect(result.triggered).toBe(true)
    })

    it('should handle wildcard suffixes (keyword*)', () => {
      const result = checkBlacklistedKeywords('spamword begins here', [
        'spamword*',
      ])
      expect(result.triggered).toBe(true)
    })

    it('should handle wildcards on both sides (*keyword*)', () => {
      const result = checkBlacklistedKeywords('this has spamword inside', [
        '*spamword*',
      ])
      expect(result.triggered).toBe(true)
    })

    it('should ignore empty keywords', () => {
      const result = checkBlacklistedKeywords('some content', ['', '  '])
      expect(result.triggered).toBe(false)
    })

    it('should return first matching keyword', () => {
      const result = checkBlacklistedKeywords('spam and viagra', [
        'viagra',
        'spam',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBeDefined()
    })

    it('should handle empty keyword list', () => {
      const result = checkBlacklistedKeywords('any content', [])
      expect(result.triggered).toBe(false)
    })
  })

  describe('checkBlacklistedIP', () => {
    it('should not trigger when IP is not blacklisted', () => {
      const result = checkBlacklistedIP('192.168.1.1', ['10.0.0.1'])
      expect(result.triggered).toBe(false)
      expect(result.matchedIP).toBeNull()
    })

    it('should trigger when IP is blacklisted', () => {
      const result = checkBlacklistedIP('192.168.1.100', ['192.168.1.100'])
      expect(result.triggered).toBe(true)
      expect(result.matchedIP).toBe('192.168.1.100')
    })

    it('should handle empty blacklist', () => {
      const result = checkBlacklistedIP('10.0.0.1', [])
      expect(result.triggered).toBe(false)
    })

    it('should match IP within CIDR range in blacklist', () => {
      const result = checkBlacklistedIP('10.0.0.5', ['10.0.0.0/24'])
      expect(result.triggered).toBe(true)
    })

    it('should not match IP outside CIDR range', () => {
      const result = checkBlacklistedIP('11.0.0.1', ['10.0.0.0/24'])
      expect(result.triggered).toBe(false)
    })

    it('should handle mixed exact IP and CIDR entries', () => {
      const result = checkBlacklistedIP('192.168.1.5', [
        '10.0.0.0/8',
        '192.168.1.0/24',
      ])
      expect(result.triggered).toBe(true)
    })

    it('should match IP in /16 CIDR range', () => {
      const result = checkBlacklistedIP('172.16.1.1', ['172.16.0.0/16'])
      expect(result.triggered).toBe(true)
    })

    it('should not match IP outside /16 CIDR range', () => {
      const result = checkBlacklistedIP('173.16.1.1', ['172.16.0.0/16'])
      expect(result.triggered).toBe(false)
    })
  })

  describe('isIPInCIDRRange', () => {
    it('should return true for IP within /24 CIDR range', () => {
      expect(isIPInCIDRRange('192.168.1.50', '192.168.1.0/24')).toBe(true)
    })

    it('should return false for IP outside /24 CIDR range', () => {
      expect(isIPInCIDRRange('192.168.2.50', '192.168.1.0/24')).toBe(false)
    })

    it('should handle /32 prefix (single IP)', () => {
      expect(isIPInCIDRRange('10.0.0.1', '10.0.0.1/32')).toBe(true)
      expect(isIPInCIDRRange('10.0.0.2', '10.0.0.1/32')).toBe(false)
    })

    it('should handle /0 prefix (all IPs)', () => {
      expect(isIPInCIDRRange('1.2.3.4', '0.0.0.0/0')).toBe(true)
    })

    it('should handle /16 prefix', () => {
      expect(isIPInCIDRRange('10.0.1.1', '10.0.0.0/16')).toBe(true)
      expect(isIPInCIDRRange('10.1.1.1', '10.0.0.0/16')).toBe(false)
    })

    it('should handle /8 prefix', () => {
      expect(isIPInCIDRRange('10.1.2.3', '10.0.0.0/8')).toBe(true)
      expect(isIPInCIDRRange('11.1.2.3', '10.0.0.0/8')).toBe(false)
    })

    it('should return false for invalid CIDR notation', () => {
      expect(isIPInCIDRRange('10.0.0.1', 'invalid')).toBe(false)
      expect(isIPInCIDRRange('10.0.0.1', '10.0.0.0/33')).toBe(false)
      expect(isIPInCIDRRange('10.0.0.1', '10.0.0.0/-1')).toBe(false)
    })

    it('should handle /24 prefix correctly', () => {
      expect(isIPInCIDRRange('192.168.1.0', '192.168.1.0/24')).toBe(true)
      expect(isIPInCIDRRange('192.168.1.255', '192.168.1.0/24')).toBe(true)
    })
  })

  describe('checkBlacklistedEmailDomain', () => {
    it('should not trigger when email domain is not blacklisted', () => {
      const result = checkBlacklistedEmailDomain('user@gmail.com', [
        'spamdomain.com',
      ])
      expect(result.triggered).toBe(false)
      expect(result.matchedDomain).toBeNull()
    })

    it('should trigger when email domain is blacklisted', () => {
      const result = checkBlacklistedEmailDomain('user@spamdomain.com', [
        'spamdomain.com',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedDomain).toBe('spamdomain.com')
    })

    it('should handle case insensitivity', () => {
      const result = checkBlacklistedEmailDomain('user@SPAMDOMAIN.COM', [
        'spamdomain.com',
      ])
      expect(result.triggered).toBe(true)
    })

    it('should handle malformed email addresses', () => {
      const result = checkBlacklistedEmailDomain('not-an-email', ['domain.com'])
      expect(result.triggered).toBe(false)
    })

    it('should handle empty email string', () => {
      const result = checkBlacklistedEmailDomain('', ['domain.com'])
      expect(result.triggered).toBe(false)
    })
  })

  describe('checkBlockedCountry', () => {
    it('should not trigger when country is not blocked', () => {
      const result = checkBlockedCountry('US', ['CN', 'RU'])
      expect(result.triggered).toBe(false)
    })

    it('should trigger when country is blocked', () => {
      const result = checkBlockedCountry('CN', ['CN', 'RU'])
      expect(result.triggered).toBe(true)
      expect(result.matchedCountry).toBe('CN')
    })

    it('should handle case insensitivity', () => {
      const result = checkBlockedCountry('cn', ['CN'])
      expect(result.triggered).toBe(true)
    })

    it('should handle empty blocked list', () => {
      const result = checkBlockedCountry('US', [])
      expect(result.triggered).toBe(false)
    })
  })

  describe('checkSubmitTime', () => {
    it('should not trigger when submit time is adequate', () => {
      const result = checkSubmitTime(10, 5)
      expect(result.triggered).toBe(false)
      expect(result.timeDelta).toBe(10)
    })

    it('should trigger when submit time is too fast', () => {
      const result = checkSubmitTime(2, 5)
      expect(result.triggered).toBe(true)
      expect(result.timeDelta).toBe(2)
    })

    it('should handle exact boundary', () => {
      const result = checkSubmitTime(5, 5)
      expect(result.triggered).toBe(false) // not less than min
    })

    it('should use default minTime of 5', () => {
      const result = checkSubmitTime(3)
      expect(result.triggered).toBe(true)
    })

    it('should handle zero timeDelta', () => {
      const result = checkSubmitTime(0, 1)
      expect(result.triggered).toBe(true)
    })
  })

  describe('checkDuplicateContent', () => {
    it('should not trigger when hash is not in recent hashes', () => {
      const recentHashes = new Set(['abcdef1234567890', '1234567890abcdef'])
      const result = checkDuplicateContent('0000000000000000', recentHashes)
      expect(result.triggered).toBe(false)
      expect(result.isDuplicate).toBe(false)
    })

    it('should trigger when hash is in recent hashes', () => {
      const recentHashes = new Set(['abcdef1234567890', '1234567890abcdef'])
      const result = checkDuplicateContent('abcdef1234567890', recentHashes)
      expect(result.triggered).toBe(true)
      expect(result.isDuplicate).toBe(true)
    })

    it('should handle empty recent hashes', () => {
      const result = checkDuplicateContent('abcdef1234567890', new Set())
      expect(result.triggered).toBe(false)
    })

    it('should use threshold parameter', () => {
      const recentHashes = new Set(['abcdef1234567890'])
      // With threshold 0, only exact match triggers
      const result = checkDuplicateContent('abcdef1234567891', recentHashes, 0)
      expect(result.triggered).toBe(false)

      // With threshold 4, should trigger (close enough)
      const result2 = checkDuplicateContent('abcdef1234567891', recentHashes, 4)
      expect(result2.triggered).toBe(true)
    })

    it('should not trigger for very different hashes at high threshold', () => {
      const recentHashes = new Set(['abcdef1234567890'])
      // Very different hash
      const result = checkDuplicateContent('ffffffffffffffff', recentHashes, 4)
      expect(result.triggered).toBe(false)
    })
  })

  describe('getFirewallRuleStats', () => {
    beforeEach(() => {
      resetFirewallRuleStats()
    })

    it('should return all zero stats initially', () => {
      const stats = getFirewallRuleStats()
      expect(stats.maxLinks).toBe(0)
      expect(stats.blacklistedKeywords).toBe(0)
      expect(stats.blacklistedIPs).toBe(0)
      expect(stats.blacklistedEmailDomains).toBe(0)
      expect(stats.blockedCountries).toBe(0)
      expect(stats.submitTime).toBe(0)
      expect(stats.duplicateContent).toBe(0)
    })

    it('should increment maxLinks count after rule triggers', () => {
      evaluateFirewallRules('http://a.com http://b.com http://c.com', {
        maxLinks: 2,
      })
      const stats = getFirewallRuleStats()
      expect(stats.maxLinks).toBe(1)
    })

    it('should accumulate counts across multiple invocations', () => {
      const content = 'http://a.com http://b.com http://c.com'
      evaluateFirewallRules(content, { maxLinks: 2 })
      evaluateFirewallRules(content, { maxLinks: 2 })
      const stats = getFirewallRuleStats()
      expect(stats.maxLinks).toBe(2)
    })

    it('should track multiple different rule types', () => {
      evaluateFirewallRules('spam content', {
        maxLinks: 5,
        blacklistedKeywords: ['spam'],
      })
      const stats = getFirewallRuleStats()
      expect(stats.blacklistedKeywords).toBe(1)
      expect(stats.maxLinks).toBe(0)
    })

    it('should not increment stats for rules that do not trigger', () => {
      evaluateFirewallRules('clean content', {
        maxLinks: 5,
        blacklistedKeywords: ['spam'],
      })
      const stats = getFirewallRuleStats()
      expect(stats.maxLinks).toBe(0)
      expect(stats.blacklistedKeywords).toBe(0)
    })

    it('should track blacklistedIPs rule stats', () => {
      evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blacklistedIPs: ['192.168.1.100'],
        },
        {
          authorIP: '192.168.1.100',
        },
      )
      const stats = getFirewallRuleStats()
      expect(stats.blacklistedIPs).toBe(1)
    })

    it('should track submitTime rule stats', () => {
      evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          minSubmitTime: 5,
        },
        {
          submitTimeDelta: 2,
        },
      )
      const stats = getFirewallRuleStats()
      expect(stats.submitTime).toBe(1)
    })

    it('should track duplicateContent rule stats', () => {
      const recentHashes = new Set(['abcdef1234567890'])
      evaluateFirewallRules(
        'Some content',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          enableDuplicateDetection: true,
        },
        {
          contentHash: 'abcdef1234567890',
          recentHashes,
        },
      )
      const stats = getFirewallRuleStats()
      expect(stats.duplicateContent).toBe(1)
    })

    it('should track blockedCountries rule stats', () => {
      evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blockedCountries: ['CN'],
        },
        {
          countryCode: 'CN',
        },
      )
      const stats = getFirewallRuleStats()
      expect(stats.blockedCountries).toBe(1)
    })

    it('should track blacklistedEmailDomains rule stats', () => {
      evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blacklistedEmailDomains: ['spam.com'],
        },
        {
          authorEmail: 'user@spam.com',
        },
      )
      const stats = getFirewallRuleStats()
      expect(stats.blacklistedEmailDomains).toBe(1)
    })
  })

  describe('evaluateFirewallRules', () => {
    it('should return not triggered when no rules are violated', () => {
      const result = evaluateFirewallRules(
        'Hello world content',
        {
          maxLinks: 3,
          blacklistedKeywords: ['spam'],
          blacklistedIPs: ['10.0.0.1'],
        },
        {
          authorIP: '192.168.1.1',
          submitTimeDelta: 10,
        },
      )

      expect(result.triggered).toBe(false)
      expect(result.action).toBeNull()
      expect(result.reason).toBe('')
      expect(result.ruleName).toBe('')
    })

    it('should trigger link count rule first', () => {
      const result = evaluateFirewallRules(
        'Visit http://example.com and https://test.org and https://another.com',
        {
          maxLinks: 2,
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.action).toBe('flag')
      expect(result.ruleName).toBe('maxLinks')
      expect(result.reason).toContain('links')
    })

    it('should trigger blacklisted keyword rule when links are ok', () => {
      const result = evaluateFirewallRules('This is spam content', {
        maxLinks: 5,
        blacklistedKeywords: ['spam', 'viagra'],
      })

      expect(result.triggered).toBe(true)
      expect(result.action).toBe('discard')
      expect(result.ruleName).toBe('blacklistedKeywords')
      expect(result.reason).toContain('spam')
    })

    it('should trigger blacklisted IP rule when previous rules pass', () => {
      const result = evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: ['spam'],
          blacklistedIPs: ['192.168.1.100'],
        },
        {
          authorIP: '192.168.1.100',
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.action).toBe('discard')
      expect(result.ruleName).toBe('blacklistedIPs')
      expect(result.reason).toContain('IP address')
    })

    it('should skip IP check when authorIP is not provided', () => {
      const result = evaluateFirewallRules('Hello world', {
        maxLinks: 5,
        blacklistedKeywords: [],
        blacklistedIPs: ['192.168.1.100'],
        // no authorIP in context
      })

      expect(result.triggered).toBe(false)
    })

    it('should trigger blacklisted email domain rule', () => {
      const result = evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blacklistedEmailDomains: ['spam.com'],
        },
        {
          authorEmail: 'user@spam.com',
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.ruleName).toBe('blacklistedEmailDomains')
    })

    it('should skip email check when authorEmail is not provided', () => {
      const result = evaluateFirewallRules('Hello world', {
        maxLinks: 5,
        blacklistedKeywords: [],
        blacklistedEmailDomains: ['spam.com'],
      })

      expect(result.triggered).toBe(false)
    })

    it('should trigger blocked country rule', () => {
      const result = evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blockedCountries: ['CN'],
        },
        {
          countryCode: 'CN',
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.ruleName).toBe('blockedCountries')
    })

    it('should skip country check when countryCode is not provided', () => {
      const result = evaluateFirewallRules('Hello world', {
        maxLinks: 5,
        blacklistedKeywords: [],
        blockedCountries: ['CN'],
      })

      expect(result.triggered).toBe(false)
    })

    it('should trigger submit time rule when previous rules pass', () => {
      const result = evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: ['spam'],
          minSubmitTime: 5,
        },
        {
          submitTimeDelta: 2,
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.action).toBe('discard')
      expect(result.ruleName).toBe('submitTime')
      expect(result.reason).toContain('submitted too quickly')
    })

    it('should skip submit time check when submitTimeDelta is not provided', () => {
      const result = evaluateFirewallRules('Hello world', {
        maxLinks: 5,
        blacklistedKeywords: [],
        minSubmitTime: 5,
      })

      expect(result.triggered).toBe(false)
    })

    it('should trigger duplicate content rule when previous rules pass', () => {
      const recentHashes = new Set(['abcdef1234567890', '1234567890abcdef'])
      const result = evaluateFirewallRules(
        'Some content',
        {
          maxLinks: 5,
          blacklistedKeywords: ['spam'],
          enableDuplicateDetection: true,
        },
        {
          contentHash: 'abcdef1234567890',
          recentHashes: recentHashes,
        },
      )

      expect(result.triggered).toBe(true)
      expect(result.action).toBe('flag')
      expect(result.ruleName).toBe('duplicateContent')
      expect(result.reason).toBe('Duplicate content detected')
    })

    it('should skip duplicate detection when disabled', () => {
      const recentHashes = new Set(['abcdef1234567890'])
      const result = evaluateFirewallRules(
        'Some content',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          enableDuplicateDetection: false,
        },
        {
          contentHash: 'abcdef1234567890',
          recentHashes,
        },
      )

      expect(result.triggered).toBe(false)
    })

    it('should skip duplicate detection when contentHash missing', () => {
      const recentHashes = new Set(['abcdef1234567890'])
      const result = evaluateFirewallRules(
        'Some content',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          enableDuplicateDetection: true,
        },
        {
          recentHashes,
        },
      )

      expect(result.triggered).toBe(false)
    })

    it('should use globalAction when set for link violation', () => {
      const result = evaluateFirewallRules(
        'Visit http://example.com and https://test.org',
        { maxLinks: 1, globalAction: 'spam' },
      )
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('spam')
      expect(result.ruleName).toBe('maxLinks')
    })

    it('should use per-rule action override over globalAction', () => {
      const result = evaluateFirewallRules(
        'Visit http://example.com and https://test.org',
        {
          maxLinks: 1,
          globalAction: 'flag',
          ruleActions: { maxLinks: 'discard' },
        },
      )
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('discard')
    })

    it('should use default action when neither globalAction nor ruleActions is set', () => {
      const result = evaluateFirewallRules(
        'Visit http://example.com and https://test.org',
        { maxLinks: 1 },
      )
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('flag')
    })

    it('should apply globalAction to keyword violations', () => {
      const result = evaluateFirewallRules('This is spam content', {
        maxLinks: 5,
        blacklistedKeywords: ['spam'],
        globalAction: 'flag',
      })
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('flag')
      expect(result.ruleName).toBe('blacklistedKeywords')
    })

    it('should apply per-rule action for keyword violations', () => {
      const result = evaluateFirewallRules('This is spam content', {
        maxLinks: 5,
        blacklistedKeywords: ['spam'],
        globalAction: 'flag',
        ruleActions: { blacklistedKeywords: 'spam' },
      })
      expect(result.triggered).toBe(true)
      expect(result.action).toBe('spam')
      expect(result.ruleName).toBe('blacklistedKeywords')
    })

    it('should match IP with CIDR notation in evaluateFirewallRules', () => {
      const result = evaluateFirewallRules(
        'Hello world',
        {
          maxLinks: 5,
          blacklistedKeywords: [],
          blacklistedIPs: ['10.0.0.0/8'],
        },
        {
          authorIP: '10.1.2.3',
        },
      )
      expect(result.triggered).toBe(true)
      expect(result.ruleName).toBe('blacklistedIPs')
    })
  })

  describe('getDefaultFirewallOptions', () => {
    it('should return reasonable defaults', () => {
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
      expect(defaults.globalAction).toBeUndefined()
    })

    it('should return a new object each call', () => {
      const defaults1 = getDefaultFirewallOptions()
      const defaults2 = getDefaultFirewallOptions()
      defaults1.maxLinks = 10
      expect(defaults2.maxLinks).toBe(3)
    })
  })
})
