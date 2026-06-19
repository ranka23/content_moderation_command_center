import React from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: Info,
}

const TOAST_STYLES = {
  success: 'tw-bg-green-600 tw-text-white',
  error: 'tw-bg-red-600 tw-text-white',
  info: 'tw-bg-gray-800 tw-text-white',
  warning: 'tw-bg-amber-600 tw-text-white',
}

/**
 * Toast notification container.
 * Renders a stack of toasts in the bottom-right corner.
 */
export default function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="tw-fixed tw-bottom-4 tw-right-4 tw-z-50 tw-flex tw-flex-col tw-gap-2">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.type] || Info
        const style = TOAST_STYLES[t.type] || TOAST_STYLES.info
        return (
          <div
            key={t.id}
            className={`cmcc-toast-enter tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-3 tw-rounded-lg tw-shadow-lg tw-text-sm tw-font-medium tw-transition-all tw-cursor-pointer ${style}`}
            onClick={() => onDismiss(t.id)}
            role="alert"
          >
            <Icon size={16} className="tw-flex-shrink-0" />
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
