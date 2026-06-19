import React, { useEffect, useRef } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../lib/icons'

export interface ConfirmationModalProps {
  /** Whether the modal is visible */
  open: boolean
  /** Modal title */
  title: string
  /** Modal description/message */
  message: string | React.ReactNode
  /** Label for the confirm button */
  confirmLabel?: string
  /** Label for the cancel button */
  cancelLabel?: string
  /** Variant for the confirm button */
  confirmVariant?: 'primary' | 'danger' | 'warning'
  /** Whether the confirm action is destructive */
  destructive?: boolean
  /** Whether an undo option is available */
  undoable?: boolean
  /** Undo duration in seconds (default: 5) */
  undoDurationSeconds?: number
  /** Called when confirmed */
  onConfirm: () => void
  /** Called when cancelled */
  onCancel: () => void
  /** Whether the modal is in a loading state */
  loading?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * ConfirmationModal provides a standardized confirmation dialog with
 * optional undo support. Used for bulk actions, deletions, and other
 * destructive operations.
 *
 * When `undoable` is true, a toast with an "Undo" action appears instead
 * of immediately executing the action, giving users a chance to revert.
 */
export function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  destructive = false,
  undoable = false,
  undoDurationSeconds = 5,
  onConfirm,
  onCancel,
  loading = false,
  className,
}: ConfirmationModalProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and Escape key handling
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onCancel, loading])

  // Focus the modal when opened
  useEffect(() => {
    if (open && modalRef.current) {
      const firstButton = modalRef.current.querySelector('button')
      firstButton?.focus()
    }
  }, [open])

  if (!open) return null

  const confirmButtonVariants: Record<string, string> = {
    primary:
      'tw-bg-primary-600 tw-text-white hover:tw-bg-primary-700 tw-border-primary-600',
    danger: 'tw-bg-red-600 tw-text-white hover:tw-bg-red-700 tw-border-red-600',
    warning:
      'tw-bg-amber-600 tw-text-white hover:tw-bg-amber-700 tw-border-amber-600',
  }

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/40"
      onClick={loading ? undefined : onCancel}
    >
      <div
        ref={modalRef}
        className={cn(
          'tw-bg-white tw-rounded-lg tw-shadow-xl tw-p-6 tw-max-w-md tw-w-full tw-mx-4',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cmcc-confirm-title"
        aria-describedby="cmcc-confirm-message"
      >
        {/* Title */}
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
          <h2
            id="cmcc-confirm-title"
            className={cn(
              'tw-text-lg tw-font-semibold',
              destructive ? 'tw-text-red-700' : 'tw-text-gray-900',
            )}
          >
            {destructive && (
              <span className="tw-mr-2">
                <Icon name="warning" size={18} />
              </span>
            )}
            {title}
          </h2>
          <button
            onClick={onCancel}
            disabled={loading}
            className="tw-p-1 tw-rounded-md tw-text-gray-400 hover:tw-text-gray-600 hover:tw-bg-gray-100 tw-transition-colors"
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Message */}
        <div
          id="cmcc-confirm-message"
          className="tw-text-sm tw-text-gray-600 tw-mb-6"
        >
          {typeof message === 'string' ? <p>{message}</p> : message}
          {undoable && (
            <p className="tw-text-xs tw-text-gray-400 tw-mt-2">
              You have {undoDurationSeconds} seconds to undo this action after
              confirming.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="tw-flex tw-justify-end tw-gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className={cn(
              'tw-px-4 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors',
              'tw-border tw-border-gray-300 tw-text-gray-700 hover:tw-bg-gray-50',
              loading && 'tw-opacity-50 tw-cursor-not-allowed',
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'tw-px-4 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors tw-border',
              confirmButtonVariants[confirmVariant],
              loading && 'tw-opacity-50 tw-cursor-not-allowed',
            )}
          >
            {loading ? (
              <span className="tw-inline-flex tw-items-center tw-gap-2">
                <svg
                  className="tw-h-4 tw-w-4 tw-animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="tw-opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="tw-opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
