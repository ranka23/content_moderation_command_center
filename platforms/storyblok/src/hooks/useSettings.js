import { useState, useCallback } from 'react'

const DEFAULT_SETTINGS = {
  apiEndpoint: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  apiKey: '',
  autoModerate: false,
  spamThreshold: 0.7,
  notifyOnFlag: true,
  maxQueueSize: 500,
  theme: 'light',
}

const STORAGE_KEY = 'cmcc-storyblok-settings'

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* storage may be unavailable */ }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      persistSettings(next)
      return next
    })
  }, [])

  const apiHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' }
    if (settings.apiKey) headers['X-API-Key'] = settings.apiKey
    return headers
  }, [settings.apiKey])

  return { settings, updateSettings, apiHeaders }
}
