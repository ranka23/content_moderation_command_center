/**
 * WebSocket Service — Unit Tests
 */
import type { ActivityEvent } from '../websocket-service'
import { WebSocketEventBus } from '../websocket-service'

describe('WebSocketEventBus', () => {
  let eventBus: WebSocketEventBus

  beforeEach(() => {
    eventBus = new WebSocketEventBus()
  })

  describe('publish / subscribe', () => {
    it('publishes events to subscribers', () => {
      const handler = jest.fn()
      eventBus.subscribe(handler)

      const event: ActivityEvent = {
        type: 'action',
        actorId: 'mod-1',
        actorName: 'Admin',
        description: 'Approved item "Test Comment"',
        itemId: 'item-1',
        itemTitle: 'Test Comment',
        timestamp: new Date().toISOString(),
      }

      eventBus.publish(event)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action',
          actorId: 'mod-1',
          actorName: 'Admin',
          description: 'Approved item "Test Comment"',
          itemId: 'item-1',
          itemTitle: 'Test Comment',
        }),
      )
    })

    it('supports multiple subscribers', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      eventBus.subscribe(handler1)
      eventBus.subscribe(handler2)

      eventBus.publish({
        type: 'note',
        actorId: 'mod-2',
        actorName: 'Jane',
        description: 'Added a note',
        timestamp: new Date().toISOString(),
      })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('unsubscribes handlers correctly', () => {
      const handler = jest.fn()
      const unsub = eventBus.subscribe(handler)

      unsub()

      eventBus.publish({
        type: 'action',
        actorId: 'mod-1',
        actorName: 'Admin',
        description: 'Test',
        timestamp: new Date().toISOString(),
      })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('publish with event types', () => {
    it('publishes action events', () => {
      const handler = jest.fn()
      eventBus.subscribe(handler)

      eventBus.publishAction(
        'mod-1',
        'Admin',
        'Approved item "Spam comment"',
        'item-1',
        'Spam comment',
      )
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'action', actorId: 'mod-1' }),
      )
    })

    it('publishes note events', () => {
      const handler = jest.fn()
      eventBus.subscribe(handler)

      eventBus.publishNote('mod-2', 'Jane', 'Added internal note', 'item-2')
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'note', itemId: 'item-2' }),
      )
    })

    it('publishes assignment events', () => {
      const handler = jest.fn()
      eventBus.subscribe(handler)

      eventBus.publishAssignment(
        'mod-1',
        'Admin',
        'Assigned item to mod-2',
        'item-3',
      )
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'assignment', itemId: 'item-3' }),
      )
    })

    it('publishes escalation events', () => {
      const handler = jest.fn()
      eventBus.subscribe(handler)

      eventBus.publishEscalation(
        'system',
        'System',
        'Item escalated: spam score > 80',
        'item-4',
      )
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'escalation', itemId: 'item-4' }),
      )
    })
  })

  describe('getRecentEvents', () => {
    it('returns an empty array when no events have been published', () => {
      expect(eventBus.getRecentEvents()).toEqual([])
    })

    it('returns the most recent events up to the limit', () => {
      for (let i = 0; i < 30; i++) {
        eventBus.publish({
          type: 'action',
          actorId: 'mod-1',
          actorName: 'Admin',
          description: `Action ${i}`,
          timestamp: new Date().toISOString(),
        })
      }

      const events = eventBus.getRecentEvents(10)
      expect(events).toHaveLength(10)
    })

    it('limits events to a maximum of 200', () => {
      for (let i = 0; i < 250; i++) {
        eventBus.publish({
          type: 'action',
          actorId: 'mod-1',
          actorName: 'Admin',
          description: `Action ${i}`,
          timestamp: new Date().toISOString(),
        })
      }

      const events = eventBus.getRecentEvents(500)
      expect(events).toHaveLength(200)
    })
  })
})
