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

export default {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
}
