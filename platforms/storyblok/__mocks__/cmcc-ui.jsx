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
  onSubmit,
  initialValues,
  submitLabel,
  isSubmitting,
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

export default {
  QueueTable,
  HeatmapChart,
  SettingsForm,
  ActionButton,
  NotificationBadge,
}
