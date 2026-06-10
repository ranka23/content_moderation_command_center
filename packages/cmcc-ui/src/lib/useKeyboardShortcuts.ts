import { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  handler: () => void
  /** Optional – require a modifier like ctrlKey, metaKey, etc. */
  modifiers?: {
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    shiftKey?: boolean
  }
}

/**
 * Registers global keyboard shortcuts.
 * Returns a cleanup function that can be called to unregister all shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      for (const shortcut of shortcutsRef.current) {
        const modifiers = shortcut.modifiers ?? {}
        const ctrlMatch =
          modifiers.ctrlKey === undefined || event.ctrlKey === modifiers.ctrlKey
        const metaMatch =
          modifiers.metaKey === undefined || event.metaKey === modifiers.metaKey
        const altMatch =
          modifiers.altKey === undefined || event.altKey === modifiers.altKey
        const shiftMatch =
          modifiers.shiftKey === undefined ||
          event.shiftKey === modifiers.shiftKey

        if (
          event.key === shortcut.key &&
          ctrlMatch &&
          metaMatch &&
          altMatch &&
          shiftMatch
        ) {
          // Don't trigger shortcuts when typing in input/textarea/select
          const target = event.target as HTMLElement
          const isEditable =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable

          if (isEditable && !modifiers.ctrlKey && !modifiers.metaKey) {
            continue
          }

          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}

export default useKeyboardShortcuts
