import React from 'react'
import { Keyboard, X } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from '../lib/constants'

/**
 * Keyboard shortcuts help modal.
 * 2026 modern design with glass overlay and refined card styling.
 */
export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      className="cmcc-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="cmcc-modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmcc-modal-header">
          <h2 className="cmcc-modal-title">
            <Keyboard size={20} className="tw-inline tw-mr-2 tw-align-middle" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="cmcc-modal-close"
            aria-label="Close shortcuts"
          >
            <X size={18} />
          </button>
        </div>
        <div className="cmcc-modal-body">
          <div className="tw-space-y-2">
            {KEYBOARD_SHORTCUTS.map((sk) => (
              <div
                key={sk.key}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-border-b tw-border-secondary last:tw-border-0"
              >
                <span
                  className="tw-text-sm"
                  style={{ color: 'var(--cmcc-text-secondary)' }}
                >
                  {sk.description}
                </span>
                <kbd
                  style={{
                    padding: '3px 10px',
                    fontSize: 'var(--cmcc-xs)',
                    fontFamily: 'var(--cmcc-font-mono)',
                    background: 'var(--cmcc-bg-tertiary)',
                    border: '1px solid var(--cmcc-border-primary)',
                    borderRadius: 'var(--cmcc-radius-md)',
                    color: 'var(--cmcc-text-primary)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
