import type { LockInfo, LockManagerStats } from '../index'
import { InMemoryLockManager, getDefaultLockManager } from '../index'

describe('InMemoryLockManager', () => {
  let lockManager: InMemoryLockManager

  beforeEach(() => {
    lockManager = new InMemoryLockManager({
      defaultLockTimeout: 1, // 1 second for testing
      cleanupIntervalSeconds: 1,
    })
  })

  afterEach(() => {
    lockManager.stop()
  })

  describe('acquireLock', () => {
    it('should allow a moderator to acquire a lock on an unlocked item', () => {
      const result = lockManager.acquireLock('item1', 'mod1')
      expect(result).toBe(true)
    })

    it('should prevent another moderator from acquiring a lock on the same item', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.acquireLock('item1', 'mod2')
      expect(result).toBe(false)
    })

    it('should allow the same moderator to re-acquire a lock (optional behavior)', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.acquireLock('item1', 'mod1') // Same moderator
      expect(result).toBe(true) // In our implementation, this succeeds
    })

    it('should allow a lock to be acquired after it expires', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      // Wait for lock to expire
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        const result = lockManager.acquireLock('item1', 'mod2')
        expect(result).toBe(true)
      })
    })

    it('should handle empty string item ID', () => {
      const result = lockManager.acquireLock('', 'mod1')
      expect(result).toBe(true)
    })

    it('should use default lock timeout when not provided', () => {
      const result = lockManager.acquireLock('item1', 'mod1')
      expect(result).toBe(true)
      const info = lockManager.getLockInfo('item1')
      expect(info.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle very long timeout values', () => {
      const result = lockManager.acquireLock('item1', 'mod1', 999999)
      expect(result).toBe(true)
      const info = lockManager.getLockInfo('item1')
      expect(info.expiresAt).toBeGreaterThan(Date.now() + 86400000)
    })

    it('should handle negative timeout values', () => {
      const result = lockManager.acquireLock('item1', 'mod1', -1)
      expect(result).toBe(true)
      // Negative timeout means lock expires immediately (in the past)
      const info = lockManager.getLockInfo('item1')
      expect(info.lockedBy).toBeNull()
    })
  })

  describe('releaseLock', () => {
    it('should allow the lock holder to release the lock', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.releaseLock('item1', 'mod1')
      expect(result).toBe(true)
    })

    it('should prevent a non-holder from releasing the lock', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.releaseLock('item1', 'mod2')
      expect(result).toBe(false)
    })

    it('should return false when trying to release a non-existent lock', () => {
      const result = lockManager.releaseLock('item1', 'mod1')
      expect(result).toBe(false)
    })

    it('should allow another moderator to acquire the lock after release', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.releaseLock('item1', 'mod1')
      const result = lockManager.acquireLock('item1', 'mod2')
      expect(result).toBe(true)
    })
  })

  describe('getLockInfo', () => {
    it('should return null for unlocked items', () => {
      const info: LockInfo = lockManager.getLockInfo('item1')
      expect(info.lockedBy).toBeNull()
      expect(info.expiresAt).toBeNull()
    })

    it('should return lock info for locked items', () => {
      lockManager.acquireLock('item1', 'mod1', 10) // 10 second lock
      const info: LockInfo = lockManager.getLockInfo('item1')
      expect(info.lockedBy).toBe('mod1')
      expect(info.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should return unlocked info for expired locks', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      // Wait for lock to expire
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        const info: LockInfo = lockManager.getLockInfo('item1')
        expect(info.lockedBy).toBeNull()
        expect(info.expiresAt).toBeNull()
      })
    })

    it('should return null info for non-existent item', () => {
      const info = lockManager.getLockInfo('non-existent')
      expect(info.lockedBy).toBeNull()
      expect(info.expiresAt).toBeNull()
    })
  })

  describe('cleanupExpiredLocks', () => {
    it('should remove expired locks', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      lockManager.acquireLock('item2', 'mod2', 10) // 10 second lock

      // Wait for first lock to expire
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        // Manually trigger cleanup
        ;(lockManager as any).cleanupExpiredLocks()

        const info1 = lockManager.getLockInfo('item1')
        const info2 = lockManager.getLockInfo('item2')

        expect(info1.lockedBy).toBeNull() // Should be cleaned up
        expect(info2.lockedBy).toBe('mod2') // Should still be locked
      })
    })
  })

  describe('clearAllLocks', () => {
    it('should clear all locks', () => {
      lockManager.acquireLock('item1', 'mod1', 10)
      lockManager.acquireLock('item2', 'mod2', 10)
      lockManager.acquireLock('item3', 'mod1', 10)

      lockManager.clearAllLocks()
      expect(lockManager.getActiveLocks()).toEqual([])
      expect(lockManager.getLockInfo('item1').lockedBy).toBeNull()
      expect(lockManager.getLockInfo('item2').lockedBy).toBeNull()
      expect(lockManager.getLockInfo('item3').lockedBy).toBeNull()
    })

    it('should preserve stats after clearAllLocks', () => {
      lockManager.acquireLock('item1', 'mod1', 10)
      lockManager.acquireLock('item2', 'mod2', 10)
      lockManager.clearAllLocks()
      const stats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(2)
      expect(stats.activeLocks).toBe(0)
    })

    it('should not throw when clearing empty locks', () => {
      expect(() => lockManager.clearAllLocks()).not.toThrow()
    })
  })

  describe('stop', () => {
    it('should clear the cleanup interval', () => {
      lockManager.stop()
      // Verify no crash on second stop
      expect(() => lockManager.stop()).not.toThrow()
    })

    it('should allow creating a manager without auto cleanup', () => {
      const noCleanupManager = new InMemoryLockManager({
        defaultLockTimeout: 1,
        cleanupIntervalSeconds: 0, // 0 means no cleanup
      })
      noCleanupManager.acquireLock('item1', 'mod1')
      expect(noCleanupManager.getLockInfo('item1').lockedBy).toBe('mod1')
      noCleanupManager.stop()
    })
  })

  describe('getStats', () => {
    it('should return initial stats with zeros', () => {
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(0)
      expect(stats.totalReleases).toBe(0)
      expect(stats.totalRejections).toBe(0)
      expect(stats.totalTimeouts).toBe(0)
      expect(stats.activeLocks).toBe(0)
    })

    it('should track successful acquisitions', () => {
      lockManager.acquireLock('item1', 'mod1')
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(1)
      expect(stats.totalRejections).toBe(0)
      expect(stats.activeLocks).toBe(1)
    })

    it('should track rejected acquisitions', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.acquireLock('item1', 'mod2') // rejected
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(1)
      expect(stats.totalRejections).toBe(1)
      expect(stats.activeLocks).toBe(1)
    })

    it('should track successful releases', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.releaseLock('item1', 'mod1')
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.totalReleases).toBe(1)
      expect(stats.activeLocks).toBe(0)
    })

    it('should count lock extension as an acquisition (same moderator re-acquiring)', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.acquireLock('item1', 'mod1') // extension
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(2)
      expect(stats.totalRejections).toBe(0)
      expect(stats.activeLocks).toBe(1)
    })

    it('should count timeouts when expired locks are cleaned up', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        ;(lockManager as any).cleanupExpiredLocks()
        const stats: LockManagerStats = lockManager.getStats()
        expect(stats.totalTimeouts).toBe(1)
        expect(stats.activeLocks).toBe(0)
      })
    })

    it('should report correct active lock count with multiple locks', () => {
      lockManager.acquireLock('item1', 'mod1', 10)
      lockManager.acquireLock('item2', 'mod2', 10)
      lockManager.acquireLock('item3', 'mod1', 10)
      const stats: LockManagerStats = lockManager.getStats()
      expect(stats.activeLocks).toBe(3)
    })

    it('should track rejection after release cycle', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.releaseLock('item1', 'mod1')
      lockManager.acquireLock('item1', 'mod2')
      lockManager.acquireLock('item1', 'mod1') // rejected
      const stats = lockManager.getStats()
      expect(stats.totalAcquisitions).toBe(2)
      expect(stats.totalReleases).toBe(1)
      expect(stats.totalRejections).toBe(1)
    })
  })

  describe('forceReleaseLock', () => {
    it('should release a lock held by another moderator', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.forceReleaseLock('item1')
      expect(result).toBe(true)
      // Verify lock is released
      const info: LockInfo = lockManager.getLockInfo('item1')
      expect(info.lockedBy).toBeNull()
    })

    it('should release a lock held by the same moderator', () => {
      lockManager.acquireLock('item1', 'mod1')
      const result = lockManager.forceReleaseLock('item1')
      expect(result).toBe(true)
    })

    it('should return false if no lock exists on the item', () => {
      const result = lockManager.forceReleaseLock('nonexistent-item')
      expect(result).toBe(false)
    })

    it('should allow a new moderator to acquire the lock after force release', () => {
      lockManager.acquireLock('item1', 'mod1')
      lockManager.forceReleaseLock('item1')
      const result = lockManager.acquireLock('item1', 'mod2')
      expect(result).toBe(true)
    })

    it('should release an expired lock', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        // Lock is expired but still in the map; forceRelease should remove it
        const result = lockManager.forceReleaseLock('item1')
        expect(result).toBe(true)
        const info: LockInfo = lockManager.getLockInfo('item1')
        expect(info.lockedBy).toBeNull()
      })
    })
  })

  describe('getActiveLocks', () => {
    it('should return an empty array when no locks exist', () => {
      const locks = lockManager.getActiveLocks()
      expect(locks).toEqual([])
    })

    it('should return active locks as LockInfo objects', () => {
      lockManager.acquireLock('item1', 'mod1', 10)
      lockManager.acquireLock('item2', 'mod2', 10)
      const locks = lockManager.getActiveLocks()
      expect(locks).toHaveLength(2)
      // Find locks by lockedBy since we don't have itemId in LockInfo
      const mod1Locks = locks.filter((l) => l.lockedBy === 'mod1')
      const mod2Locks = locks.filter((l) => l.lockedBy === 'mod2')
      expect(mod1Locks).toHaveLength(1)
      expect(mod2Locks).toHaveLength(1)
      mod1Locks.forEach((l) => expect(l.expiresAt).toBeGreaterThan(Date.now()))
      mod2Locks.forEach((l) => expect(l.expiresAt).toBeGreaterThan(Date.now()))
    })

    it('should exclude expired locks', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01) // 10ms lock
      lockManager.acquireLock('item2', 'mod2', 10) // 10s lock
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        const locks = lockManager.getActiveLocks()
        expect(locks).toHaveLength(1)
        expect(locks[0]?.lockedBy).toBe('mod2')
      })
    })

    it('should not mutate internal state when called', () => {
      lockManager.acquireLock('item1', 'mod1', 10)
      const locks1 = lockManager.getActiveLocks()
      const locks2 = lockManager.getActiveLocks()
      expect(locks1).toEqual(locks2)
    })

    it('should return empty when all locks expired and cleaned', () => {
      lockManager.acquireLock('item1', 'mod1', 0.01)
      return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        lockManager.clearAllLocks()
        expect(lockManager.getActiveLocks()).toEqual([])
      })
    })
  })

  describe('custom cleanup interval', () => {
    it('should work with very long cleanup interval', () => {
      const longIntervalManager = new InMemoryLockManager({
        defaultLockTimeout: 10,
        cleanupIntervalSeconds: 3600, // 1 hour cleanup interval
      })
      longIntervalManager.acquireLock('item1', 'mod1')
      expect(longIntervalManager.getActiveLocks()).toHaveLength(1)
      longIntervalManager.stop()
    })

    it('should work with default constructor options', () => {
      const defaultManager = new InMemoryLockManager()
      defaultManager.acquireLock('item1', 'mod1')
      expect(defaultManager.getActiveLocks()).toHaveLength(1)
      defaultManager.stop()
    })
  })
})

describe('getDefaultLockManager', () => {
  it('should return a new InMemoryLockManager instance', () => {
    const manager = getDefaultLockManager()
    expect(manager).toBeInstanceOf(InMemoryLockManager)

    // Test that it works
    const result = manager.acquireLock('test-item', 'test-mod')
    expect(result).toBe(true)

    manager.stop()
  })

  it('returned manager should support v1 methods', () => {
    const manager = getDefaultLockManager()
    manager.acquireLock('test-item', 'test-mod')

    const stats = manager.getStats()
    expect(stats.totalAcquisitions).toBeGreaterThanOrEqual(1)

    const activeLocks = manager.getActiveLocks()
    expect(activeLocks.length).toBeGreaterThanOrEqual(1)

    const forceResult = manager.forceReleaseLock('test-item')
    expect(forceResult).toBe(true)

    manager.stop()
  })
})
