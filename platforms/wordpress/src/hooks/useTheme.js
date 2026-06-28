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
    const isDark = theme === 'dark'

    // Toggle on <html> for Tailwind 'class' strategy
    document.documentElement.classList.toggle('dark', isDark)

    // Toggle on <body> for WP admin compatibility
    document.body.classList.toggle('cmcc-dark-mode', isDark)

    // Also manage WP admin bar dark mode
    const adminBar = document.getElementById('wpadminbar')
    if (adminBar) {
      adminBar.classList.toggle('cmcc-dark-mode', isDark)
    }
  }, [theme])

  return { theme, toggleTheme }
}
