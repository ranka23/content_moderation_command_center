/**
 * UndoService
 *
 * Provides a 5-minute undo window for moderation actions.
 * Stores snapshots of item state before modifications and
 * allows restoring the previous state within the window.
 *
 * Usage:
 *   const service = new UndoService({ windowMinutes: 5 })
 *   await service.saveSnapshot(itemId, previousState)
 *   const result = await service.undo(itemId, applyUndoFn)
 *   const info = await service.getUndoInfo(itemId)
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Configuration for the undo window.
 */
export interface UndoConfig {
  /** Duration of the undo window in minutes (default: 5) */
  windowMinutes: number
}

/**
 * Snapshot of an item's state before a moderation action.
 */
export interface ItemSnapshot {
  /** Unique snapshot ID */
  id: string
  /** The queue item this snapshot belongs to */
  itemId: string
  /** The state before the action was taken */
  state: Record<string, unknown>
  /** When the action was performed */
  timestamp: string
}

/**
 * Result of an undo operation.
 */
export interface UndoResult {
  success: boolean
  restoredState?: Record<string, unknown>
  error?: string
}

/**
 * Information about whether an item can be undone.
 */
export interface UndoInfo {
  available: boolean
  remainingSeconds: number
  currentStatus: string
}

/**
 * Provides undo functionality for moderation actions with
 * a configurable time window.
 */
export class UndoService {
  private config: UndoConfig
  private snapshots: Map<string, ItemSnapshot>

  /**
   * @param config - Undo window configuration
   */
  constructor(config?: Partial<UndoConfig>) {
    this.config = {
      windowMinutes: 5,
      ...config,
    }
    this.snapshots = new Map()
  }

  /**
   * Save a snapshot of an item's state before modifying it.
   * This is called BEFORE the moderation action is applied.
   *
   * @param itemId - The queue item ID
   * @param state  - The current state to snapshot
   * @returns The created snapshot
   */
  async saveSnapshot(
    itemId: string,
    state: Record<string, unknown>,
  ): Promise<ItemSnapshot> {
    const snapshot: ItemSnapshot = {
      id: uuidv4(),
      itemId,
      state: { ...state },
      timestamp: new Date().toISOString(),
    }

    this.snapshots.set(itemId, snapshot)
    return snapshot
  }

  /**
   * Undo the last action on an item by restoring its previous state.
   * Only works within the configured time window.
   *
   * @param itemId     - The queue item ID to undo
   * @param applyUndoFn - Platform function that applies the restored state
   * @returns UndoResult with success status
   */
  async undo(
    itemId: string,
    applyUndoFn: (
      state: Record<string, unknown>,
    ) => Promise<{ success: boolean }>,
  ): Promise<UndoResult> {
    const snapshot = this.snapshots.get(itemId)

    if (!snapshot) {
      return {
        success: false,
        error: `No snapshot found for item "${itemId}". Either it has already been undone or no action was taken.`,
      }
    }

    // Check undo window
    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = this.config.windowMinutes * 60 * 1000

    if (elapsed > windowMs) {
      this.snapshots.delete(itemId)
      return {
        success: false,
        error: `Undo window expired (${this.config.windowMinutes} minutes). The action is now considered final.`,
      }
    }

    try {
      const result = await applyUndoFn(snapshot.state)

      if (result.success) {
        // Remove the snapshot to prevent double-undo
        this.snapshots.delete(itemId)
        return {
          success: true,
          restoredState: snapshot.state,
        }
      }

      return {
        success: false,
        error: 'Failed to apply undo state',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Undo failed'
      return { success: false, error: message }
    }
  }

  /**
   * Get undo information for an item, including whether
   * undo is available and how much time remains.
   *
   * @param itemId - The queue item ID
   * @returns UndoInfo or null if no snapshot exists
   */
  async getUndoInfo(itemId: string): Promise<UndoInfo | null> {
    const snapshot = this.snapshots.get(itemId)

    if (!snapshot) return null

    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = this.config.windowMinutes * 60 * 1000
    const remaining = windowMs - elapsed

    return {
      available: remaining > 0,
      remainingSeconds: Math.max(0, Math.floor(remaining / 1000)),
      currentStatus: (snapshot.state['status'] as string) || 'unknown',
    }
  }

  /**
   * Clean up expired snapshots to free memory.
   */
  cleanExpiredSnapshots(): void {
    const now = Date.now()
    const windowMs = this.config.windowMinutes * 60 * 1000

    for (const [itemId, snapshot] of this.snapshots.entries()) {
      if (now - new Date(snapshot.timestamp).getTime() > windowMs) {
        this.snapshots.delete(itemId)
      }
    }
  }
}
