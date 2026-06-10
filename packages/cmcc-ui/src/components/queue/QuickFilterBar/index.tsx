import { cn } from '../../../lib/cn'

// ─── Preset Filter Definitions ───────────────────────────────────────────

export interface QuickPreset {
  id: string
  label: string
  icon?: string
  /** The filter values to apply when this preset is selected */
  filters: Record<string, unknown>
}

export interface QuickFilterBarProps {
  presets: QuickPreset[]
  activePreset?: string | null
  onSelectPreset: (presetId: string | null) => void
  className?: string
}

const DEFAULT_PRESETS: QuickPreset[] = [
  {
    id: 'last-hour',
    label: 'Last Hour',
    icon: '🕐',
    filters: { dateRange: 'last-hour', status: 'all' },
  },
  {
    id: 'today',
    label: 'Today',
    icon: '📅',
    filters: { dateRange: 'today', status: 'all' },
  },
  {
    id: 'this-week',
    label: 'This Week',
    icon: '📆',
    filters: { dateRange: 'this-week', status: 'all' },
  },
  {
    id: 'pending',
    label: 'Pending Only',
    icon: '⏳',
    filters: { status: 'pending', dateRange: 'all' },
  },
  {
    id: 'high-spam',
    label: 'High Spam Score',
    icon: '🚫',
    filters: { status: 'spam', dateRange: 'all' },
  },
  {
    id: 'flagged',
    label: 'Flagged',
    icon: '⚠️',
    filters: { status: 'flagged', dateRange: 'all' },
  },
]

/**
 * QuickFilterBar provides one-click preset filters for the moderation queue.
 * Includes built-in presets (Last Hour, Today, This Week, etc.) and allows
 * custom presets to be passed via props.
 */
export function QuickFilterBar({
  presets = DEFAULT_PRESETS,
  activePreset,
  onSelectPreset,
  className,
}: QuickFilterBarProps): React.ReactElement {
  return (
    <div
      className={cn('tw-flex tw-items-center tw-gap-1 tw-flex-wrap', className)}
      role="group"
      aria-label="Quick filters"
    >
      {/* "All" / Clear filter button */}
      <button
        onClick={() => onSelectPreset(null)}
        className={cn(
          'tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-rounded-full tw-text-xs tw-font-medium tw-transition-colors',
          'tw-border tw-border-gray-200',
          activePreset === null
            ? 'tw-bg-primary-600 tw-text-white tw-border-primary-600'
            : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50 hover:tw-border-gray-300',
        )}
      >
        All
      </button>

      {presets.map((preset) => {
        const isActive = activePreset === preset.id
        return (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(isActive ? null : preset.id)}
            className={cn(
              'tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-rounded-full tw-text-xs tw-font-medium tw-transition-colors',
              'tw-border tw-border-gray-200',
              isActive
                ? 'tw-bg-primary-600 tw-text-white tw-border-primary-600'
                : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50 hover:tw-border-gray-300',
            )}
            aria-pressed={isActive}
          >
            {preset.icon && <span>{preset.icon}</span>}
            <span>{preset.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { DEFAULT_PRESETS }
export default QuickFilterBar
