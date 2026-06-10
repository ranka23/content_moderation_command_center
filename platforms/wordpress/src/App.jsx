import React, { useState, useEffect, useCallback, startTransition } from 'react'
import { useKeyboardShortcuts, NotificationBadge } from '@cmcc/ui'
import { TABS, KEYBOARD_SHORTCUTS, mapInitialTab } from './lib/constants'
import { useQueue } from './hooks/useQueue'
import { useAnalytics } from './hooks/useAnalytics'
import { useActivityLog } from './hooks/useActivityLog'
import { useSettings } from './hooks/useSettings'
import { useCollaboration } from './hooks/useCollaboration'
import { useReports } from './hooks/useReports'
import QueuePage from './pages/QueuePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  // ── Active tab (initialized from WP admin page slug) ──────────────
  const [activeTab, setActiveTab] = useState(() =>
    mapInitialTab(window.cmccData?.initialTab || ''),
  )

  // ── Theme (persisted in localStorage) ─────────────────────────────
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cmcc-theme') || 'light',
  )
  const toggleTheme = useCallback(() => {
    setTheme((p) => {
      const n = p === 'light' ? 'dark' : 'light'
      localStorage.setItem('cmcc-theme', n)
      return n
    })
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.classList.toggle('cmcc-dark-mode', theme === 'dark')
  }, [theme])

  // ── Onboarding (dismissed permanently once closed) ────────────────
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('cmcc-onboarding-dismissed'),
  )
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem('cmcc-onboarding-dismissed', 'true')
  }, [])

  // ── Toast notifications (4 s auto-dismiss) ──────────────────────
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }, [])

  // ── Keyboard shortcuts modal ─────────────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ── Initialize all domain hooks ──────────────────────────────────
  const queue = useQueue({ addToast })
  const analytics = useAnalytics({ addToast })
  const activityLog = useActivityLog({ addToast })
  const settings = useSettings({ addToast })
  const collaboration = useCollaboration({ addToast })
  const reports = useReports({ addToast })

  // ── Load data when the active tab changes ─────────────────────────
  useEffect(() => {
    startTransition(() => {
      switch (activeTab) {
        case 'queue':
          queue.fetchQueue(queue.queuePage)
          break
        case 'analytics':
          analytics.fetchAnalytics(analytics.analyticsDateRange)
          break
        case 'activity-log':
          activityLog.fetchActivityLog(activityLog.logPage)
          break
        case 'reports':
          analytics.fetchAnalytics(analytics.analyticsDateRange)
          reports.fetchUserReputation()
          reports.fetchActivityFeed()
          break
        case 'settings':
          settings.fetchSettings()
          break
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    queue.fetchQueue,
    queue.queuePage,
    analytics.fetchAnalytics,
    analytics.analyticsDateRange,
    activityLog.fetchActivityLog,
    activityLog.logPage,
    reports.fetchUserReputation,
    reports.fetchActivityFeed,
    settings.fetchSettings,
  ])

  // ── Handle tab change: set state, update URL, highlight WP menu ──
  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId)

      const tabPageMap = {
        queue: 'cmcc',
        analytics: 'cmcc-analytics',
        'activity-log': 'cmcc',
        reports: 'cmcc-reports',
        settings: 'cmcc-settings',
      }
      const page = tabPageMap[tabId] || 'cmcc'
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', `?page=${page}`)
      }
      document
        .querySelectorAll(
          '#adminmenu .wp-submenu a[href^="admin.php?page=cmcc"]',
        )
        .forEach((el) => {
          const href = el.getAttribute('href') || ''
          el.closest('li')?.classList.toggle(
            'current',
            href.includes(`page=${page}`),
          )
        })

      if (tabId === 'queue') queue.setQueuePage(1)
      else if (tabId === 'activity-log') activityLog.setLogPage(1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue.setQueuePage, activityLog.setLogPage],
  )

  // ── Global keyboard shortcuts ─────────────────────────────────────
  useKeyboardShortcuts([
    {
      key: '?',
      description: 'Toggle keyboard shortcut help',
      handler: () => setShowShortcuts((p) => !p),
    },
    {
      key: 'f',
      description: 'Focus search',
      handler: () => document.querySelector('input[type="text"]')?.focus(),
    },
  ])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={`cmcc-admin cmcc-theme-${theme}`}>
      {/* ── Onboarding overlay ─────────────────────────────────────── */}
      {showOnboarding && (
        <div className="cmcc-onboarding-overlay">
          <div className="cmcc-onboarding-card">
            <button
              className="cmcc-onboarding-skip"
              onClick={dismissOnboarding}
            >
              ✕
            </button>
            <h3>Welcome to CMCC 🛡️</h3>
            <p>
              Your Content Moderation Command Center is ready. Here&apos;s how
              to get started:
            </p>
            <div className="cmcc-onboarding-steps">
              {[
                {
                  num: 1,
                  title: 'Review the Queue',
                  desc: 'Go to the Queue tab to review pending content.',
                },
                {
                  num: 2,
                  title: 'Take Action',
                  desc: 'Approve, reject, flag, or mark items as spam.',
                },
                {
                  num: 3,
                  title: 'Configure Settings',
                  desc: 'Set up spam firewall rules and auto-moderation.',
                },
                {
                  num: 4,
                  title: 'View Analytics',
                  desc: 'Monitor moderation activity and performance.',
                },
              ].map((s, i) => (
                <div
                  key={s.num}
                  className={`cmcc-onboarding-step${i === 0 ? ' active' : ''}`}
                >
                  <span className="cmcc-onboarding-step-number">{s.num}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="cmcc-onboarding-progress">
              <div
                className="cmcc-onboarding-progress-bar"
                style={{ width: '25%' }}
              />
            </div>
            <button
              className="tw-rounded tw-bg-primary-600 tw-text-white tw-px-6 tw-py-2 tw-text-sm hover:tw-bg-primary-700 tw-transition-colors"
              onClick={dismissOnboarding}
            >
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="cmcc-top-bar">
        <div className="cmcc-top-bar-left">
          <h1 className="cmcc-title">
            <span className="cmcc-title-icon">🛡️</span>
            CMCC <span className="cmcc-title-light">Content Moderation</span>
          </h1>
        </div>
        <div className="cmcc-top-bar-right">
          <button
            className="cmcc-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <a
            className="cmcc-donate-link"
            href="https://rzp.io/rzp/IbvR3pMx"
            target="_blank"
            rel="noopener noreferrer"
            title="Support the creator — Donate $1"
          >
            ❤️ Donate $1
          </a>
        </div>
      </div>

      {/* ── Tab navigation with badges ─────────────────────────────── */}
      <div className="cmcc-tab-nav">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`cmcc-tab${isActive ? ' cmcc-tab-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              role="tab"
              aria-selected={isActive}
            >
              {tab.id === 'queue' && '📋 '}
              {tab.id === 'analytics' && '📊 '}
              {tab.id === 'activity-log' && '📜 '}
              {tab.id === 'reports' && '📄 '}
              {tab.id === 'settings' && '⚙️ '}
              {tab.label}
              {tab.id === 'queue' && analytics.queueStats.total > 0 && (
                <NotificationBadge
                  count={analytics.queueStats.pending}
                  type="pending"
                  size="sm"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className="cmcc-tab-content">
        {activeTab === 'queue' && (
          <QueuePage
            queue={queue}
            collaboration={collaboration}
            theme={theme}
            queueStats={analytics.queueStats}
            addToast={addToast}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsPage analytics={analytics} theme={theme} />
        )}
        {activeTab === 'activity-log' && (
          <ActivityLogPage activityLog={activityLog} />
        )}
        {activeTab === 'reports' && (
          <ReportsPage
            reports={reports}
            analytics={analytics}
            collaboration={collaboration}
            analyticsDateRange={analytics.analyticsDateRange}
            addToast={addToast}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPage settings={settings} addToast={addToast} />
        )}
      </div>

      {/* ── Toast notifications ────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div className="tw-fixed tw-bottom-4 tw-right-4 tw-z-50 tw-flex tw-flex-col tw-gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-3 tw-rounded-lg tw-shadow-lg tw-text-sm tw-font-medium tw-transition-all tw-cursor-pointer ${
                t.type === 'success'
                  ? 'tw-bg-green-600 tw-text-white'
                  : t.type === 'error'
                    ? 'tw-bg-red-600 tw-text-white'
                    : 'tw-bg-gray-800 tw-text-white'
              }`}
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            >
              <span>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Keyboard shortcuts modal ───────────────────────────────── */}
      {showShortcuts && (
        <div
          className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/40"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="tw-bg-white tw-rounded-lg tw-shadow-xl tw-p-6 tw-max-w-md tw-w-full tw-mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
              <h2 className="tw-text-lg tw-font-semibold">
                ⌨️ Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="tw-text-gray-400 hover:tw-text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="tw-space-y-2">
              {KEYBOARD_SHORTCUTS.map((sk) => (
                <div
                  key={sk.key}
                  className="tw-flex tw-justify-between tw-items-center tw-py-1"
                >
                  <span className="tw-text-sm tw-text-gray-600">
                    {sk.description}
                  </span>
                  <kbd className="tw-px-2 tw-py-1 tw-text-xs tw-font-mono tw-bg-gray-100 tw-border tw-border-gray-300 tw-rounded">
                    {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
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
