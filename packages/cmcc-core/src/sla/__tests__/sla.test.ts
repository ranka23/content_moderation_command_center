/**
 * Unit tests for CMCC SLA & Escalation module
 */

import {
  SlaEngine,
  EscalationManager,
  getDefaultSlaConfig,
  getDefaultEscalationRules,
} from '../index'
import type { SlaTarget, SlaConfig, EscalationRule } from '../index'

describe('getDefaultSlaConfig()', () => {
  it('returns disabled config with sensible defaults', () => {
    const cfg = getDefaultSlaConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.defaultMaxResponseTimeHours).toBe(24)
    expect(cfg.businessDays).toEqual([1, 2, 3, 4, 5])
    expect(cfg.businessHoursStart).toBe(9)
    expect(cfg.businessHoursEnd).toBe(17)
  })
})

describe('getDefaultEscalationRules()', () => {
  it('returns 4 predefined rules', () => {
    const rules = getDefaultEscalationRules()
    expect(rules).toHaveLength(4)
    expect(rules[0]?.name).toContain('spam')
    expect(rules[1]?.name).toContain('24 hours')
  })
})

describe('SlaEngine', () => {
  const config: SlaConfig = {
    enabled: true,
    targets: [],
    defaultMaxResponseTimeHours: 24,
    businessHoursOnly: false,
    businessHoursStart: 9,
    businessHoursEnd: 17,
    businessDays: [1, 2, 3, 4, 5],
  }

  const slaTarget: SlaTarget = {
    contentType: 'comment',
    priority: 'normal',
    maxResponseTimeHours: 2,
    sendReminders: false,
    reminderFrequencyHours: 1,
    autoEscalate: true,
  }

  it('reports within SLA when just created', () => {
    const engine = new SlaEngine(config)
    const result = engine.checkSla(new Date().toISOString(), slaTarget)
    expect(result.withinSla).toBe(true)
    expect(result.isBreached).toBe(false)
    expect(result.remainingMinutes).toBeGreaterThan(0)
  })

  it('reports breached SLA when past deadline', () => {
    const engine = new SlaEngine(config)
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
    const result = engine.checkSla(past, slaTarget)
    expect(result.withinSla).toBe(false)
    expect(result.isBreached).toBe(true)
  })

  it('counts business hours when businessHoursOnly is true', () => {
    const bizConfig: SlaConfig = {
      ...config,
      businessHoursOnly: true,
      businessHoursStart: 9,
      businessHoursEnd: 17,
    }
    const engine = new SlaEngine(bizConfig)

    // Created just now - should not be breached since no time has elapsed
    const createdAt = new Date()
    const result = engine.checkSla(createdAt.toISOString(), slaTarget)
    expect(result.withinSla).toBe(true)
    expect(result.isBreached).toBe(false)
  })
})

describe('EscalationManager', () => {
  const config: SlaConfig = { ...getDefaultSlaConfig(), enabled: true }
  const rules: EscalationRule[] = [
    {
      name: 'High spam score',
      condition: 'spam_score',
      operator: '>',
      threshold: 80,
      escalateToLevel: 'critical',
      active: true,
    },
    {
      name: 'Over 24h unreviewed',
      condition: 'unreviewed_time',
      operator: '>=',
      threshold: 24,
      escalateToLevel: 'warning',
      active: true,
    },
  ]

  it('evaluates an item and returns escalation when rule matches', () => {
    const manager = new EscalationManager(config, rules)
    const event = manager.evaluateItem({
      id: 'item-1',
      spamScore: 95,
    })
    expect(event).not.toBeNull()
    expect(event!.level).toBe('critical')
    expect(event!.itemId).toBe('item-1')
  })

  it('returns null when no rule matches', () => {
    const manager = new EscalationManager(config, rules)
    const event = manager.evaluateItem({
      id: 'item-2',
      spamScore: 10,
      unreviewedMinutes: 5,
    })
    expect(event).toBeNull()
  })

  it('returns null when SLA tracking is disabled', () => {
    const disabledConfig = { ...config, enabled: false }
    const manager = new EscalationManager(disabledConfig, rules)
    const event = manager.evaluateItem({
      id: 'item-3',
      spamScore: 95,
    })
    expect(event).toBeNull()
  })

  it('tracks active escalations', () => {
    const manager = new EscalationManager(config, rules)
    manager.evaluateItem({ id: 'item-1', spamScore: 95 })
    expect(manager.getActiveEscalations()).toHaveLength(1)
  })

  it('resolves an escalation', () => {
    const manager = new EscalationManager(config, rules)
    const event = manager.evaluateItem({ id: 'item-1', spamScore: 95 })
    const resolved = manager.resolveEscalation(event!.id, 'Reviewed')
    expect(resolved).toBe(true)
    expect(manager.getActiveEscalations()).toHaveLength(0)
  })

  it('handles keyword_match condition', () => {
    const kwRule: EscalationRule = {
      name: 'Keyword match',
      condition: 'keyword_match',
      operator: 'contains',
      threshold: 'urgent',
      escalateToLevel: 'critical',
      active: true,
    }
    const manager = new EscalationManager(config, [kwRule])
    const event = manager.evaluateItem({
      id: 'item-1',
      content: 'This is urgent content',
    })
    expect(event).not.toBeNull()
    expect(event!.level).toBe('critical')
  })
})
