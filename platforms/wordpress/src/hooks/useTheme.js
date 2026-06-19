import { useState, useCallback, useEffect } from 'react'

/**
 * Theme management hook.
 * Persists theme preference in localStorage and applies it to the DOM.
 */
export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cmcc-theme') || 'light',
  )

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('cmcc-theme', next)
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.classList.toggle('cmcc-dark-mode', theme === 'dark')
  }, [theme])

  return { theme, toggleTheme }
}
