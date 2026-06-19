import React from 'react'

const MockComponent = ({ children, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-ui-mock', ...props },
    children,
  )

export const QueueTable = (props) =>
  React.createElement(MockComponent, { ...props, 'data-cmcc': 'QueueTable' })

export const HeatmapChart = (props) =>
  React.createElement(MockComponent, { ...props, 'data-cmcc': 'HeatmapChart' })

export const SettingsForm = (props) =>
  React.createElement(MockComponent, { ...props, 'data-cmcc': 'SettingsForm' })

export const ActionButton = ({
  children,
  onClick,
  type,
  disabled,
  className,
  ...props
}) =>
  React.createElement(
    'button',
    {
      onClick,
      type: type || 'button',
      disabled,
      className,
      'data-testid': 'cmcc-action-button',
      ...props,
    },
    children,
  )

export const NotificationBadge = ({
  count,
  type,
  onClick,
  _size,
  _pulse,
  ...props
}) =>
  React.createElement(
    'span',
    {
      'data-testid': 'cmcc-notification-badge',
      'data-count': count,
      'data-type': type,
      onClick,
      ...props,
    },
    String(count),
  )

// Offline detection
export const OfflineBanner = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-offline-banner', ...props })
export const ConfirmationModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  ...props
}) =>
  open
    ? React.createElement(
        'div',
        { 'data-testid': 'cmcc-confirmation-modal', ...props },
        title && React.createElement('h3', null, title),
        message && React.createElement('p', null, message),
        React.createElement(
          'button',
          { onClick: onCancel, 'data-testid': 'confirm-cancel' },
          'Cancel',
        ),
        React.createElement(
          'button',
          { onClick: onConfirm, 'data-testid': 'confirm-ok' },
          'Confirm',
        ),
      )
    : null

export const useOnlineStatus = () => true

// Icon component
export const Icon = ({ name, size, className, ...props }) =>
  React.createElement('svg', {
    'data-testid': 'cmcc-icon',
    'data-icon-name': name,
    'data-size': size,
    className,
    ...props,
  })

// AI moderation components
export const AiSettingsForm = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-ai-settings-form',
    ...props,
  })
export const AiEvaluationResult = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-ai-evaluation-result',
    ...props,
  })

// Hooks
export const useKeyboardShortcuts = () => {}
export const useSavedFilters = () => ({
  savedFilters: [],
  saveFilter: () => {},
  deleteSavedFilter: () => {},
})

// Other commonly used components
export const QuickFilterBar = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-quick-filter-bar',
    ...props,
  })
export const SlideOutPanel = ({ open, children, title, ...props }) =>
  open
    ? React.createElement(
        'div',
        { 'data-testid': 'cmcc-slide-out-panel', ...props },
        title && React.createElement('h3', null, title),
        children,
      )
    : null
export const SkeletonTable = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton-table', ...props })
export const SkeletonCard = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton-card', ...props })
export const EmptyState = ({ title, description, action, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-empty-state', ...props },
    title,
    description && React.createElement('p', null, description),
    action,
  )
export const Table = (props) =>
  React.createElement('table', { 'data-testid': 'cmcc-table', ...props })
export const ProgressBar = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-progress-bar', ...props })
export const ModerationNotes = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-moderation-notes',
    ...props,
  })
export const ActivityFeed = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-activity-feed', ...props })
export const Button = (props) =>
  React.createElement('button', { 'data-testid': 'cmcc-btn', ...props })
export const StatusPieChart = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-status-pie-chart',
    ...props,
  })
export const ModerationLineChart = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-moderation-line-chart',
    ...props,
  })
export const SpamBarChart = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-spam-bar-chart', ...props })
export const cn = (x) => x || ''

export default {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
  OfflineBanner,
  ConfirmationModal,
  useOnlineStatus,
  Icon,
  AiSettingsForm,
  AiEvaluationResult,
  useKeyboardShortcuts,
  useSavedFilters,
  QuickFilterBar,
  SlideOutPanel,
  SkeletonTable,
  SkeletonCard,
  EmptyState,
  Table,
  ProgressBar,
  ModerationNotes,
  ActivityFeed,
  Button,
  StatusPieChart,
  ModerationLineChart,
  SpamBarChart,
  cn,
}
