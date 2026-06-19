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

export default {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
  OfflineBanner,
  useOnlineStatus,
  Icon,
  AiSettingsForm,
  AiEvaluationResult,
  useKeyboardShortcuts,
  useSavedFilters,
}
