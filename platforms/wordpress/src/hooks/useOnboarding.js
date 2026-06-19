import { useState, useCallback } from 'react'

/**
 * Onboarding state hook.
 * Persists dismissal in localStorage so it only shows once.
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('cmcc-onboarding-dismissed'),
  )

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem('cmcc-onboarding-dismissed', 'true')
  }, [])

  return { showOnboarding, dismissOnboarding }
}
