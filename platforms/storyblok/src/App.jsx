import React, { useState, useEffect, useCallback } from 'react'
import { NotificationBadge, useKeyboardShortcuts } from '@cmcc/ui'
import { useQueue } from './hooks/useQueue'
import { useAnalytics } from './hooks/useAnalytics'
import { useActivityLog } from './hooks/useActivityLog'
import { useSettings } from './hooks/useSettings'
import QueuePage from './pages/QueuePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import SettingsPage from './pages/SettingsPage'

const TABS = [
  { id: 'Queue', label: 'Queue', icon: '📋' },
  { id: 'Analytics', label: 'Analytics', icon: '📊' },
  { id: 'Activity', label: 'Activity Log', icon: '📜' },
  { id: 'Settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  // ── Core state ─────────────────────────────────────────────────────-
  const [activeTab, setActiveTab] = useState('Queue')
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cmcc-storyblok-theme') || 'light',
  )
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  // ── Theme toggle ────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('cmcc-storyblok-theme', next)
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // ── Domain hooks ────────────────────────────────────────────────────
  const settings = useSettings()
  const { apiHeaders } = settings
  const queue = useQueue({
    apiEndpoint: settings.settings.apiEndpoint,
    apiHeaders,
    addToast,
  })
  const analytics = useAnalytics({
    apiEndpoint: settings.settings.apiEndpoint,
    apiHeaders,
  })
  const activityLog = useActivityLog({
    apiEndpoint: settings.settings.apiEndpoint,
    apiHeaders,
  })

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useKeyboardShortcuts([
    {
      key: '?',
      description: 'Toggle keyboard shortcut help',
      handler: () => setShowShortcuts((p) => !p),
    },
    {
      key: 'Escape',
      description: 'Close panel / Cancel',
      handler: () => setShowShortcuts(false),
    },
    {
      key: 'f',
      description: 'Focus search',
      handler: () => document.querySelector('input[type="text"]')?.focus(),
    },
  ])

  // ── Tab rendering map ──────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'Queue':
        return <QueuePage queue={queue} theme={theme} addToast={addToast} />
      case 'Analytics':
        return <AnalyticsPage analytics={analytics} />
      case 'Activity':
        return <ActivityLogPage activityLog={activityLog} />
      case 'Settings':
        return (
          <SettingsPage
            settings={settings.settings}
            updateSettings={settings.updateSettings}
            addToast={addToast}
          />
        )
      default:
        return null
    }
  }

  const pendingCount = queue.items.filter((i) => i.status === 'pending').length

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        background: theme === 'dark' ? '#1f2937' : '#f9fafb',
        color: theme === 'dark' ? '#f3f4f6' : '#111827',
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: theme === 'dark' ? '#111827' : '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
          🛡️ <span style={{ color: '#2563eb' }}>CMCC</span>{' '}
          <span
            style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.875rem' }}
          >
            Storyblok Moderation
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            ⌨️
          </button>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 20px',
          background: theme === 'dark' ? '#1f2937' : '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              background:
                activeTab === tab.id
                  ? theme === 'dark'
                    ? '#374151'
                    : '#eff6ff'
                  : 'transparent',
              color:
                activeTab === tab.id
                  ? '#2563eb'
                  : theme === 'dark'
                    ? '#d1d5db'
                    : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.875rem',
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'Queue' && pendingCount > 0 && (
              <NotificationBadge
                count={pendingCount}
                type="pending"
                size="sm"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{renderTab()}</div>

      {/* ── Toast notifications ───────────────────────────────────── */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                background:
                  t.type === 'success'
                    ? '#16a34a'
                    : t.type === 'error'
                      ? '#dc2626'
                      : '#374151',
                color: '#fff',
              }}
            >
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}{' '}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Keyboard shortcuts modal ──────────────────────────────── */}
      {showShortcuts && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: '1.125rem',
                fontWeight: 600,
              }}
            >
              ⌨️ Keyboard Shortcuts
            </h2>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {[
                { key: '?', desc: 'Toggle help' },
                { key: 'Esc', desc: 'Close panel / Cancel' },
                { key: 'F', desc: 'Focus search' },
              ].map((s) => (
                <div
                  key={s.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {s.desc}
                  </span>
                  <kbd
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  >
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
