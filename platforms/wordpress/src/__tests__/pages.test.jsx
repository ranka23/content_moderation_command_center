/**
 * Tests for CMCC WordPress page components
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the @cmcc/ui components
jest.mock('@cmcc/ui', () => {
  const React = require('react')
  const MockDiv = (props) =>
    React.createElement('div', { 'data-testid': 'cmcc-ui-mock', ...props })
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
    AiSettingsForm: (_props) =>
      React.createElement('div', { 'data-testid': 'ai-settings-form' }),
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
    Button: ({ children, ...props }) =>
      React.createElement(
        'button',
        { 'data-testid': 'cmcc-btn', ...props },
        children,
      ),
    SkeletonTable: (props) =>
      React.createElement(MockDiv, { 'data-cmcc': 'SkeletonTable', ...props }),
    SkeletonCard: (props) =>
      React.createElement(MockDiv, { 'data-cmcc': 'SkeletonCard', ...props }),
    EmptyState: ({ title, description, action }) =>
      React.createElement(
        'div',
        { 'data-testid': 'cmcc-empty' },
        title,
        description && React.createElement('p', null, description),
        action,
      ),
    SlideOutPanel: ({ open, children, title }) =>
      open
        ? React.createElement(
            'div',
            { 'data-testid': 'cmcc-slideout' },
            title && React.createElement('h3', null, title),
            children,
          )
        : null,
    QuickFilterBar: (props) =>
      React.createElement(MockDiv, { 'data-cmcc': 'QuickFilterBar', ...props }),
    ProgressBar: (props) =>
      React.createElement(MockDiv, { 'data-cmcc': 'ProgressBar', ...props }),
    ModerationNotes: (props) =>
      React.createElement(MockDiv, {
        'data-cmcc': 'ModerationNotes',
        ...props,
      }),
    AiEvaluationResult: (props) =>
      React.createElement(MockDiv, {
        'data-cmcc': 'AiEvaluationResult',
        ...props,
      }),
    Table: (props) =>
      React.createElement('table', { 'data-testid': 'cmcc-table', ...props }),
    Pagination: (props) =>
      React.createElement('div', {
        'data-testid': 'cmcc-pagination',
        ...props,
      }),
    ActivityFeed: (props) =>
      React.createElement(MockDiv, { 'data-cmcc': 'ActivityFeed', ...props }),
    cn: (x) => x || '',
    Icon: ({ name, size, className }) =>
      React.createElement('span', {
        'data-testid': 'cmcc-icon',
        'data-icon-name': name,
        'data-icon-size': size,
        className,
      }),
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
      handleFilterChange: jest.fn(),
      fetchItemHistory: jest.fn(),
      fetchItemNotes: jest.fn(),
      setDetailItem: jest.fn(),
      detailItem: null,
      itemHistory: [],
      itemNotes: [],
      isHistoryLoading: false,
      isNotesLoading: false,
      activeQuickPreset: null,
      savedFilters: [],
      handleQuickFilter: jest.fn(),
      saveFilter: jest.fn(),
      addItemNote: jest.fn(),
      handleAssignItem: jest.fn(),
      bulkProgress: { active: false, current: 0, total: 0 },
    },
    queueStats: { pending: 0, spam: 0, flagged: 0, total: 0 },
    theme: 'light',
    collaboration: {
      detailItem: null,
      itemHistory: [],
      itemNotes: [],
      activityFeed: [],
      fetchItemHistory: jest.fn(),
      fetchItemNotes: jest.fn(),
      setDetailItem: jest.fn(),
      addItemNote: jest.fn(),
      fetchActivityFeed: jest.fn(),
      isFeedLoading: false,
      feedError: null,
    },
    addToast: jest.fn(),
  }

  it('renders without crashing', () => {
    render(<QueuePage {...defaultProps} />)
    // When queue is empty, EmptyState renders with this title
    expect(screen.getByText('No items in the queue')).toBeInTheDocument()
  })

  it('renders QueueTable when items exist', () => {
    const propsWithItems = {
      ...defaultProps,
      queue: {
        ...defaultProps.queue,
        queueItems: [
          {
            id: '1',
            contentType: 'comment',
            status: 'pending',
          },
        ],
      },
    }
    render(<QueuePage {...propsWithItems} />)
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
        statusDistribution: null,
        moderationVolume: null,
        spamContentTypes: null,
      },
      analyticsDateRange: { from: new Date(), to: new Date() },
      setAnalyticsDateRange: jest.fn(),
      isAnalyticsLoading: false,
      fetchAnalytics: jest.fn(),
      queueStats: { pending: 0, spam: 0, flagged: 0, total: 0 },
      spamRatioData: { spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 },
      ctbList: [],
    },
    theme: 'light',
  }

  it('renders without crashing', () => {
    render(<AnalyticsPage {...defaultProps} />)
    expect(screen.getByText(/Analytics/i)).toBeInTheDocument()
  })
})

describe('ActivityLogPage', () => {
  const defaultProps = {
    activityLog: {
      activityLog: [],
      isLogLoading: false,
      logPage: 1,
      logPerPage: 25,
      setLogPage: jest.fn(),
      setLogPerPage: jest.fn(),
      logTotal: 0,
      fetchActivityLog: jest.fn(),
    },
  }

  it('renders without crashing', () => {
    render(<ActivityLogPage {...defaultProps} />)
    // When log is empty, EmptyState renders with this title
    expect(screen.getByText('No activity recorded yet')).toBeInTheDocument()
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
    const { container } = render(<ReportsPage {...defaultProps} />)
    expect(container.querySelector('.cmcc-tab-panel')).toBeInTheDocument()
  })
})

describe('SettingsPage', () => {
  const defaultProps = {
    settings: {
      settingsSections: [
        {
          id: 'general',
          title: 'General',
          fields: [
            { name: 'auto_moderate', label: 'Auto Moderate', type: 'toggle' },
          ],
        },
      ],
      isSettingsLoading: false,
      settingsInitialValues: {},
      settingsValidators: {},
      fetchSettings: jest.fn(),
      handleSettingsSave: jest.fn(),
    },
    addToast: jest.fn(),
    theme: 'light',
  }

  it('renders without crashing', () => {
    render(<SettingsPage {...defaultProps} />)
    // SettingsForm renders with sections
    expect(screen.getByTestId('settings-form')).toBeInTheDocument()
  })
})
