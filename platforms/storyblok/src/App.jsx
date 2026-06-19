import React, { useState, useEffect, useCallback } from 'react'
import { NotificationBadge, useKeyboardShortcuts } from '@cmcc/ui'
import { OfflineBanner } from '@cmcc/ui'
import {
  Shield,
  Moon,
  Sun,
  Keyboard,
  CheckCircle,
  XCircle,
  Info,
  ListChecks,
  BarChart3,
  History,
  Settings,
  FileText,
} from 'lucide-react'
import { useQueue } from './hooks/useQueue'
import { useAnalytics } from './hooks/useAnalytics'
import { useActivityLog } from './hooks/useActivityLog'
import { useSettings } from './hooks/useSettings'
import QueuePage from './pages/QueuePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'

const TABS = [
  { id: 'Queue', label: 'Queue', icon: ListChecks },
  { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'Activity', label: 'Activity Log', icon: History },
  { id: 'Reports', label: 'Reports', icon: FileText },
  { id: 'Settings', label: 'Settings', icon: Settings },
]

export default function App() {
  // ── Core state ─────────────────────────────────────────────────────-
  const [activeTab, setActiveTab] = useState('Queue')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('cmcc-storyblok-theme') || 'light'
    } catch {
      return 'light'
    }
  })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('cmcc-storyblok-onboarding-dismissed')
    } catch {
      return true
    }
  })
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

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem('cmcc-storyblok-onboarding-dismissed', 'true')
  }, [])

  const handleShowWelcome = useCallback(() => {
    localStorage.removeItem('cmcc-storyblok-onboarding-dismissed')
    setShowOnboarding(true)
  }, [])

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

  // ── Fetch data on tab change ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'Queue') {
      queue.fetchItems()
    } else if (activeTab === 'Reports') {
      queue.fetchItems()
    }
  }, [activeTab, queue])

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useKeyboardShortcuts([
    {
      key: 'a',
      description: 'Approve first queue item',
      handler: () => {
        if (activeTab !== 'Queue') return
        queue.moderateItem(queue.items[0]?.id, 'approve')
      },
    },
    {
      key: 'r',
      description: 'Reject first queue item',
      handler: () => {
        if (activeTab !== 'Queue') return
        queue.moderateItem(queue.items[0]?.id, 'reject')
      },
    },
    {
      key: 's',
      description: 'Mark first queue item as spam',
      handler: () => {
        if (activeTab !== 'Queue') return
        queue.moderateItem(queue.items[0]?.id, 'spam')
      },
    },
    {
      key: 'd',
      description: 'Defer first queue item',
      handler: () => {
        if (activeTab !== 'Queue') return
        queue.moderateItem(queue.items[0]?.id, 'defer')
      },
    },
    {
      key: 'v',
      description: 'View first queue item details',
      handler: () => {
        if (activeTab !== 'Queue') return
        const item = queue.items[0]
        if (item) addToast(`Item: ${item.title || item.id}`)
      },
    },
    {
      key: 'f',
      description: 'Focus search',
      handler: () => document.querySelector('input[type="text"]')?.focus(),
    },
    {
      key: 'Escape',
      description: 'Close panel / Cancel',
      handler: () => setShowShortcuts(false),
    },
    {
      key: '?',
      description: 'Toggle keyboard shortcut help',
      handler: () => setShowShortcuts((p) => !p),
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
      case 'Reports':
        return (
          <ReportsPage
            apiEndpoint={settings.settings.apiEndpoint}
            apiHeaders={apiHeaders}
            addToast={addToast}
          />
        )
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
  const spamCount = queue.items.filter((i) => i.status === 'spam').length

  return (
    <div className="cmcc-storyblok-app">
      {/* ── Onboarding wizard ────────────────────────────────────── */}
      {showOnboarding && (
        <div className="cmcc-onboarding-overlay">
          <div className="cmcc-onboarding-content">
            <h2>Welcome to CMCC Storyblok Moderation</h2>
            <div className="cmcc-onboarding-steps">
              {[
                {
                  num: 1,
                  title: 'Monitor your Queue',
                  desc: 'Review and moderate incoming content from the Queue tab.',
                },
                {
                  num: 2,
                  title: 'Review Analytics',
                  desc: 'View performance metrics and moderation trends.',
                },
                {
                  num: 3,
                  title: 'Configure Settings',
                  desc: 'Customize API endpoints and moderation preferences.',
                },
              ].map((step) => (
                <div key={step.num} className="cmcc-onboarding-step">
                  <div className="cmcc-onboarding-step-num">{step.num}</div>
                  <div>
                    <div className="cmcc-onboarding-step-title">
                      {step.title}
                    </div>
                    <div className="cmcc-onboarding-step-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={dismissOnboarding} className="cmcc-onboarding-btn">
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="cmcc-topbar">
        <h1 className="cmcc-topbar-title">
          <Shield size={20} style={{ display: 'inline' }} />{' '}
          <span style={{ color: '#2563eb' }}>CMCC</span>
          <span className="cmcc-topbar-subtitle">Storyblok Moderation</span>
        </h1>
        <div className="cmcc-topbar-actions">
          <button onClick={toggleTheme} className="cmcc-topbar-btn">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="cmcc-topbar-btn"
            style={{ fontSize: '0.875rem' }}
          >
            <Keyboard size={18} />
          </button>
          <button
            onClick={handleShowWelcome}
            className="cmcc-topbar-btn"
            title="Show welcome"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      <OfflineBanner />

      {/* ── Tab navigation ────────────────────────────────────────── */}
      <div className="cmcc-tabnav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`cmcc-tab-btn${activeTab === tab.id ? ' cmcc-tab-btn--active' : ''}`}
          >
            {(() => {
              const IconComp = tab.icon
              return (
                <>
                  <IconComp size={16} style={{ display: 'inline' }} />{' '}
                  {tab.label}
                </>
              )
            })()}
            {tab.id === 'Queue' && (
              <>
                {pendingCount > 0 && (
                  <NotificationBadge
                    count={pendingCount}
                    type="pending"
                    size="sm"
                  />
                )}
                {spamCount > 0 && (
                  <NotificationBadge count={spamCount} type="spam" size="sm" />
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="cmcc-main-content">{renderTab()}</div>

      {/* ── Toast notifications ───────────────────────────────────── */}
      {toasts.length > 0 && (
        <div className="cmcc-toasts-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className={`cmcc-toast cmcc-toast-${t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : 'info'}`}
            >
              {t.type === 'success' ? (
                <CheckCircle size={16} style={{ display: 'inline' }} />
              ) : t.type === 'error' ? (
                <XCircle size={16} style={{ display: 'inline' }} />
              ) : (
                <Info size={16} style={{ display: 'inline' }} />
              )}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Keyboard shortcuts modal ──────────────────────────────── */}
      {showShortcuts && (
        <div
          className="cmcc-shortcuts-overlay"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="cmcc-shortcuts-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              <>
                <Keyboard
                  size={20}
                  style={{ display: 'inline', marginRight: 8 }}
                />
                Keyboard Shortcuts
              </>
            </h2>
            <div className="cmcc-shortcuts-list">
              {[
                { key: 'A', desc: 'Approve first queue item' },
                { key: 'R', desc: 'Reject first queue item' },
                { key: 'S', desc: 'Mark first queue item as spam' },
                { key: 'D', desc: 'Defer first queue item' },
                { key: 'V', desc: 'View first queue item details' },
                { key: 'F', desc: 'Focus search' },
                { key: 'Esc', desc: 'Close panel / Cancel' },
                { key: '?', desc: 'Toggle help' },
              ].map((s) => (
                <div key={s.key} className="cmcc-shortcuts-row">
                  <span className="cmcc-shortcuts-desc">{s.desc}</span>
                  <kbd className="cmcc-kbd">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
