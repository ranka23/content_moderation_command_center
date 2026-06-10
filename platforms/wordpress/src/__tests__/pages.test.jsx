/**
 * Tests for CMCC WordPress page components
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the @cmcc/ui components
jest.mock('@cmcc/ui', () => {
  const React = require('react')
  return {
    QueueTable: (props) =>
      React.createElement('div', {
        'data-testid': 'queue-table',
        'data-items': JSON.stringify(props.items || []),
      }),
    HeatmapChart: () =>
      React.createElement('div', { 'data-testid': 'heatmap-chart' }),
    SettingsForm: (_props) =>
      React.createElement('div', { 'data-testid': 'settings-form' }),
    NotificationBadge: ({ count }) =>
      React.createElement(
        'span',
        { 'data-testid': 'notification-badge' },
        String(count),
      ),
    ActionButton: ({ children, onClick }) =>
      React.createElement(
        'button',
        { onClick, 'data-testid': 'action-button' },
        children,
      ),
    useKeyboardShortcuts: () => {},
    useSavedFilters: () => ({
      savedFilters: [],
      saveFilter: jest.fn(),
      deleteSavedFilter: jest.fn(),
    }),
    StatusPieChart: () =>
      React.createElement('div', { 'data-testid': 'status-pie-chart' }),
    ModerationLineChart: () =>
      React.createElement('div', { 'data-testid': 'moderation-line-chart' }),
    SpamBarChart: () =>
      React.createElement('div', { 'data-testid': 'spam-bar-chart' }),
  }
})

jest.mock('../lib/constants', () => ({
  TABS: [
    { id: 'queue', label: 'Queue' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'activity-log', label: 'Activity Log' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ],
  KEYBOARD_SHORTCUTS: [
    { key: 'a', description: 'Approve' },
    { key: 'r', description: 'Reject' },
  ],
  mapInitialTab: jest.fn().mockReturnValue('queue'),
}))

import QueuePage from '../pages/QueuePage'
import AnalyticsPage from '../pages/AnalyticsPage'
import ActivityLogPage from '../pages/ActivityLogPage'
import ReportsPage from '../pages/ReportsPage'
import SettingsPage from '../pages/SettingsPage'

describe('QueuePage', () => {
  const defaultProps = {
    queue: {
      queueItems: [],
      isQueueLoading: false,
      queueTotal: 0,
      filters: {
        status: 'all',
        contentType: 'all',
        dateRange: 'all',
        search: '',
      },
      fetchQueue: jest.fn(),
      handleItemAction: jest.fn(),
      handleBulkAction: jest.fn(),
      updateFilters: jest.fn(),
    },
    queueStats: { pending: 0, spam: 0, flagged: 0, total: 0 },
    theme: 'light',
    collaboration: {},
    addToast: jest.fn(),
  }

  it('renders without crashing', () => {
    render(<QueuePage {...defaultProps} />)
    expect(screen.getByText(/Moderation Queue/i)).toBeInTheDocument()
  })

  it('renders QueueTable when items exist', () => {
    render(<QueuePage {...defaultProps} />)
    expect(screen.getByTestId('queue-table')).toBeInTheDocument()
  })
})

describe('AnalyticsPage', () => {
  const defaultProps = {
    analytics: {
      analyticsData: {
        heatmap: {
          data: [
            [0, 0],
            [0, 0],
          ],
          maxCount: 0,
        },
        spamRatio: { spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 },
        contentTypeBreakdown: [],
        moderatorPerformance: [],
        anomalyAlerts: [],
        dateRange: { start: '', end: '' },
      },
      isAnalyticsLoading: false,
      fetchAnalytics: jest.fn(),
    },
    theme: 'light',
  }

  it('renders without crashing', () => {
    render(<AnalyticsPage {...defaultProps} />)
    expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument()
  })
})

describe('ActivityLogPage', () => {
  const defaultProps = {
    activityLog: {
      activityLog: [],
      isLogLoading: false,
      logPage: 1,
      fetchActivityLog: jest.fn(),
      setLogPage: jest.fn(),
      logTotal: 0,
    },
  }

  it('renders without crashing', () => {
    render(<ActivityLogPage {...defaultProps} />)
    expect(screen.getByText(/Activity Log/i)).toBeInTheDocument()
  })
})

describe('ReportsPage', () => {
  const defaultProps = {
    reports: {
      reputationUsers: [],
      isReputationLoading: false,
      fetchUserReputation: jest.fn(),
      activityFeed: [],
      isFeedLoading: false,
      feedError: null,
      fetchActivityFeed: jest.fn(),
    },
    analytics: {
      analyticsData: {
        moderatorPerformance: [],
      },
    },
    collaboration: {
      activityFeed: [],
      isFeedLoading: false,
      feedError: null,
      fetchActivityFeed: jest.fn(),
    },
    analyticsDateRange: { from: new Date(), to: new Date() },
    addToast: jest.fn(),
  }

  it('renders without crashing', () => {
    render(<ReportsPage {...defaultProps} />)
    expect(screen.getByText(/Reports/i)).toBeInTheDocument()
  })
})

describe('SettingsPage', () => {
  const defaultProps = {
    settings: {
      settingsSections: [],
      isSettingsLoading: false,
      settingsInitialValues: {},
      fetchSettings: jest.fn(),
      handleSaveSettings: jest.fn(),
    },
    addToast: jest.fn(),
  }

  it('renders without crashing', () => {
    render(<SettingsPage {...defaultProps} />)
    expect(screen.getByText(/Settings/i)).toBeInTheDocument()
  })
})
