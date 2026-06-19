// Core shared UI (shadcn-style)
export {
  Button,
  Input,
  Select,
  Badge,
  Card,
  Pagination,
  Table,
  useColumnResize,
} from './components/ui'
export type {
  ButtonProps,
  InputProps,
  SelectProps,
  BadgeProps,
  CardProps,
  PaginationProps,
  ColumnDef,
  SortConfig,
  TableProps,
} from './components/ui'

export { cn } from './lib/cn'

// Icon system — lucide-react wrapper
export { Icon } from './lib/icons'
export type { IconProps } from './lib/icons'

// Hooks
export { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
export type { KeyboardShortcut } from './lib/useKeyboardShortcuts'

export { useSavedFilters } from './lib/useSavedFilters'
export type { SavedFilter, UseSavedFiltersReturn } from './lib/useSavedFilters'

// Queue
export { QueueTable } from './components/queue/QueueTable'
export type { QueueItem, QueueTableProps } from './components/queue/QueueTable'

// Analytics / Charts
export { HeatmapChart } from './components/analytics/HeatmapChart'
export type {
  HeatmapData,
  HeatmapChartProps,
} from './components/analytics/HeatmapChart'

export { SettingsForm } from './components/settings/SettingsForm'
export type {
  SettingsField,
  SettingsSection,
  SettingsFormProps,
} from './components/settings/SettingsForm'

// Legacy – still exported for backward compatibility
export { NotificationBadge } from './components/common/NotificationBadge'
export type { NotificationBadgeProps } from './components/common/NotificationBadge'

// Error boundary
export { ErrorBoundary } from './components/common/ErrorBoundary'

// Common – skeleton / empty state / panel
export { SkeletonTable } from './components/common/SkeletonTable'
export type { SkeletonTableProps } from './components/common/SkeletonTable'

export { SkeletonCard } from './components/common/SkeletonCard'
export type { SkeletonCardProps } from './components/common/SkeletonCard'

export { EmptyState } from './components/common/EmptyState'
export type { EmptyStateProps } from './components/common/EmptyState'

export { SlideOutPanel } from './components/common/SlideOutPanel'
export type { SlideOutPanelProps } from './components/common/SlideOutPanel'

// ActionButton — simple button wrapper used by platform apps
export { ActionButton } from './components/common/ActionButton'

// ProgressBar
export { ProgressBar } from './components/common/ProgressBar'
export type { ProgressBarProps } from './components/common/ProgressBar'

// ConfirmationModal
export { ConfirmationModal } from './components/common/ConfirmationModal'
export type { ConfirmationModalProps } from './components/common/ConfirmationModal'

// QuickFilterBar
export { QuickFilterBar } from './components/queue/QuickFilterBar'
export type {
  QuickFilterBarProps,
  QuickPreset,
} from './components/queue/QuickFilterBar'

// Collaboration components
export { ModerationNotes } from './components/collaboration/ModerationNotes'
export type {
  ModerationNotesProps,
  Note,
} from './components/collaboration/ModerationNotes'

export { ActivityFeed } from './components/collaboration/ActivityFeed'
export type {
  ActivityFeedProps,
  FeedEvent,
} from './components/collaboration/ActivityFeed'

// Chart components (use Chart.js via react-chartjs-2)
export { StatusPieChart } from './components/charts/StatusPieChart'
export type {
  StatusPieChartData,
  StatusPieChartProps,
} from './components/charts/StatusPieChart'

export { ModerationLineChart } from './components/charts/ModerationLineChart'
export type {
  ModerationLineChartData,
  ModerationLineChartProps,
} from './components/charts/ModerationLineChart'

export { SpamBarChart } from './components/charts/SpamBarChart'
export type {
  SpamBarChartData,
  SpamBarChartProps,
} from './components/charts/SpamBarChart'

// Offline detection
export { useOnlineStatus } from './lib/useOnlineStatus'
export { OfflineBanner } from './components/common/OfflineBanner'
export type { OfflineBannerProps } from './components/common/OfflineBanner'

// AI Moderation

export { AiSettingsForm, AiEvaluationResult } from './components/ai'
export type {
  AiEngineType,
  AiSettingsConfig,
  AiSettingsFormProps,
  AiSpamScoreDisplay,
  AiLanguageDisplay,
  AiSentimentDisplay,
  AiEvaluationResultData,
  AiEvaluationResultProps,
} from './components/ai'
