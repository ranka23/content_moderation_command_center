/**
 * CMCC SLA & Escalation Module
 *
 * Provides types and utilities for SLA/deadline tracking and escalation
 * workflows. Supports configurable response time targets, auto-escalation
 * for items exceeding thresholds or going unreviewed for too long.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// SLA Configuration
// --------------------------------------------------------------------------

/**
 * SLA target for moderation response times.
 */
export interface SlaTarget {
  /** Content type this SLA applies to */
  contentType: string
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'critical'
  /** Maximum response time in hours */
  maxResponseTimeHours: number
  /** Whether to send reminder notifications */
  sendReminders: boolean
  /** Reminder frequency in hours (before SLA breach) */
  reminderFrequencyHours: number
  /** Auto-escalate to senior moderator on breach */
  autoEscalate: boolean
}

/**
 * Full SLA configuration.
 */
export interface SlaConfig {
  /** Whether SLA tracking is enabled */
  enabled: boolean
  /** List of SLA targets */
  targets: SlaTarget[]
  /** Default SLA for content types not explicitly configured */
  defaultMaxResponseTimeHours: number
  /** Business hours only tracking */
  businessHoursOnly: boolean
  /** Business hours start (0-23) */
  businessHoursStart: number
  /** Business hours end (0-23) */
  businessHoursEnd: number
  /** Business days (0=Sunday, 6=Saturday) */
  businessDays: number[]
}

// --------------------------------------------------------------------------
// Escalation
// --------------------------------------------------------------------------

/**
 * An escalation event for a queue item.
 */
export interface EscalationEvent {
  /** Unique event ID */
  id: string
  /** The queue item being escalated */
  itemId: string
  /** Item title */
  itemTitle: string
  /** Reason for escalation */
  reason: string
  /** Escalation level */
  level: 'warning' | 'breach' | 'critical'
  /** Previous assignee (if any) */
  previousAssigneeId?: string | number
  /** New assignee after escalation */
  escalatedToId?: string | number
  /** Who triggered the escalation */
  triggeredBy: 'system' | 'moderator' | 'auto'
  /** When the escalation occurred */
  timestamp: string
  /** Whether the escalation has been resolved */
  resolved: boolean
  /** When the escalation was resolved */
  resolvedAt?: string
  /** Resolution notes */
  resolutionNotes?: string
}

// --------------------------------------------------------------------------
// Escalation Rules
// --------------------------------------------------------------------------

/**
 * Rules for auto-escalation of queue items.
 */
export interface EscalationRule {
  /** Rule name */
  name: string
  /** Condition type */
  condition:
    | 'spam_score'
    | 'unreviewed_time'
    | 'author_reputation'
    | 'keyword_match'
  /** Operator for comparison */
  operator: '>' | '<' | '>=' | '<=' | '==' | 'contains'
  /** Threshold value */
  threshold: number | string
  /** Escalation level on trigger */
  escalateToLevel: 'warning' | 'breach' | 'critical'
  /** Assignee to escalate to */
  assignTo?: string | number
  /** Whether the rule is active */
  active: boolean
}

/**
 * Default SLA configuration.
 */
export function getDefaultSlaConfig(): SlaConfig {
  return {
    enabled: false,
    targets: [],
    defaultMaxResponseTimeHours: 24,
    businessHoursOnly: true,
    businessHoursStart: 9,
    businessHoursEnd: 17,
    businessDays: [1, 2, 3, 4, 5], // Monday to Friday
  }
}

/**
 * Default escalation rules.
 */
export function getDefaultEscalationRules(): EscalationRule[] {
  return [
    {
      name: 'High spam score auto-escalation',
      condition: 'spam_score',
      operator: '>',
      threshold: 80,
      escalateToLevel: 'critical',
      active: true,
    },
    {
      name: 'Unreviewed for 24 hours',
      condition: 'unreviewed_time',
      operator: '>=',
      threshold: 24,
      escalateToLevel: 'warning',
      active: true,
    },
    {
      name: 'Unreviewed for 72 hours',
      condition: 'unreviewed_time',
      operator: '>=',
      threshold: 72,
      escalateToLevel: 'critical',
      active: true,
    },
    {
      name: 'Known bad actor',
      condition: 'author_reputation',
      operator: '<',
      threshold: -20,
      escalateToLevel: 'breach',
      active: true,
    },
  ]
}

// --------------------------------------------------------------------------
// SLA Engine
// --------------------------------------------------------------------------

/**
 * Runtime engine for SLA deadline tracking.
 * Evaluates whether items are within their response-time targets,
 * accounting for business-hours-only tracking when configured.
 */
export class SlaEngine {
  constructor(private readonly config: SlaConfig) {}

  /**
   * Check an item's SLA status based on its creation time and target.
   */
  checkSla(
    itemCreatedAt: string,
    slaTarget: SlaTarget,
  ): { withinSla: boolean; remainingMinutes: number; isBreached: boolean } {
    const createdDate = new Date(itemCreatedAt)
    const now = new Date()

    const totalMinutesNeeded = slaTarget.maxResponseTimeHours * 60

    if (!this.config.businessHoursOnly) {
      const deadline = new Date(
        createdDate.getTime() + totalMinutesNeeded * 60 * 1000,
      )
      const remainingMs = deadline.getTime() - now.getTime()
      const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000))
      const isBreached = now > deadline
      return { withinSla: !isBreached, remainingMinutes, isBreached }
    }

    // Business-hours-only calculation
    const elapsedBusinessMinutes = this.countBusinessMinutes(createdDate, now)
    const isBreached = elapsedBusinessMinutes >= totalMinutesNeeded
    const remainingMinutes = Math.max(
      0,
      totalMinutesNeeded - elapsedBusinessMinutes,
    )

    return { withinSla: !isBreached, remainingMinutes, isBreached }
  }

  /**
   * Count the number of business minutes between two dates.
   * Only counts minutes that fall within configured business hours and business days.
   */
  private countBusinessMinutes(from: Date, to: Date): number {
    if (from >= to) return 0

    const businessMinutesPerDay =
      (this.config.businessHoursEnd - this.config.businessHoursStart) * 60
    if (businessMinutesPerDay <= 0) return 0

    let totalMinutes = 0
    const current = new Date(from)

    while (current < to) {
      const dayOfWeek = current.getDay()

      if (this.config.businessDays.includes(dayOfWeek)) {
        const currentMinutes = current.getHours() * 60 + current.getMinutes()
        const bizStartMinutes = this.config.businessHoursStart * 60
        const bizEndMinutes = this.config.businessHoursEnd * 60

        // Determine the effective business window for this day
        const dayStart = Math.max(currentMinutes, bizStartMinutes)

        let dayEnd = bizEndMinutes
        if (this.isSameDay(current, to)) {
          const endMinutes = to.getHours() * 60 + to.getMinutes()
          dayEnd = Math.min(endMinutes, bizEndMinutes)
        }

        if (dayEnd > dayStart) {
          totalMinutes += dayEnd - dayStart
        }
      }

      // Advance to the start of the next day
      current.setDate(current.getDate() + 1)
      current.setHours(0, 0, 0, 0)
    }

    return totalMinutes
  }

  /** Check if two dates fall on the same calendar day. */
  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }
}

// --------------------------------------------------------------------------
// Escalation Manager
// --------------------------------------------------------------------------

/**
 * Runtime engine for evaluating escalation rules against queue items
 * and tracking active/resolved escalation events.
 */
export class EscalationManager {
  private readonly escalations: Map<string, EscalationEvent> = new Map()
  private idCounter = 0

  constructor(
    private readonly config: SlaConfig,
    private readonly rules: EscalationRule[],
  ) {}

  /**
   * Evaluate an item against all active escalation rules.
   * Returns the first matching escalation event, or null if no rule triggers.
   * If the SLA config has tracking disabled, returns null immediately.
   */
  evaluateItem(item: {
    id: string
    spamScore?: number
    unreviewedMinutes?: number
    authorReputation?: number
    content?: string
  }): EscalationEvent | null {
    if (!this.config.enabled) return null

    for (const rule of this.rules) {
      if (!rule.active) continue

      const matches = this.matchesRule(item, rule)
      if (!matches) continue

      const event: EscalationEvent = {
        id: this.generateId(),
        itemId: item.id,
        itemTitle: '',
        reason: rule.name,
        level: rule.escalateToLevel,
        ...(rule.assignTo !== undefined
          ? { escalatedToId: rule.assignTo }
          : {}),
        triggeredBy: 'auto',
        timestamp: new Date().toISOString(),
        resolved: false,
      }

      this.escalations.set(event.id, event)
      return event
    }

    return null
  }

  /**
   * Return all unresolved escalation events.
   */
  getActiveEscalations(): EscalationEvent[] {
    const result: EscalationEvent[] = []
    for (const event of this.escalations.values()) {
      if (!event.resolved) {
        result.push(event)
      }
    }
    return result
  }

  /**
   * Resolve an escalation event by ID.
   * Returns true if the event was found and resolved.
   */
  resolveEscalation(id: string, notes?: string): boolean {
    const event = this.escalations.get(id)
    if (!event || event.resolved) return false

    event.resolved = true
    event.resolvedAt = new Date().toISOString()
    if (notes !== undefined) {
      event.resolutionNotes = notes
    }

    return true
  }

  /**
   * Check whether a single rule matches against an item's data.
   */
  private matchesRule(
    item: {
      id: string
      spamScore?: number
      unreviewedMinutes?: number
      authorReputation?: number
      content?: string
    },
    rule: EscalationRule,
  ): boolean {
    let itemValue: number | string | undefined

    switch (rule.condition) {
      case 'spam_score':
        itemValue = item.spamScore
        break
      case 'unreviewed_time':
        itemValue = item.unreviewedMinutes
        break
      case 'author_reputation':
        itemValue = item.authorReputation
        break
      case 'keyword_match':
        itemValue = item.content
        break
    }

    if (itemValue === undefined) return false
    return this.evaluateCondition(itemValue, rule.operator, rule.threshold)
  }

  /**
   * Evaluate a value against an operator/threshold pair.
   */
  private evaluateCondition(
    value: number | string,
    operator: EscalationRule['operator'],
    threshold: number | string,
  ): boolean {
    if (operator === 'contains') {
      if (typeof value !== 'string' || typeof threshold !== 'string')
        return false
      return value.toLowerCase().includes(threshold.toLowerCase())
    }

    // Numeric comparisons
    if (typeof value !== 'number' || typeof threshold !== 'number') return false

    switch (operator) {
      case '>':
        return value > threshold
      case '<':
        return value < threshold
      case '>=':
        return value >= threshold
      case '<=':
        return value <= threshold
      case '==':
        return value === threshold
    }
  }

  /** Generate a unique escalation event ID. */
  private generateId(): string {
    this.idCounter++
    return `esc_${Date.now()}_${this.idCounter}`
  }
}
