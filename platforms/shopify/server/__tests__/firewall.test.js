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

describe('Firewall Integration', () => {
  let firewallService

  beforeAll(() => {
    firewallService = setupApp().firewallService
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have a firewall service instance', () => {
    expect(firewallService).toBeDefined()
    expect(typeof firewallService.evaluateContent).toBe('function')
  })

  it('should evaluate content and return results', async () => {
    const result = await firewallService.evaluateContent({
      content: 'Buy cheap stuff now!!!',
      authorIP: '192.168.1.1',
    })
    expect(result).toBeDefined()
    expect(result.triggered).toBe(false)
  })

  it('should track evaluation stats', () => {
    const stats = firewallService.getStats()
    expect(stats).toBeDefined()
  })
})
