import React from 'react'
import { Keyboard, X } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from '../lib/constants'

/**
 * Keyboard shortcuts help modal.
 */
export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/40"
      onClick={onClose}
    >
      <div
        className="tw-bg-white tw-rounded-lg tw-shadow-xl tw-p-6 tw-max-w-md tw-w-full tw-mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
          <h2 className="tw-text-lg tw-font-semibold">
            <Keyboard size={20} className="tw-inline tw-mr-2" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="tw-text-gray-400 hover:tw-text-gray-600 tw-transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="tw-space-y-2">
          {KEYBOARD_SHORTCUTS.map((sk) => (
            <div
              key={sk.key}
              className="tw-flex tw-justify-between tw-items-center tw-py-1"
            >
              <span className="tw-text-sm tw-text-gray-600">
                {sk.description}
              </span>
              <kbd className="tw-px-2 tw-py-1 tw-text-xs tw-font-mono tw-bg-gray-100 tw-border tw-border-gray-300 tw-rounded">
                {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
