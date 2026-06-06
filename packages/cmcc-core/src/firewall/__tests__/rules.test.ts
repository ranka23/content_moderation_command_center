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
} from '../rules'

describe('Firewall Rule Engine', () => {
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
  })

  describe('checkBlacklistedKeywords', () => {
    it('should not trigger when no keywords match', () => {
      const result = checkBlacklistedKeywords('Hello world', ['spam', 'viagra'])
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
      const result = checkBlacklistedKeywords('This is spammer content', [
        'spam',
        'viagra',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('spam')
    })

    it('should handle case insensitivity', () => {
      const result = checkBlacklistedKeywords('BUY VIAGRA NOW', [
        'spam',
        'viagra',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('viagra')
    })

    it('should handle wildcard prefixes (*keyword)', () => {
      const result = checkBlacklistedKeywords('amazing offer', [
        '*offer',
        'discount',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('*offer')
    })

    it('should handle wildcard suffixes (keyword*)', () => {
      const result = checkBlacklistedKeywords('offer123 special', [
        'offer*',
        'sale*',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('offer*')
    })

    it('should handle wildcards on both sides (*keyword*)', () => {
      const result = checkBlacklistedKeywords('special amazing deal', [
        '*amaz*',
        '*deal*',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedKeyword).toBe('*amaz*')
    })

    it('should ignore empty keywords', () => {
      const result = checkBlacklistedKeywords('Hello world', [
        '',
        '   ',
        'spam',
      ])
      expect(result.triggered).toBe(false)
    })
  })

  describe('checkBlacklistedIP', () => {
    it('should not trigger when IP is not blacklisted', () => {
      const result = checkBlacklistedIP('192.168.1.100', [
        '10.0.0.1',
        '192.168.1.1',
      ])
      expect(result.triggered).toBe(false)
      expect(result.matchedIP).toBeNull()
    })

    it('should trigger when IP is blacklisted', () => {
      const result = checkBlacklistedIP('192.168.1.100', [
        '10.0.0.1',
        '192.168.1.100',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedIP).toBe('192.168.1.100')
    })

    it('should handle empty blacklist', () => {
      const result = checkBlacklistedIP('192.168.1.100', [])
      expect(result.triggered).toBe(false)
    })

    it('should match IP within CIDR range in blacklist', () => {
      const result = checkBlacklistedIP('192.168.1.5', [
        '192.168.1.0/24',
        '10.0.0.1',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedIP).toBe('192.168.1.0/24')
    })

    it('should not match IP outside CIDR range', () => {
      const result = checkBlacklistedIP('10.0.0.5', ['192.168.1.0/24'])
      expect(result.triggered).toBe(false)
      expect(result.matchedIP).toBeNull()
    })

    it('should handle mixed exact IP and CIDR entries', () => {
      const result = checkBlacklistedIP('10.0.0.1', [
        '192.168.1.0/24',
        '10.0.0.1',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedIP).toBe('10.0.0.1')
    })

    it('should match IP in /16 CIDR range', () => {
      const result = checkBlacklistedIP('10.0.5.5', ['10.0.0.0/16'])
      expect(result.triggered).toBe(true)
      expect(result.matchedIP).toBe('10.0.0.0/16')
    })

    it('should not match IP outside /16 CIDR range', () => {
      const result = checkBlacklistedIP('10.1.5.5', ['10.0.0.0/16'])
      expect(result.triggered).toBe(false)
      expect(result.matchedIP).toBeNull()
    })
  })

  describe('isIPInCIDRRange', () => {
    it('should return true for IP within /24 CIDR range', () => {
      expect(isIPInCIDRRange('192.168.1.5', '192.168.1.0/24')).toBe(true)
    })

    it('should return false for IP outside /24 CIDR range', () => {
      expect(isIPInCIDRRange('10.0.0.5', '192.168.1.0/24')).toBe(false)
    })

    it('should handle /32 prefix (single IP)', () => {
      expect(isIPInCIDRRange('192.168.1.1', '192.168.1.1/32')).toBe(true)
      expect(isIPInCIDRRange('192.168.1.2', '192.168.1.1/32')).toBe(false)
    })

    it('should handle /0 prefix (all IPs)', () => {
      expect(isIPInCIDRRange('10.0.0.1', '0.0.0.0/0')).toBe(true)
      expect(isIPInCIDRRange('255.255.255.255', '0.0.0.0/0')).toBe(true)
    })

    it('should handle /16 prefix', () => {
      expect(isIPInCIDRRange('10.0.5.5', '10.0.0.0/16')).toBe(true)
      expect(isIPInCIDRRange('10.1.5.5', '10.0.0.0/16')).toBe(false)
    })

    it('should handle /8 prefix', () => {
      expect(isIPInCIDRRange('10.1.2.3', '10.0.0.0/8')).toBe(true)
      expect(isIPInCIDRRange('11.1.2.3', '10.0.0.0/8')).toBe(false)
    })

    it('should return false for invalid CIDR notation', () => {
      expect(isIPInCIDRRange('192.168.1.5', 'not-cidr')).toBe(false)
      expect(isIPInCIDRRange('192.168.1.5', '192.168.1.0/abc')).toBe(false)
    })
  })

  describe('checkBlacklistedEmailDomain', () => {
    it('should not trigger when email domain is not blacklisted', () => {
      const result = checkBlacklistedEmailDomain('user@example.com', [
        'spam.com',
        'bad.org',
      ])
      expect(result.triggered).toBe(false)
      expect(result.matchedDomain).toBeNull()
    })

    it('should trigger when email domain is blacklisted', () => {
      const result = checkBlacklistedEmailDomain('user@spam.com', [
        'spam.com',
        'bad.org',
      ])
      expect(result.triggered).toBe(true)
      expect(result.matchedDomain).toBe('spam.com')
    })

    it('should handle case insensitivity', () => {
      const result = checkBlacklistedEmailDomain('USER@SPAM.COM', ['spam.com'])
      expect(result.triggered).toBe(true)
      expect(result.matchedDomain).toBe('spam.com')
    })

    it('should handle malformed email addresses', () => {
      const result = checkBlacklistedEmailDomain('invalid-email', ['spam.com'])
      expect(result.triggered).toBe(false)
    })
  })

  describe('checkBlockedCountry', () => {
    it('should not trigger when country is not blocked', () => {
      const result = checkBlockedCountry('US', ['CN', 'RU'])
      expect(result.triggered).toBe(false)
      expect(result.matchedCountry).toBeNull()
    })

    it('should trigger when country is blocked', () => {
      const result = checkBlockedCountry('cn', ['US', 'CN', 'RU'])
      expect(result.triggered).toBe(true)
      expect(result.matchedCountry).toBe('cn')
    })

    it('should handle case insensitivity', () => {
      const result = checkBlockedCountry('Ru', ['US', 'CN', 'ru'])
      expect(result.triggered).toBe(true)
      expect(result.matchedCountry).toBe('Ru')
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
      expect(result.triggered).toBe(false)
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
      // Using hashes that differ by more than 1 bit
      const recentHashes = new Set(['abcdef1234567890'])
      // With threshold 0, only exact match triggers
      const result = checkDuplicateContent('abcdef1234567891', recentHashes, 0)
      expect(result.triggered).toBe(false)

      // With threshold 4, should trigger (close enough)
      const result2 = checkDuplicateContent('abcdef1234567891', recentHashes, 4)
      expect(result2.triggered).toBe(true)
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
  })
})
