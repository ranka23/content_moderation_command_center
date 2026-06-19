/**
 * Basic smoke tests for @cmcc/server-core
 *
 * Verifies that all public exports resolve correctly and that
 * each service can be instantiated with minimal configuration.
 */

import {
  FirewallService,
  getDefaultFirewallConfig,
  EmailService,
  WebhookService,
  RetentionService,
  getDefaultRetentionConfig,
  UndoService,
  ScheduledReportService,
  SyncReceiver,
  WebSocketEventBus,
  ContentHookService,
} from '../index'

describe('@cmcc/server-core — package exports', () => {
  it('exports FirewallService and getDefaultFirewallConfig', () => {
    expect(FirewallService).toBeDefined()
    expect(getDefaultFirewallConfig).toBeDefined()
    const config = getDefaultFirewallConfig()
    expect(config).toHaveProperty('maxLinks')
    expect(config).toHaveProperty('globalAction')
  })

  it('can instantiate FirewallService', () => {
    const storageAdapter = {
      getEvaluationCount: jest.fn().mockResolvedValue(0),
      incrementEvaluation: jest.fn().mockResolvedValue(undefined),
      resetCounts: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getRecentHashes: jest.fn().mockResolvedValue(new Set<string>()),
      storeContentHash: jest.fn().mockResolvedValue(undefined),
      getFailedEvaluations: jest.fn().mockResolvedValue([]),
    }
    const service = new FirewallService(
      getDefaultFirewallConfig(),
      storageAdapter,
    )
    expect(service).toBeInstanceOf(FirewallService)
  })

  it('exports EmailService', () => {
    expect(EmailService).toBeDefined()
    const smtpConfig = {
      host: 'localhost',
      port: 25,
      secure: false,
      auth: { user: 'test', pass: 'test' },
      fromAddress: 'test@example.com',
    }
    const service = new EmailService(smtpConfig)
    expect(service).toBeInstanceOf(EmailService)
  })

  it('exports WebhookService', () => {
    expect(WebhookService).toBeDefined()
    const service = new WebhookService()
    expect(service).toBeInstanceOf(WebhookService)
  })

  it('exports RetentionService and getDefaultRetentionConfig', () => {
    expect(RetentionService).toBeDefined()
    expect(getDefaultRetentionConfig).toBeDefined()
    const config = getDefaultRetentionConfig()
    expect(config).toHaveProperty('activityLogRetentionDays')
    expect(config).toHaveProperty('archivedItemRetentionDays')
  })

  it('can instantiate RetentionService', () => {
    const service = new RetentionService(getDefaultRetentionConfig())
    expect(service).toBeInstanceOf(RetentionService)
  })

  it('exports UndoService', () => {
    expect(UndoService).toBeDefined()
    const service = new UndoService({ windowMinutes: 5 })
    expect(service).toBeInstanceOf(UndoService)
  })

  it('exports ScheduledReportService', () => {
    expect(ScheduledReportService).toBeDefined()
  })

  it('exports SyncReceiver', () => {
    expect(SyncReceiver).toBeDefined()
  })

  it('exports WebSocketEventBus', () => {
    expect(WebSocketEventBus).toBeDefined()
    const bus = new WebSocketEventBus()
    expect(bus).toBeInstanceOf(WebSocketEventBus)
  })

  it('exports ContentHookService', () => {
    expect(ContentHookService).toBeDefined()
  })
})
