const { setupApp } = require('../index')

const mockPrepareObj = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  bind: jest.fn(() => mockPrepareObj),
}
const mockDb = {
  prepare: jest.fn(() => mockPrepareObj),
  exec: jest.fn(),
  transaction: jest.fn((fn) => fn),
}

jest.mock('../db', () => ({
  getDb: jest.fn(() => mockDb),
  initDb: jest.fn(),
  runMigrations: jest.fn(),
}))

describe('UndoService Integration', () => {
  let undoService

  beforeAll(() => {
    undoService = setupApp().undoService
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should save and restore snapshots', async () => {
    const snapshot = await undoService.saveSnapshot('item-1', {
      status: 'pending',
      title: 'Test',
    })
    expect(snapshot).toBeDefined()
    expect(snapshot.itemId).toBe('item-1')

    const undoInfo = await undoService.getUndoInfo('item-1')
    expect(undoInfo).toBeDefined()
    expect(undoInfo.available).toBe(true)

    const result = await undoService.undo('item-1', async (state) => {
      expect(state.status).toBe('pending')
      return { success: true }
    })
    expect(result.success).toBe(true)
    expect(result.restoredState.status).toBe('pending')
  })

  it('should return null info for unknown items', async () => {
    const info = await undoService.getUndoInfo('nonexistent')
    expect(info).toBeNull()
  })
})
