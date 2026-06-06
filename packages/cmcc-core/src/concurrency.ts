/**
 * CMCC Concurrency Control
 *
 * This module provides a simple in-memory locking mechanism to prevent
 * multiple moderators from acting on the same queue item simultaneously.
 * Platform-specific implementations can replace this with a distributed
 * lock manager (e.g., using Redis) or integrate with platform-specific
 * APIs like WordPress Heartbeat.
 */

export interface LockInfo {
  lockedBy: string | null // moderator ID
  expiresAt: number | null // timestamp in milliseconds
}

export interface LockManagerStats {
  totalAcquisitions: number
  totalReleases: number
  totalRejections: number
  totalTimeouts: number
  activeLocks: number
}

export interface ConcurrencyOptions {
  /** Default lock timeout in seconds */
  defaultLockTimeout?: number
  /** Interval in seconds to clean up expired locks */
  cleanupIntervalSeconds?: number
}

/**
 * Simple in-memory lock manager.
 * Note: This is not suitable for multi-server environments without a shared store.
 */
export class InMemoryLockManager {
  private locks: Map<string, { moderatorId: string; expiresAt: number }> =
    new Map()
  private cleanupIntervalId: NodeJS.Timeout | null = null
  private stats: LockManagerStats = {
    totalAcquisitions: 0,
    totalReleases: 0,
    totalRejections: 0,
    totalTimeouts: 0,
    activeLocks: 0,
  }

  constructor(private options: ConcurrencyOptions = {}) {
    const { cleanupIntervalSeconds = 60 } = options
    // Start periodic cleanup of expired locks
    this.cleanupIntervalId = setInterval(
      () => this.cleanupExpiredLocks(),
      cleanupIntervalSeconds * 1000,
    )
  }

  /**
   * Acquire a lock on a queue item for a moderator.
   * @param itemId The ID of the queue item to lock
   * @param moderatorId The ID of the moderator attempting to acquire the lock
   * @param lockTimeoutSeconds Optional timeout for this lock (uses default if not provided)
   * @returns True if the lock was acquired, false if already locked by another moderator
   */
  acquireLock(
    itemId: string,
    moderatorId: string,
    lockTimeoutSeconds?: number,
  ): boolean {
    const timeout = lockTimeoutSeconds ?? this.options.defaultLockTimeout ?? 30 // default 30 seconds
    const now = Date.now()
    const expiresAt = now + timeout * 1000

    const existingLock = this.locks.get(itemId)
    if (existingLock) {
      // Check if the existing lock has expired
      if (existingLock.expiresAt > now) {
        // Still valid
        if (existingLock.moderatorId === moderatorId) {
          // Same moderator can re-acquire (extends the lock)
          this.locks.set(itemId, { moderatorId, expiresAt })
          this.stats.totalAcquisitions++
          return true
        }
        // Held by someone else
        this.stats.totalRejections++
        return false
      }
      // If expired, we'll treat it as available and overwrite
    }

    this.locks.set(itemId, { moderatorId, expiresAt })
    this.stats.totalAcquisitions++
    return true
  }

  /**
   * Release a lock on a queue item.
   * @param itemId The ID of the queue item to unlock
   * @param moderatorId The ID of the moderator releasing the lock (must match the current lock holder)
   * @returns True if the lock was released, false if the moderator did not hold the lock
   */
  releaseLock(itemId: string, moderatorId: string): boolean {
    const existingLock = this.locks.get(itemId)
    if (!existingLock) {
      return false // No lock exists
    }
    if (existingLock.moderatorId !== moderatorId) {
      return false // Lock is held by another moderator
    }
    this.locks.delete(itemId)
    this.stats.totalReleases++
    return true
  }

  /**
   * Get information about the lock on a queue item.
   * @param itemId The ID of the queue item to check
   * @returns Lock information including who holds the lock and when it expires
   */
  getLockInfo(itemId: string): LockInfo {
    const existingLock = this.locks.get(itemId)
    if (!existingLock) {
      return { lockedBy: null, expiresAt: null }
    }
    const now = Date.now()
    if (existingLock.expiresAt <= now) {
      // Lock has expired, clean it up and return unlocked
      this.locks.delete(itemId)
      return { lockedBy: null, expiresAt: null }
    }
    return {
      lockedBy: existingLock.moderatorId,
      expiresAt: existingLock.expiresAt,
    }
  }

  /**
   * Clean up expired locks.
   * Called periodically by the cleanup interval.
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now()
    for (const [itemId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(itemId)
        this.stats.totalTimeouts++
      }
    }
  }

  /**
   * Get lock manager statistics.
   * @returns A snapshot of the current lock statistics
   */
  getStats(): LockManagerStats {
    return {
      totalAcquisitions: this.stats.totalAcquisitions,
      totalReleases: this.stats.totalReleases,
      totalRejections: this.stats.totalRejections,
      totalTimeouts: this.stats.totalTimeouts,
      activeLocks: this.getActiveLocks().length,
    }
  }

  /**
   * Forcefully release a lock on a queue item regardless of who holds it.
   * Useful for admin override scenarios.
   * @param itemId The ID of the queue item to unlock
   * @returns True if a lock was released, false if no lock existed
   */
  forceReleaseLock(itemId: string): boolean {
    const existingLock = this.locks.get(itemId)
    if (!existingLock) {
      return false
    }
    this.locks.delete(itemId)
    this.stats.totalReleases++
    return true
  }

  /**
   * Get all currently active (non-expired) locks.
   * @returns An array of LockInfo for all active locks
   */
  getActiveLocks(): LockInfo[] {
    const now = Date.now()
    const activeLocks: LockInfo[] = []
    for (const [, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        activeLocks.push({
          lockedBy: lock.moderatorId,
          expiresAt: lock.expiresAt,
        })
      }
    }
    return activeLocks
  }

  /**
   * Clear all locks (useful for testing).
   */
  clearAllLocks(): void {
    this.locks.clear()
  }

  /**
   * Stop the cleanup interval.
   * Should be called when the lock manager is no longer needed to prevent memory leaks.
   */
  stop(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }
}

/**
 * Get a default lock manager instance with default options.
 * @returns A new InMemoryLockManager instance
 */
export function getDefaultLockManager(): InMemoryLockManager {
  return new InMemoryLockManager()
}
