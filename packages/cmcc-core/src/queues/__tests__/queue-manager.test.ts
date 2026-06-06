import type { QueueItem } from '../../analytics'
import type { FirewallResult } from '../../firewall'
import { QueueManager } from '../index'

function createSampleItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'item-1',
    contentType: 'post',
    originalId: 100,
    status: 'pending',
    spamScore: 0,
    authorId: 'author-1',
    dateGmt: '2026-06-01T00:00:00.000Z',
    title: 'Test Post',
    excerpt: 'Test excerpt',
    ...overrides,
  }
}

function createFirewallResult(
  overrides: Partial<FirewallResult> = {},
): FirewallResult {
  return {
    triggered: false,
    action: null,
    reason: '',
    ruleName: '',
    ...overrides,
  }
}

describe('QueueManager', () => {
  let manager: QueueManager

  beforeEach(() => {
    manager = new QueueManager()
  })

  describe('initial state', () => {
    it('should start with an empty queue', () => {
      expect(manager.getQueue()).toEqual([])
    })

    it('should return zero stats when empty', () => {
      const stats = manager.getQueueStats()
      expect(stats).toEqual({
        pending: 0,
        spam: 0,
        flagged: 0,
        total: 0,
      })
    })

    it('should return undefined on dequeue when empty', () => {
      expect(manager.dequeue()).toBeUndefined()
    })

    it('should return undefined on peek when empty', () => {
      expect(manager.peek()).toBeUndefined()
    })
  })

  describe('enqueue', () => {
    it('should add an item to the queue', () => {
      const item = createSampleItem()
      manager.enqueue(item)
      expect(manager.getQueue()).toHaveLength(1)
      expect(manager.getQueue()[0]).toEqual(item)
    })

    it('should add multiple items in order', () => {
      const item1 = createSampleItem({ id: 'item-1' })
      const item2 = createSampleItem({ id: 'item-2' })
      const item3 = createSampleItem({ id: 'item-3' })

      manager.enqueue(item1)
      manager.enqueue(item2)
      manager.enqueue(item3)

      const queue = manager.getQueue()
      expect(queue).toHaveLength(3)
      expect(queue[0]?.id).toBe('item-1')
      expect(queue[1]?.id).toBe('item-2')
      expect(queue[2]?.id).toBe('item-3')
    })
  })

  describe('dequeue', () => {
    it('should remove and return the first item', () => {
      const item1 = createSampleItem({ id: 'item-1' })
      const item2 = createSampleItem({ id: 'item-2' })
      manager.enqueue(item1)
      manager.enqueue(item2)

      const dequeued = manager.dequeue()
      expect(dequeued).toEqual(item1)
      expect(manager.getQueue()).toHaveLength(1)
      expect(manager.getQueue()[0]?.id).toBe('item-2')
    })

    it('should return undefined when queue is empty', () => {
      expect(manager.dequeue()).toBeUndefined()
    })
  })

  describe('peek', () => {
    it('should return the first item without removing it', () => {
      const item1 = createSampleItem({ id: 'item-1' })
      const item2 = createSampleItem({ id: 'item-2' })
      manager.enqueue(item1)
      manager.enqueue(item2)

      const peeked = manager.peek()
      expect(peeked).toEqual(item1)
      expect(manager.getQueue()).toHaveLength(2)
    })

    it('should return undefined when queue is empty', () => {
      expect(manager.peek()).toBeUndefined()
    })
  })

  describe('updateStatus', () => {
    it('should update the status of an existing item', () => {
      const item = createSampleItem({ id: 'item-1', status: 'pending' })
      manager.enqueue(item)

      const result = manager.updateStatus('item-1', 'spam')
      expect(result).toBe(true)
      expect(manager.getQueue()[0]?.status).toBe('spam')
    })

    it('should return false for a non-existent item', () => {
      const result = manager.updateStatus('non-existent', 'flagged')
      expect(result).toBe(false)
    })

    it('should update status to flagged', () => {
      const item = createSampleItem({ id: 'item-1', status: 'pending' })
      manager.enqueue(item)

      manager.updateStatus('item-1', 'flagged')
      expect(manager.getQueue()[0]?.status).toBe('flagged')
    })
  })

  describe('remove', () => {
    it('should remove an item by id', () => {
      const item1 = createSampleItem({ id: 'item-1' })
      const item2 = createSampleItem({ id: 'item-2' })
      const item3 = createSampleItem({ id: 'item-3' })
      manager.enqueue(item1)
      manager.enqueue(item2)
      manager.enqueue(item3)

      const result = manager.remove('item-2')
      expect(result).toBe(true)
      expect(manager.getQueue()).toHaveLength(2)
      expect(manager.getQueue().map((i) => i.id)).toEqual(['item-1', 'item-3'])
    })

    it('should return false when item is not found', () => {
      manager.enqueue(createSampleItem({ id: 'item-1' }))
      const result = manager.remove('non-existent')
      expect(result).toBe(false)
      expect(manager.getQueue()).toHaveLength(1)
    })

    it('should return false when queue is empty', () => {
      const result = manager.remove('anything')
      expect(result).toBe(false)
    })
  })

  describe('getQueue', () => {
    it('should return all items when no status filter', () => {
      const item1 = createSampleItem({ id: 'item-1', status: 'pending' })
      const item2 = createSampleItem({ id: 'item-2', status: 'spam' })
      const item3 = createSampleItem({ id: 'item-3', status: 'flagged' })
      manager.enqueue(item1)
      manager.enqueue(item2)
      manager.enqueue(item3)

      expect(manager.getQueue()).toHaveLength(3)
    })

    it('should filter by status', () => {
      const item1 = createSampleItem({ id: 'item-1', status: 'pending' })
      const item2 = createSampleItem({ id: 'item-2', status: 'spam' })
      const item3 = createSampleItem({ id: 'item-3', status: 'pending' })
      manager.enqueue(item1)
      manager.enqueue(item2)
      manager.enqueue(item3)

      const pendingItems = manager.getQueue('pending')
      expect(pendingItems).toHaveLength(2)
      expect(pendingItems.every((i) => i.status === 'pending')).toBe(true)
    })

    it('should return an empty array when no items match the filter', () => {
      manager.enqueue(createSampleItem({ id: 'item-1', status: 'pending' }))
      expect(manager.getQueue('spam')).toEqual([])
    })

    it('should return a shallow copy to prevent external mutation', () => {
      const item = createSampleItem({ id: 'item-1' })
      manager.enqueue(item)

      const queue = manager.getQueue()
      queue.push(createSampleItem({ id: 'injected' }))
      expect(manager.getQueue()).toHaveLength(1)
    })
  })

  describe('getQueueStats', () => {
    it('should return correct counts by status', () => {
      manager.enqueue(createSampleItem({ id: 'item-1', status: 'pending' }))
      manager.enqueue(createSampleItem({ id: 'item-2', status: 'spam' }))
      manager.enqueue(createSampleItem({ id: 'item-3', status: 'flagged' }))
      manager.enqueue(createSampleItem({ id: 'item-4', status: 'pending' }))
      manager.enqueue(createSampleItem({ id: 'item-5', status: 'spam' }))

      const stats = manager.getQueueStats()
      expect(stats).toEqual({
        pending: 2,
        spam: 2,
        flagged: 1,
        total: 5,
      })
    })

    it('should return zeros for an empty queue', () => {
      const stats = manager.getQueueStats()
      expect(stats).toEqual({
        pending: 0,
        spam: 0,
        flagged: 0,
        total: 0,
      })
    })
  })

  describe('processNext', () => {
    it('should dequeue an item and pass it to the callback', () => {
      const item = createSampleItem({ id: 'item-1', title: 'Process Me' })
      manager.enqueue(item)

      const result = manager.processNext((queuedItem: QueueItem): string => {
        return `Processed: ${queuedItem.title}`
      })

      expect(result).toBe('Processed: Process Me')
      expect(manager.getQueue()).toHaveLength(0)
    })

    it('should return undefined when queue is empty', () => {
      const result = manager.processNext(
        (item: QueueItem): string => item.title,
      )
      expect(result).toBeUndefined()
    })

    it('should support numeric return values', () => {
      manager.enqueue(createSampleItem({ id: 'item-1', spamScore: 0.85 }))

      const score = manager.processNext(
        (item: QueueItem): number => item.spamScore,
      )
      expect(score).toBe(0.85)
    })
  })

  describe('autoClassify', () => {
    it('should set status to spam when firewall action is spam', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: 'spam',
        reason: 'Contains spam keywords',
        ruleName: 'spam-detection',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.status).toBe('spam')
      expect(classified.id).toBe(item.id)
    })

    it('should set status to flagged when firewall action is flag', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: 'flag',
        reason: 'Suspicious content',
        ruleName: 'suspicious-patterns',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.status).toBe('flagged')
    })

    it('should set status to spam when firewall action is discard', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: 'discard',
        reason: 'Known malicious pattern',
        ruleName: 'malware-block',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.status).toBe('spam')
    })

    it('should keep status as pending when firewall is not triggered', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: false,
        action: null,
        reason: '',
        ruleName: '',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.status).toBe('pending')
    })

    it('should keep status as pending when action is null despite being triggered', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: null,
        reason: 'Matched rule but no action defined',
        ruleName: 'monitoring-rule',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.status).toBe('pending')
    })

    it('should not mutate the original item', () => {
      const item = createSampleItem({ status: 'pending' })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: 'spam',
        reason: 'Test',
        ruleName: 'test-rule',
      })

      manager.autoClassify(item, firewallResult)
      expect(item.status).toBe('pending')
    })

    it('should preserve all other item properties', () => {
      const item = createSampleItem({
        id: 'preserve-test',
        title: 'Original Title',
        spamScore: 0.5,
        contentType: 'comment',
      })
      const firewallResult = createFirewallResult({
        triggered: true,
        action: 'flag',
        reason: 'Test',
        ruleName: 'test-rule',
      })

      const classified = manager.autoClassify(item, firewallResult)
      expect(classified.id).toBe('preserve-test')
      expect(classified.title).toBe('Original Title')
      expect(classified.spamScore).toBe(0.5)
      expect(classified.contentType).toBe('comment')
      expect(classified.authorId).toBe(item.authorId)
      expect(classified.dateGmt).toBe(item.dateGmt)
      expect(classified.excerpt).toBe(item.excerpt)
      expect(classified.originalId).toBe(item.originalId)
    })
  })
})
