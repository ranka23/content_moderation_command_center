import React, { useState, useEffect, useCallback, startTransition } from 'react'
import { useKeyboardShortcuts, OfflineBanner } from '@cmcc/ui'
import { mapInitialTab } from './lib/constants'
import { useQueue } from './hooks/useQueue'
import { useAnalytics } from './hooks/useAnalytics'
import { useActivityLog } from './hooks/useActivityLog'
import { useSettings } from './hooks/useSettings'
import { useCollaboration } from './hooks/useCollaboration'
import { useReports } from './hooks/useReports'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import { useOnboarding } from './hooks/useOnboarding'
import QueuePage from './pages/QueuePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import TopBar from './components/TopBar'
import TabNavigation from './components/TabNavigation'
import OnboardingOverlay from './components/OnboardingOverlay'
import ShortcutsModal from './components/ShortcutsModal'
import ToastContainer from './components/ToastContainer'

export default function App() {
  // ── Extracted hooks ────────────────────────────────────────────────
  const { theme, toggleTheme } = useTheme()
  const { toasts, addToast, removeToast } = useToast()
  const { showOnboarding, dismissOnboarding } = useOnboarding()

  // ── Active tab (initialized from WP admin page slug) ──────────────
  const [activeTab, setActiveTab] = useState(() =>
    mapInitialTab(window.cmccData?.initialTab || ''),
  )

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
          reports.fetchActivityFeed(analytics.analyticsDateRange)
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

  // ── Map tab IDs to WP admin page slugs ────────────────────────
  const TAB_TO_SLUG = {
    queue: 'cmcc',
    analytics: 'cmcc-analytics',
    'activity-log': 'cmcc-activity',
    reports: 'cmcc-reports',
    settings: 'cmcc-settings',
  }

  // ── Handle tab change: set state, update URL, highlight WP menu ──
  const handleTabChange = useCallback(
    (tabId) => {
      // UX4 Fix: Clear search input when switching tabs
      const searchInput = document.querySelector('.cmcc-search-input')
      if (searchInput) searchInput.value = ''

      setActiveTab(tabId)

      // Use proper WP page slug for accurate URL mapping
      const pageSlug = TAB_TO_SLUG[tabId] || 'cmcc'
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', `?page=${pageSlug}`)
      }

      // Fix WP admin sidebar submenu active state for ALL tabs
      document
        .querySelectorAll(
          '#adminmenu .wp-submenu a[href^="admin.php?page=cmcc"]',
        )
        .forEach((el) => {
          const href = el.getAttribute('href') || ''
          const isCurrent =
            (tabId === 'queue' &&
              href.includes('page=cmcc') &&
              !href.includes('page=cmcc-')) ||
            (tabId !== 'queue' && href.includes(`page=${pageSlug}`))
          el.closest('li')?.classList.toggle('current', isCurrent)
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
    {
      key: 'Escape',
      description: 'Close panel / Cancel',
      handler: () => {
        if (showShortcuts) setShowShortcuts(false)
      },
    },
    {
      key: 'a',
      description: 'Approve selected item',
      handler: () => {
        const item = queue.detailItem
        if (item && queue.handleItemAction && activeTab === 'queue') {
          const id = item.id || item.originalId
          queue.handleItemAction('approve', id)
          queue.setDetailItem(null)
        }
      },
    },
    {
      key: 'r',
      description: 'Reject selected item',
      handler: () => {
        const item = queue.detailItem
        if (item && queue.handleItemAction && activeTab === 'queue') {
          const id = item.id || item.originalId
          queue.handleItemAction('reject', id)
          queue.setDetailItem(null)
        }
      },
    },
    {
      key: 's',
      description: 'Mark as Spam',
      handler: () => {
        const item = queue.detailItem
        if (item && queue.handleItemAction && activeTab === 'queue') {
          const id = item.id || item.originalId
          queue.handleItemAction('spam', id)
          queue.setDetailItem(null)
        }
      },
    },
    {
      key: 'd',
      description: 'Defer selected item',
      handler: () => {
        const item = queue.detailItem
        if (item && queue.handleItemAction && activeTab === 'queue') {
          const id = item.id || item.originalId
          queue.handleItemAction('defer', id)
          queue.setDetailItem(null)
        }
      },
    },
    {
      key: 'v',
      description: 'View item details',
      handler: () => {
        const viewBtn = document.querySelector('[title="View details"]')
        if (viewBtn) viewBtn.click()
      },
    },
  ])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={`cmcc-admin cmcc-theme-${theme}`}>
      {/* ── Onboarding overlay ─────────────────────────────────────── */}
      {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}

      {/* ── Offline detection banner ──────────────────────────────── */}
      <OfflineBanner />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <TopBar theme={theme} toggleTheme={toggleTheme} activeTab={activeTab} />

      {/* ── Tab navigation with badges ─────────────────────────────── */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        queueStats={analytics.queueStats}
      />

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
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* ── Keyboard shortcuts modal ───────────────────────────────── */}
      <ShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  )
}
