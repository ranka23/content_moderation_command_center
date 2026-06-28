import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../lib/icons'

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
  const [closing, setClosing] = useState(false)
  // entering state: true while the slide-in animation plays
  const [entering, setEntering] = useState(false)
  const mountedRef = useRef(false)

  // When open becomes true, kick off the enter animation
  useEffect(() => {
    if (open) {
      setEntering(true)
      // After the animation completes (matches CSS duration), clear entering flag
      const timer = setTimeout(() => {
        setEntering(false)
      }, 380) // slightly longer than CSS transition (350ms) for safety
      mountedRef.current = true
      return () => clearTimeout(timer)
    }
    setEntering(false)
    return undefined
  }, [open])

  const handleClose = useCallback((): void => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 280) // matches the CSS transition duration
  }, [onClose])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleClose])

  if (!open && !closing) return null

  // Guard against SSR — document.body is not available on the server
  if (typeof document === 'undefined') return null

  const sideClasses = side === 'right' ? 'cmcc-panel-right' : 'cmcc-panel-left'

  // Determine panel animation state
  // When entering: animate from off-screen to visible
  // When open and not entering/closing: fully visible
  // When closing: animate from visible to off-screen
  let animClass = 'cmcc-panel-open'
  if (entering) {
    animClass = 'cmcc-panel-entering'
  } else if (closing) {
    animClass = 'cmcc-panel-closing'
  }

  const backdropClass =
    open && !closing ? 'cmcc-backdrop-visible' : 'cmcc-backdrop-hidden'

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`cmcc-slide-backdrop ${backdropClass}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`cmcc-slide-panel ${animClass} ${sideClasses} ${className}`}
      >
        {title && (
          <div className="cmcc-panel-header">
            <h2 className="cmcc-panel-title">{title}</h2>
            <button
              onClick={handleClose}
              className="cmcc-panel-close-btn"
              aria-label="Close panel"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        )}
        <div className="cmcc-panel-body">{children}</div>
      </div>
    </>
  )

  return createPortal(panel, document.body)
}

export default SlideOutPanel
