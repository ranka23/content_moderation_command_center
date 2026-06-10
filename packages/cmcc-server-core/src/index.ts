/**
 * @cmcc/server-core
 *
 * Shared backend services for CMCC moderation features across all platforms.
 * Provides platform-agnostic implementations of:
 *
 * - FirewallService   — Server-side spam firewall engine
 * - EmailService      — Email notifications for moderation events
 * - WebhookService    — Outbound webhook dispatching
 * - RetentionService  — Data retention and auto-purge
 * - UndoService       — 5-minute undo window for moderation actions
 * - ScheduledReportService — Recurring report scheduling
 * - SyncReceiver      — Cross-platform settings sync receiver
 * - WebSocketEventBus — In-process event bus for real-time feeds
 * - ContentHookService — Auto-import content hooks
 *
 * Each service is platform-agnostic; platform-specific adapters
 * (database, transport, etc.) are injected via constructor or callback.
 *
 * @package @cmcc/server-core
 */

// ── Firewall ──────────────────────────────────────────────────────────────
export {
  FirewallService,
  getDefaultFirewallConfig,
} from './firewall/firewall-service'
export type {
  FirewallServiceConfig,
  FirewallStorageAdapter,
  EvaluationContext,
  EvaluationResult,
} from './firewall/firewall-service'

// ── Notifications ─────────────────────────────────────────────────────────
export { EmailService } from './notifications/email-service'
export type { SmtpConfig, EmailResult } from './notifications/email-service'

export { WebhookService } from './notifications/webhook-service'
export type {
  WebhookDispatchResult,
  WebhookTarget,
} from './notifications/webhook-service'

// ── Retention ─────────────────────────────────────────────────────────────
export { RetentionService, getDefaultRetentionConfig } from './retention/retention-service'
export type { RetentionConfig, PurgeResult, ScheduledPurgeResult } from './retention/retention-service'

// ── Undo ──────────────────────────────────────────────────────────────────
export { UndoService } from './undo/undo-service'
export type { UndoConfig, ItemSnapshot, UndoResult, UndoInfo } from './undo/undo-service'

// ── Reports ────────────────────────────────────────────────────────────────
export { ScheduledReportService } from './reports/scheduled-report-service'
export type { ScheduledReport, ScheduleReportInput } from './reports/scheduled-report-service'

// ── Sync ──────────────────────────────────────────────────────────────────
export { SyncReceiver } from './sync/sync-receiver'
export type { SyncPayload, SyncResult, FirewallSyncCallback, SettingsSyncCallback } from './sync/sync-receiver'

// ── WebSocket ──────────────────────────────────────────────────────────────
export { WebSocketEventBus } from './websocket/websocket-service'
export type { ActivityEvent, EventHandler } from './websocket/websocket-service'

// ── Content Hooks ─────────────────────────────────────────────────────────
export { ContentHookService } from './hooks/content-hook-service'
export type { ContentHook, ContentData, AddToQueueFn } from './hooks/content-hook-service'
