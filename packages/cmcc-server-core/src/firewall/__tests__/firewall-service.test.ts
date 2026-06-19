/**
 * Unit tests for CMCC FirewallService (server-core)
 */

import {
  FirewallService,
  getDefaultFirewallConfig,
} from '../../firewall/firewall-service'
import type { FirewallStorageAdapter } from '../../firewall/firewall-service'

describe('getDefaultFirewallConfig()', () => {
  it('returns sensible defaults', () => {
    const cfg = getDefaultFirewallConfig()
    expect(cfg.maxLinks).toBe(5)
    expect(cfg.globalAction).toBe('flag')
    expect(cfg.enableDuplicateDetection).toBe(true)
  })
})

describe('FirewallService', () => {
  let service: FirewallService
  let mockStorage: jest.Mocked<FirewallStorageAdapter>

  beforeEach(() => {
    mockStorage = {
      getRecentHashes: jest.fn().mockResolvedValue(new Set<string>()),
      storeContentHash: jest.fn().mockResolvedValue(undefined),
      getFailedEvaluations: jest.fn().mockResolvedValue([]),
    }
    service = new FirewallService({}, mockStorage)
  })

  it('evaluates clean content without triggering', async () => {
    const result = await service.evaluateContent({
      content: 'This is a perfectly normal comment',
      authorIP: '192.168.1.1',
      submitTimeDelta: 30,
    })
    expect(result.triggered).toBe(false)
    expect(result.action).toBeNull()
    expect(result.evaluatedAt).toBeDefined()
  })

  it('triggers on content with too many links', async () => {
    // Create service with maxLinks=3 so 4 URLs trigger
    const linkService = new FirewallService({ maxLinks: 3 }, mockStorage)
    const result = await linkService.evaluateContent({
      content:
        'A: https://a.com B: https://b.com C: https://c.com D: https://d.com',
    })
    expect(result.triggered).toBe(true)
    expect(result.reason).toContain('4 links')
  })

  it('updates config at runtime', () => {
    service.updateConfig({ maxLinks: 10, globalAction: 'spam' })
    const cfg = service.getConfig()
    expect(cfg.maxLinks).toBe(10)
    expect(cfg.globalAction).toBe('spam')
  })

  it('returns stats', () => {
    const stats = service.getStats()
    expect(stats).toBeDefined()
  })

  it('resets stats', () => {
    service.resetStats()
    const stats = service.getStats()
    expect(stats['maxLinks']).toBe(0)
  })
})
