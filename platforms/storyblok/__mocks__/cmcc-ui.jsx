import React from 'react'

const MockComponent = ({ children, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-ui-mock', ...props },
    children,
  )

export const QueueTable = ({ items, ...props }) => {
  const children = []
  if (items && Array.isArray(items)) {
    items.forEach((item) => {
      children.push(
        React.createElement(
          'div',
          { key: item.id, 'data-testid': 'queue-item' },
          item.title || item.id,
        ),
      )
    })
  }
  return React.createElement(
    MockComponent,
    {
      'data-cmcc': 'QueueTable',
      'data-item-count': items?.length || 0,
      ...props,
    },
    ...children,
  )
}

export const HeatmapChart = (props) =>
  React.createElement(MockComponent, {
    ...props,
    'data-cmcc': 'HeatmapChart',
    'data-has-data': props.data?.length > 0,
  })

export const SettingsForm = ({
  sections,
  _onSubmit,
  _initialValues,
  _submitLabel,
  _isSubmitting,
  ...props
}) => {
  const children = []
  if (sections && Array.isArray(sections)) {
    sections.forEach((section) => {
      children.push(
        React.createElement(
          'h3',
          { key: section.id, 'data-section': section.id },
          section.title,
        ),
      )
    })
  }
  return React.createElement(
    'div',
    { 'data-testid': 'cmcc-ui-mock', 'data-cmcc': 'SettingsForm', ...props },
    ...children,
  )
}

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

export const NotificationBadge = ({ count, type, onClick, ...props }) =>
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

export const useKeyboardShortcuts = () => {}
export const useSavedFilters = () => ({
  savedFilters: [],
  saveFilter: () => {},
  deleteSavedFilter: () => {},
})
export const cn = (x) => x || ''
export const SlideOutPanel = ({ children, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-slideout', ...props },
    children,
  )
export const SkeletonTable = () =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-skeleton-table' },
    'Loading...',
  )
export const SkeletonCard = () =>
  React.createElement('div', { 'data-testid': 'cmcc-skeleton-card' })
export const EmptyState = ({ title, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-empty-state', ...props },
    title,
  )
export const Pagination = ({ ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-pagination', ...props },
    'Pagination',
  )
export const QuickFilterBar = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-quick-filter', ...props })
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

export const ProgressBar = ({ label, ...props }) =>
  React.createElement(
    'div',
    { 'data-testid': 'cmcc-progress-bar', ...props },
    label,
  )
export const ModerationNotes = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-mod-notes', ...props })
export const ActivityFeed = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-activity-feed', ...props })

export const StatusPieChart = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-status-pie', ...props })
export const ModerationLineChart = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-mod-line', ...props })
export const SpamBarChart = ({ ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-spam-bar', ...props })
export const Button = ({ children, ...props }) =>
  React.createElement(
    'button',
    { 'data-testid': 'cmcc-btn', ...props },
    children,
  )
export const Input = (props) =>
  React.createElement('input', { 'data-testid': 'cmcc-input', ...props })
export const Select = ({ children, ...props }) =>
  React.createElement(
    'select',
    { 'data-testid': 'cmcc-select', ...props },
    children,
  )
export const Badge = ({ children, ...props }) =>
  React.createElement(
    'span',
    { 'data-testid': 'cmcc-badge', ...props },
    children,
  )
export const Card = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'cmcc-card', ...props }, children)
export const Table = ({ columns: _columns, data, ...props }) => {
  const children = []
  if (data && Array.isArray(data)) {
    data.forEach((row, i) => {
      children.push(
        React.createElement('div', { key: i, 'data-testid': 'cmcc-table-row' }),
      )
    })
  }
  return React.createElement(
    'div',
    { 'data-testid': 'cmcc-table', ...props },
    ...children,
  )
}
export const ConfirmationModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}) =>
  open
    ? React.createElement(
        'div',
        { 'data-testid': 'cmcc-confirmation-modal' },
        React.createElement('h3', null, title),
        React.createElement('p', null, message),
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

export const ErrorBoundary = ({ children }) =>
  React.createElement(React.Fragment, null, children)

// Offline detection
export const OfflineBanner = (props) =>
  React.createElement('div', { 'data-testid': 'cmcc-offline-banner', ...props })
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

const UI = {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
  useKeyboardShortcuts,
  useSavedFilters,
  cn,
  SlideOutPanel,
  SkeletonTable,
  SkeletonCard,
  EmptyState,
  Pagination,
  QuickFilterBar,
  ProgressBar,
  ModerationNotes,
  ActivityFeed,
  AiEvaluationResult,
  AiSettingsForm,
  StatusPieChart,
  ModerationLineChart,
  SpamBarChart,
  Button,
  Input,
  Select,
  Badge,
  Card,
  Table,
  ConfirmationModal,
  ErrorBoundary,
  OfflineBanner,
  useOnlineStatus,
  Icon,
}

export default UI
