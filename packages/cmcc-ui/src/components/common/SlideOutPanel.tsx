import React, { useEffect, useRef } from 'react'

export interface SlideOutPanelProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  side?: 'left' | 'right'
}

export function SlideOutPanel({
  open,
  onClose,
  title,
  children,
  className = '',
  side = 'right',
}: SlideOutPanelProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const sideClasses =
    side === 'right'
      ? 'tw-top-0 tw-right-0 tw-h-full tw-border-l'
      : 'tw-top-0 tw-left-0 tw-h-full tw-border-r'

  return (
    <>
      {/* Backdrop */}
      <div
        className="tw-fixed tw-inset-0 tw-bg-black/30 tw-z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`tw-fixed tw-z-50 tw-bg-white tw-shadow-xl tw-overflow-y-auto tw-transition-transform tw-duration-300 tw-ease-in-out ${sideClasses} ${className}`}
        style={{ width: '400px', maxWidth: '100vw' }}
      >
        {title && (
          <div className="tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-3 tw-border-b tw-border-gray-200">
            <h2 className="tw-text-lg tw-font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="tw-text-gray-400 hover:tw-text-gray-600 tw-text-xl tw-leading-none"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        )}
        <div className="tw-p-4">{children}</div>
      </div>
    </>
  )
}

export default SlideOutPanel
