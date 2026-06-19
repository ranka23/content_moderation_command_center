import React from 'react'
import { ConfirmationModal } from '@cmcc/ui'

/**
 * Configuration for each action type.
 */
const ACTION_CONFIG = {
  approve: {
    title: 'Approve Item',
    confirmLabel: 'Approve',
    confirmVariant: 'primary',
    destructive: false,
  },
  reject: {
    title: 'Reject Item',
    confirmLabel: 'Reject',
    confirmVariant: 'danger',
    destructive: true,
  },
  spam: {
    title: 'Mark as Spam',
    confirmLabel: 'Mark as Spam',
    confirmVariant: 'warning',
    destructive: true,
  },
  defer: {
    title: 'Defer Item',
    confirmLabel: 'Defer',
    confirmVariant: 'primary',
    destructive: false,
  },
}

/**
 * ConfirmActionDialog — confirmation dialog for single item actions
 * (approve, reject, spam, defer).
 *
 * Wraps the shared ConfirmationModal from @cmcc/ui with action-specific
 * labels and styling.
 */
export default function ConfirmActionDialog({
  action,
  item,
  open,
  loading,
  onConfirm,
  onCancel,
}) {
  if (!action || !open) return null

  const config = ACTION_CONFIG[action] || {
    title: 'Confirm Action',
    confirmLabel: 'Confirm',
    confirmVariant: 'primary',
    destructive: false,
  }

  const itemTitle = item?.title || item?.id || 'this item'

  return (
    <ConfirmationModal
      open={open}
      title={config.title}
      message={`Are you sure you want to ${action} "${typeof itemTitle === 'string' && itemTitle.length > 80 ? itemTitle.slice(0, 80) + '…' : itemTitle}"?`}
      confirmLabel={config.confirmLabel}
      cancelLabel="Cancel"
      confirmVariant={config.confirmVariant}
      destructive={config.destructive}
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    />
  )
}
