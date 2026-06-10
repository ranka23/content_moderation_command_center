/**
 * WebSocketEventBus
 *
 * In-process event bus for real-time activity feed events.
 * Each platform's WebSocket server connects to this bus to
 * broadcast events to all connected clients.
 *
 * Usage:
 *   const bus = new WebSocketEventBus()
 *   bus.subscribe((event) => { ws.send(JSON.stringify(event)) })
 *   bus.publishAction('mod-1', 'Admin', 'Approved item', 'item-1', 'Test')
 *   bus.publishNote('mod-2', 'Jane', 'Added note', 'item-2')
 */

/**
 * An activity feed event for real-time distribution.
 */
export interface ActivityEvent {
  /** Unique event ID */
  id?: string
  /** Event type */
  type: 'action' | 'note' | 'assignment' | 'escalation' | 'team_change'
  /** Moderator who performed the action */
  actorId: string | number
  /** Display name of the actor */
  actorName: string
  /** Human-readable description */
  description: string
  /** Related queue item ID */
  itemId?: string
  /** Related queue item title */
  itemTitle?: string
  /** ISO timestamp */
  timestamp: string
  /** Optional associated metadata */
  metadata?: Record<string, unknown>
}

export type EventHandler = (event: ActivityEvent) => void

/**
 * In-memory event bus for publishing and subscribing to
 * real-time moderation activity events.
 */
export class WebSocketEventBus {
  private handlers: Set<EventHandler> = new Set()
  private eventHistory: ActivityEvent[] = []
  private maxHistory: number = 200
  private eventIdCounter: number = 0

  /**
   * Subscribe to all activity events.
   * Returns an unsubscribe function.
   */
  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  /**
   * Publish an event to all subscribers.
   */
  publish(event: ActivityEvent): void {
    const enriched: ActivityEvent = {
      ...event,
      id: event.id || `evt_${++this.eventIdCounter}`,
      timestamp: event.timestamp || new Date().toISOString(),
    }

    // Store in history (ring buffer)
    this.eventHistory.unshift(enriched)
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.length = this.maxHistory
    }

    // Notify all subscribers
    for (const handler of this.handlers) {
      try {
        handler(enriched)
      } catch {
        // Subscriber error — silently skip
      }
    }
  }

  /**
   * Convenience: publish an action event.
   */
  publishAction(
    actorId: string | number,
    actorName: string,
    description: string,
    itemId?: string,
    itemTitle?: string,
  ): void {
    this.publish({
      type: 'action',
      actorId,
      actorName,
      description,
      ...(itemId !== undefined ? { itemId } : {}),
      ...(itemTitle !== undefined ? { itemTitle } : {}),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: publish a note event.
   */
  publishNote(
    actorId: string | number,
    actorName: string,
    description: string,
    itemId?: string,
  ): void {
    this.publish({
      type: 'note',
      actorId,
      actorName,
      description,
      ...(itemId !== undefined ? { itemId } : {}),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: publish an assignment event.
   */
  publishAssignment(
    actorId: string | number,
    actorName: string,
    description: string,
    itemId?: string,
  ): void {
    this.publish({
      type: 'assignment',
      actorId,
      actorName,
      description,
      ...(itemId !== undefined ? { itemId } : {}),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: publish an escalation event.
   */
  publishEscalation(
    actorId: string | number,
    actorName: string,
    description: string,
    itemId?: string,
  ): void {
    this.publish({
      type: 'escalation',
      actorId,
      actorName,
      description,
      ...(itemId !== undefined ? { itemId } : {}),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get the most recent events (for initial load / polling fallback).
   *
   * @param limit - Maximum events to return (default: 50)
   */
  getRecentEvents(limit: number = 50): ActivityEvent[] {
    return this.eventHistory.slice(0, limit)
  }

  /**
   * Get the total number of subscribers.
   */
  subscriberCount(): number {
    return this.handlers.size
  }
}
