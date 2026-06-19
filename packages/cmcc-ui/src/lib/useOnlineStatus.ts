import { useState, useEffect } from 'react'

/**
 * Hook that tracks the browser's online/offline status.
 * Returns `true` when the browser is online, `false` when offline.
 * Listens for `online`/`offline` events on the window and cleans up on unmount.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true)
    const handleOffline = (): void => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return (): void => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export default useOnlineStatus
