import React from 'react'
import { TABS } from '../lib/constants'
import { NotificationBadge } from '@cmcc/ui'
import {
  ListChecks,
  BarChart3,
  History,
  FileText,
  Settings,
} from 'lucide-react'

const TAB_ICONS = {
  queue: ListChecks,
  analytics: BarChart3,
  'activity-log': History,
  reports: FileText,
  settings: Settings,
}

/**
 * Tab navigation bar with icons, labels, and notification badges.
 */
export default function TabNavigation({
  activeTab,
  onTabChange,
  queueStats,
}) {
  return (
    <div className="cmcc-tab-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = TAB_ICONS[tab.id]
        return (
          <button
            key={tab.id}
            className={`cmcc-tab${isActive ? ' cmcc-tab-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
          >
            {Icon && <Icon size={16} className="tw-inline tw-mr-1" />}
            {tab.label}
            {tab.id === 'queue' && queueStats.total > 0 && (
              <NotificationBadge
                count={queueStats.pending}
                type="pending"
                size="sm"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
