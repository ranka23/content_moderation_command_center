'use strict'

const { UndoService: CoreUndoService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi undo service wrapping @cmcc/server-core UndoService.
 * Provides a 5-minute undo window for moderation actions.
 */
module.exports = ({ strapi }) => {
  const coreService = new CoreUndoService({ windowMinutes: 5 })

  return {
    /**
     * Save a snapshot of an item's state before a moderation action.
     */
    async saveSnapshot(itemId, state) {
      return coreService.saveSnapshot(String(itemId), state)
    },

    /**
     * Undo the last action on an item.
     */
    async undoItem(itemId) {
      return coreService.undo(String(itemId), async (restoredState) => {
        await strapi.entityService.update(
          `plugin::${PLUGIN_ID}.queue-item`,
          itemId,
          { data: restoredState },
        )
        return { success: true }
      })
    },

    /**
     * Get undo information for an item.
     */
    async getUndoInfo(itemId) {
      return coreService.getUndoInfo(String(itemId))
    },

    /**
     * Clean up expired snapshots.
     */
    cleanExpiredSnapshots() {
      coreService.cleanExpiredSnapshots()
    },
  }
}
