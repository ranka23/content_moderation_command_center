import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

// Mock @cmcc/ui with all components needed by the App
jest.mock('@cmcc/ui', () => {
  const React = require('react')
  const MockDiv = (props) =>
    React.createElement('div', { 'data-testid': 'cmcc-ui-mock', ...props })
  return {
    QueueTable: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'QueueTable' }),
    HeatmapChart: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'HeatmapChart' }),
    ActionButton: ({ children, onClick, type, ...props }) =>
      React.createElement(
        'button',
        {
          onClick,
          'data-testid': 'cmcc-action-btn',
          type: type || 'button',
          ...props,
        },
        children,
      ),
    NotificationBadge: ({ count, ...props }) =>
      React.createElement(
        'span',
        { 'data-testid': 'cmcc-notification-badge', ...props },
        String(count),
      ),
    useKeyboardShortcuts: () => {},
    useSavedFilters: () => ({
      savedFilters: [],
      saveFilter: () => {},
      deleteSavedFilter: () => {},
    }),
    QuickFilterBar: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'QuickFilterBar' }),
    AiEvaluationResult: (props) =>
      React.createElement(MockDiv, {
        ...props,
        'data-cmcc': 'AiEvaluationResult',
      }),
    OfflineBanner: (props) =>
      React.createElement('div', {
        'data-testid': 'cmcc-offline-banner',
        ...props,
      }),
    SlideOutPanel: ({ open, children, title, ...props }) =>
      open
        ? React.createElement(
            'div',
            { 'data-testid': 'cmcc-slide-out-panel', ...props },
            title && React.createElement('h3', null, title),
            children,
          )
        : null,
    ModerationNotes: (props) =>
      React.createElement(MockDiv, {
        ...props,
        'data-cmcc': 'ModerationNotes',
      }),
    SkeletonTable: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'SkeletonTable' }),
    SkeletonCard: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'SkeletonCard' }),
    EmptyState: ({ title, description, action, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'cmcc-empty-state', ...props },
        title,
        description && React.createElement('p', null, description),
        action,
      ),
    Table: (props) =>
      React.createElement('table', { 'data-testid': 'cmcc-table', ...props }),
    ActivityFeed: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'ActivityFeed' }),
    Button: ({ children, ...props }) =>
      React.createElement(
        'button',
        { 'data-testid': 'cmcc-btn', ...props },
        children,
      ),
    SettingsForm: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'SettingsForm' }),
    AiSettingsForm: (props) =>
      React.createElement(MockDiv, { ...props, 'data-cmcc': 'AiSettingsForm' }),
    Icon: ({ name, _size, className, ...props }) =>
      React.createElement('svg', {
        'data-testid': 'cmcc-icon',
        'data-icon-name': name,
        className,
        ...props,
      }),
    cn: (x) => x || '',
  }
})
// Mock @cmcc/core with a simple proxy — no requireActual
jest.mock('@cmcc/core', () => {
  const handler = {
    get(target, prop) {
      if (prop === '__esModule') return true
      // Return mock functions for any property access
      const fn = (...args) => {
        // Return empty object for common data shapes
        if (prop === 'getEmptyAnalytics') {
          return {
            queueStats: { pending: 0, spam: 0, flagged: 0, total: 0 },
            heatmap: { data: [], maxCount: 0 },
            spamRatio: { spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 },
            contentTypeBreakdown: [],
            moderatorPerformance: [],
            anomalyAlerts: [],
            dateRange: { start: '', end: '' },
            statusDistribution: null,
            moderationVolume: null,
            spamContentTypes: null,
          }
        }
        if (prop === 'getQueueBadgeCount') return 0
        if (prop === 'classifyRiskLevel') return 'low'
        if (prop === 'generateModeratorPerformance') return []
        if (prop === 'getDefaultRiskLevelThresholds')
          return { low: 0.3, medium: 0.6, high: 0.8 }
        if (prop === 'filterActivityLog') return args[0] || []
        if (prop === 'processAnalytics') return args[0] || {}
        return {}
      }
      target[prop] = fn
      return fn
    },
  }
  return new Proxy({ __esModule: true, default: {} }, handler)
})

import App from '../App'

const FAKE_BACKEND_URL = 'http://localhost:3000/api'
const defaultProps = {
  wixContext: {
    instance: 'fake-instance-id',
    token: 'fake-wix-token',
    siteOwnerId: 'fake-owner-id',
  },
  backendUrl: FAKE_BACKEND_URL,
}

describe('Wix App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: { hash: '#instance=fake&token=fake&siteOwnerId=fake' },
      writable: true,
    })
  })

  it('renders without crashing', async () => {
    let container
    await act(async () => {
      const result = render(<App {...defaultProps} />)
      container = result.container
    })
    expect(container.querySelector('.cmcc-wix-app')).toBeInTheDocument()
  })

  it('renders the app title', async () => {
    await act(async () => {
      render(<App {...defaultProps} />)
    })
    expect(screen.getByText(/cmcc content moderation/i)).toBeInTheDocument()
  })

  it('renders all tab buttons', async () => {
    await act(async () => {
      render(<App {...defaultProps} />)
    })
    expect(screen.getByText(/Queue/)).toBeInTheDocument()
    expect(screen.getByText(/Analytics/)).toBeInTheDocument()
    expect(screen.getByText(/Activity Log/)).toBeInTheDocument()
    expect(screen.getByText(/Settings/)).toBeInTheDocument()
  })

  it('renders header with notification badges', async () => {
    let container
    await act(async () => {
      const result = render(<App {...defaultProps} />)
      container = result.container
    })
    expect(container.querySelector('.cmcc-app-header')).toBeInTheDocument()
  })
})
