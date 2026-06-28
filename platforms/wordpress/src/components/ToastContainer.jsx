import React from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const TOAST_STYLES = {
  success: 'cmcc-toast-success',
  error: 'cmcc-toast-error',
  info: 'cmcc-toast-info',
  warning: 'cmcc-toast-warning',
}

/**
 * Toast notification container.
 * Renders a stack of premium gradient toasts in the bottom-right corner.
 * 2026 design with gradient backgrounds and spring animations.
 */
export default function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="cmcc-toast-container">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.type] || Info
        const style = TOAST_STYLES[t.type] || TOAST_STYLES.info
        return (
          <div
            key={t.id}
            className={`cmcc-toast ${style} cmcc-toast-enter`}
            onClick={() => onDismiss(t.id)}
            role="alert"
          >
            <span className="cmcc-toast-icon">
              <Icon size={18} />
            </span>
            <span className="cmcc-toast-message">{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
