/**
 * Sync Receiver — Unit Tests
 */
import type { SyncPayload } from '../sync-receiver';
import { SyncReceiver } from '../sync-receiver'

describe('SyncReceiver', () => {
  let receiver: SyncReceiver
  const mockOnFirewallSync = jest.fn()
  const mockOnSettingsSync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    receiver = new SyncReceiver()
  })

  describe('receiveSync', () => {
    it('accepts a valid sync payload with firewall rules', async () => {
      const payload: SyncPayload = {
        firewall_rules: {
          max_links: 3,
          blacklisted_keywords: 'spam\nbad',
          blacklisted_email_domains: 'spam.com',
          min_submit_time: 5,
          enable_duplicate_detection: true,
          duplicate_lookback_days: 7,
          global_action: 'flag',
        },
        auto_moderation: { spam_score_flag_threshold: 60 },
        timestamp: new Date().toISOString(),
        source: 'https://wordpress.example.com',
      }

      const result = await receiver.receiveSync(payload)

      expect(result.success).toBe(true)
      expect(result.platform).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })

    it('fires registered callback on firewall rules sync', async () => {
      receiver.onFirewallSync(mockOnFirewallSync)

      const payload: SyncPayload = {
        firewall_rules: { max_links: 5 },
        auto_moderation: {},
        timestamp: new Date().toISOString(),
        source: 'https://wordpress.example.com',
      }

      await receiver.receiveSync(payload)

      expect(mockOnFirewallSync).toHaveBeenCalledWith(payload.firewall_rules)
    })

    it('fires registered callback on settings sync', async () => {
      receiver.onSettingsSync(mockOnSettingsSync)

      const payload: SyncPayload = {
        firewall_rules: {},
        auto_moderation: { spam_score_flag_threshold: 80, learning_mode: true },
        timestamp: new Date().toISOString(),
        source: 'https://wordpress.example.com',
      }

      await receiver.receiveSync(payload)

      expect(mockOnSettingsSync).toHaveBeenCalledWith(payload.auto_moderation)
    })

    it('validates required fields in the payload', async () => {
      const result = await receiver.receiveSync({} as SyncPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('handles multiple callbacks in sequence', async () => {
      const fn1 = jest.fn()
      const fn2 = jest.fn()
      receiver.onFirewallSync(fn1)
      receiver.onFirewallSync(fn2)

      await receiver.receiveSync({
        firewall_rules: { max_links: 3 },
        auto_moderation: {},
        timestamp: new Date().toISOString(),
        source: 'https://example.com',
      })

      expect(fn1).toHaveBeenCalled()
      expect(fn2).toHaveBeenCalled()
    })

    it('tracks the synced version hash', async () => {
      const payload: SyncPayload = {
        firewall_rules: { max_links: 3 },
        auto_moderation: {},
        timestamp: new Date().toISOString(),
        source: 'https://example.com',
      }

      const result = await receiver.receiveSync(payload)

      expect(result.rulesVersion).toBeDefined()
      expect(typeof result.rulesVersion).toBe('string')
    })
  })

  describe('validatePayload', () => {
    it('returns errors for missing firewall_rules', () => {
      const errors = (receiver as any).validatePayload({ timestamp: '', source: '' })
      expect(errors.length).toBeGreaterThan(0)
    })

    it('returns errors for missing auto_moderation', () => {
      const errors = (receiver as any).validatePayload({ firewall_rules: {}, timestamp: '', source: '' })
      expect(errors.length).toBeGreaterThan(0)
    })

    it('returns errors for missing timestamp', () => {
      const errors = (receiver as any).validatePayload({
        firewall_rules: {}, auto_moderation: {}, source: '',
      })
      expect(errors.length).toBeGreaterThan(0)
    })

    it('returns no errors for valid payload', () => {
      const errors = (receiver as any).validatePayload({
        firewall_rules: { max_links: 5 },
        auto_moderation: {},
        timestamp: new Date().toISOString(),
        source: 'https://example.com',
      })
      expect(errors.length).toBe(0)
    })
  })
})
