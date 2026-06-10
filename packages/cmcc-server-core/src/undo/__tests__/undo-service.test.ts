/**
 * Undo Service — Unit Tests
 */
import { UndoService } from '../undo-service'

describe('UndoService', () => {
  let service: UndoService
  const mockApplyUndo = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    service = new UndoService({ windowMinutes: 5 })
  })

  describe('saveSnapshot', () => {
    it('saves a snapshot of item state for undo', async () => {
      const snapshot = await service.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
        moderatedBy: 'mod-1',
        moderatedAt: new Date().toISOString(),
      })

      expect(snapshot.id).toBeDefined()
      expect(snapshot.itemId).toBe('item-1')
      expect(snapshot.state.status).toBe('approved')
      expect(snapshot.state.previousStatus).toBe('pending')
    })

    it('returns the snapshot with a unique ID', async () => {
      const s1 = await service.saveSnapshot('item-1', { status: 'approved' })
      const s2 = await service.saveSnapshot('item-2', { status: 'rejected' })

      expect(s1.id).not.toBe(s2.id)
    })
  })

  describe('undo', () => {
    it('restores the previous state within the undo window', async () => {
      mockApplyUndo.mockResolvedValue({ success: true })

      await service.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
        moderatedBy: 'mod-1',
        moderatedAt: new Date().toISOString(),
      })

      const result = await service.undo('item-1', mockApplyUndo)

      expect(result.success).toBe(true)
      expect(result.restoredState).toBeDefined()
      expect(result.restoredState?.status).toBe('pending')
      expect(mockApplyUndo).toHaveBeenCalledWith('item-1', { status: 'pending' })
    })

    it('returns error when no snapshot exists for the item', async () => {
      const result = await service.undo('nonexistent-item', mockApplyUndo)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No snapshot found')
    })

    it('returns error when the undo window has expired', async () => {
      // Create a service with a very short window
      const shortWindowService = new UndoService({ windowMinutes: 0 })

      await shortWindowService.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
        moderatedBy: 'mod-1',
        moderatedAt: new Date().toISOString(),
      })

      const result = await shortWindowService.undo('item-1', mockApplyUndo)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Undo window expired')
    })

    it('removes the snapshot after successful undo', async () => {
      mockApplyUndo.mockResolvedValue({ success: true })

      await service.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
      })

      await service.undo('item-1', mockApplyUndo)

      // Second undo should fail because snapshot was removed
      const secondResult = await service.undo('item-1', mockApplyUndo)
      expect(secondResult.success).toBe(false)
    })

    it('handles applyUndo function errors gracefully', async () => {
      mockApplyUndo.mockRejectedValue(new Error('Restore failed'))

      await service.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
      })

      const result = await service.undo('item-1', mockApplyUndo)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Restore failed')
    })
  })

  describe('getUndoInfo', () => {
    it('returns undo info when snapshot exists and is within window', async () => {
      await service.saveSnapshot('item-1', {
        status: 'approved',
        previousStatus: 'pending',
        moderatedBy: 'mod-1',
      })

      const info = await service.getUndoInfo('item-1')

      expect(info?.available).toBe(true)
      expect(info?.remainingSeconds).toBeGreaterThan(0)
      expect(info?.currentStatus).toBe('approved')
    })

    it('returns null when no snapshot exists', async () => {
      const info = await service.getUndoInfo('nonexistent')
      expect(info).toBeNull()
    })
  })
})
