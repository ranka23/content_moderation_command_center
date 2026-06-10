import { cn } from '../../lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────

export interface FeedEvent {
  id: string
  type: 'action' | 'note' | 'assignment' | 'escalation' | 'team_change'
  actorId: string | number
  actorName: string
  description: string
  itemId?: string
  itemTitle?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ActivityFeedProps {
  /** List of feed events */
  events: FeedEvent[]
  /** Loading state */
  isLoading?: boolean
  /** Error message (if any) */
  error?: string | null
  /** Callback when user clicks retry after error */
  onRetry?: () => void
  /** Title for the feed section */
  title?: string
  className?: string
}

const EVENT_ICONS: Record<FeedEvent['type'], string> = {
  action: '⚡',
  note: '📝',
  assignment: '👤',
  escalation: '🚨',
  team_change: '👥',
}

const EVENT_COLORS: Record<FeedEvent['type'], string> = {
  action: 'tw-border-l-blue-400',
  note: 'tw-border-l-amber-400',
  assignment: 'tw-border-l-purple-400',
  escalation: 'tw-border-l-red-500',
  team_change: 'tw-border-l-green-400',
}

/**
 * ActivityFeed displays real-time moderation activity in a scrollable timeline.
 * Shows moderator actions, notes, assignments, escalations, and team changes.
 */
export function ActivityFeed({
  events,
  isLoading = false,
  error = null,
  onRetry,
  title = 'Activity Feed',
  className,
}: ActivityFeedProps): React.ReactElement {
  return (
    <div className={cn('tw-space-y-3', className)}>
      <h4 className="tw-text-sm tw-font-semibold tw-text-gray-700">
        🔄 {title}
      </h4>

      {/* Error state */}
      {error && (
        <div className="tw-text-sm tw-text-red-600 tw-bg-red-50 tw-rounded-md tw-p-3">
          <p>{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="tw-text-xs tw-text-red-700 tw-underline tw-mt-1 hover:tw-no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="tw-space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tw-animate-pulse tw-flex tw-gap-3">
              <div className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-gray-200 tw-mt-1.5" />
              <div className="tw-flex-1 tw-space-y-1.5">
                <div className="tw-h-3 tw-bg-gray-200 tw-rounded tw-w-3/4" />
                <div className="tw-h-2 tw-bg-gray-100 tw-rounded tw-w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="tw-text-sm tw-text-gray-400 tw-text-center tw-py-4">
          No recent activity
        </div>
      ) : (
        /* Events timeline */
        <div className="tw-space-y-2 tw-max-h-96 tw-overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn(
                'tw-pl-3 tw-border-l-2 tw-py-0.5',
                EVENT_COLORS[event.type],
              )}
            >
              <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-xs">
                <span>{EVENT_ICONS[event.type]}</span>
                <span className="tw-font-medium tw-text-gray-800">
                  {event.actorName}
                </span>
                <span className="tw-text-gray-400">•</span>
                <span className="tw-text-gray-400">
                  {getRelativeTime(event.timestamp)}
                </span>
              </div>
              <p className="tw-text-sm tw-text-gray-600 tw-mt-0.5">
                {event.description}
              </p>
              {event.itemTitle && (
                <span className="tw-text-xs tw-text-gray-400 tw-mt-0.5 tw-block">
                  on &quot;{event.itemTitle}&quot;
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Get a human-readable relative time string.
 */
function getRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export default ActivityFeed
