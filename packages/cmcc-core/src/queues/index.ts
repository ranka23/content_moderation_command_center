/**
 * CMCC Queue Processing Module
 *
 * Provides in-memory queue management for moderation workflow,
 * including enqueue/dequeue operations, status tracking,
 * stats reporting, and automatic classification based on firewall results.
 */

import type { QueueItem } from '../analytics'
import type { FirewallResult } from '../firewall'

export interface QueueStats {
  pending: number
  spam: number
  flagged: number
  total: number
}

export class QueueManager {
  private queue: QueueItem[] = []

  /**
   * Add an item to the end of the queue.
   */
  enqueue(item: QueueItem): void {
    this.queue.push(item)
  }

  /**
   * Remove and return the first item in the queue.
   * Returns undefined if the queue is empty.
   */
  dequeue(): QueueItem | undefined {
    return this.queue.shift()
  }

  /**
   * Return the first item in the queue without removing it.
   * Returns undefined if the queue is empty.
   */
  peek(): QueueItem | undefined {
    return this.queue[0]
  }

  /**
   * Update the status of a queue item by its ID.
   * Returns true if the item was found and updated, false otherwise.
   */
  updateStatus(id: string, newStatus: QueueItem['status']): boolean {
    const item = this.queue.find((i) => i.id === id)
    if (!item) {
      return false
    }
    item.status = newStatus
    return true
  }

  /**
   * Remove an item from the queue by its ID.
   * Returns true if the item was removed, false if not found.
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((i) => i.id === id)
    if (index === -1) {
      return false
    }
    this.queue.splice(index, 1)
    return true
  }

  /**
   * Return all items in the queue, optionally filtered by status.
   * Returns a shallow copy to prevent external mutation.
   */
  getQueue(status?: QueueItem['status']): QueueItem[] {
    if (status) {
      return this.queue.filter((i) => i.status === status)
    }
    return [...this.queue]
  }

  /**
   * Return counts of items grouped by status.
   */
  getQueueStats(): QueueStats {
    const pending = this.queue.filter((i) => i.status === 'pending').length
    const spam = this.queue.filter((i) => i.status === 'spam').length
    const flagged = this.queue.filter((i) => i.status === 'flagged').length

    return {
      pending,
      spam,
      flagged,
      total: this.queue.length,
    }
  }

  /**
   * Dequeue the next item and pass it through the provided processor callback.
   * Returns the result of the callback, or undefined if the queue is empty.
   */
  processNext<T>(callback: (item: QueueItem) => T): T | undefined {
    const item = this.dequeue()
    if (!item) {
      return undefined
    }
    return callback(item)
  }

  /**
   * Automatically classify a queue item based on a firewall result.
   * Returns a new QueueItem with the status determined by the firewall action:
   * - 'spam' action  → status becomes 'spam'
   * - 'flag' action  → status becomes 'flagged'
   * - 'discard' action → status becomes 'spam'
   * - not triggered or null action → status stays 'pending'
   */
  autoClassify(item: QueueItem, firewallResult: FirewallResult): QueueItem {
    if (!firewallResult.triggered) {
      return { ...item, status: 'pending' }
    }
    switch (firewallResult.action) {
      case 'spam':
        return { ...item, status: 'spam' }
      case 'flag':
        return { ...item, status: 'flagged' }
      case 'discard':
        return { ...item, status: 'spam' }
      default:
        return { ...item, status: 'pending' }
    }
  }
}

/**
 * Count queue items with a given status.
 * Standalone utility (does not require a QueueManager instance).
 */
export function getQueueBadgeCount(
  items: QueueItem[],
  status: QueueItem['status'],
): number {
  return items.filter((i) => i.status === status).length
}
