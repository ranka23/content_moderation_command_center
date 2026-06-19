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

// Hooks
export const useKeyboardShortcuts = () => {}
export const useSavedFilters = () => ({
  savedFilters: [],
  saveFilter: () => {},
  deleteSavedFilter: () => {},
})

// UI components
export const Button = (props) =>
  React.createElement('button', { 'data-testid': 'cmcc-btn', ...props })
export const Input = (props) =>
  React.createElement('input', { 'data-testid': 'cmcc-input', ...props })
export const Select = (props) =>
  React.createElement('select', { 'data-testid': 'cmcc-select', ...props })
export const Badge = ({ children, ...props }) =>
  React.createElement(
    'span',
    { 'data-testid': 'cmcc-badge', ...props },
    children,
  )
export const Card = ({ children, title, action, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-card', ...props },
    title && React.createElement('div', null, title),
    action && React.createElement('div', null, action),
    children,
  )
export const Pagination = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-pagination', ...props })
export const Table = ({
  columns: _columns,
  data: _data,
  rowKey: _rowKey,
  ...props
}) => React.createElement('table', { 'data-testid': 'cmcc-table', ...props })
export const useColumnResize = () => ({})
export const cn = (...classes) => classes.filter(Boolean).join(' ')

// Skeleton components
export const Skeleton = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton', ...props })
export const SkeletonTable = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton-table', ...props })
export const SkeletonCard = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton-card', ...props })

// Common components
export const EmptyState = ({
  icon: _icon,
  title,
  description,
  action,
  ...props
}) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-empty-state', ...props },
    title,
    description && React.createElement('p', null, description),
    action,
  )
export const SlideOutPanel = ({ open, children, title, ...props }) =>
  open
    ? React.createElement(
        'div',
        { 'data-testid': 'cmcc-slide-out-panel', ...props },
        title && React.createElement('h3', null, title),
        children,
      )
    : null
export const ProgressBar = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-progress-bar', ...props })
export const ConfirmationModal = ({ open, children, ...props }) =>
  open
    ? React.createElement(
        'div',
        { 'data-testid': 'cmcc-confirmation-modal', ...props },
        children,
      )
    : null
export const QuickFilterBar = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-quick-filter-bar',
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

// Icon component
export const Icon = ({ name, size, className, ...props }) =>
  React.createElement('svg', {
    'data-testid': 'cmcc-icon',
    'data-icon-name': name,
    'data-size': size,
    className,
    ...props,
  })

// Offline detection
export const OfflineBanner = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-offline-banner', ...props })
export const useOnlineStatus = () => true

// Collaboration components
export const ModerationNotes = (props) =>
  React.createElement('div', {
    'data-testid': 'cmcc-moderation-notes',
    ...props,
  })
export const ActivityFeed = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-activity-feed', ...props })

// Chart components
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

export default {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
  useKeyboardShortcuts,
  useSavedFilters,
  Button,
  Input,
  Select,
  Badge,
  Card,
  Pagination,
  Table,
  useColumnResize,
  cn,
  Skeleton,
  SkeletonTable,
  SkeletonCard,
  EmptyState,
  SlideOutPanel,
  ProgressBar,
  ConfirmationModal,
  QuickFilterBar,
  ModerationNotes,
  ActivityFeed,
  StatusPieChart,
  ModerationLineChart,
  SpamBarChart,
  AiSettingsForm,
  AiEvaluationResult,
  Icon,
  OfflineBanner,
  useOnlineStatus,
}
