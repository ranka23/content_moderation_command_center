import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../pages/App/index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @strapi/design-system components
jest.mock('@strapi/design-system', () => ({
  Layout: ({ children }) => <div data-testid="layout">{children}</div>,
  HeaderLayout: ({ title, subtitle, primaryAction }) => (
    <div data-testid="header-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {primaryAction && <div data-testid="header-actions">{primaryAction}</div>}
    </div>
  ),
  ContentLayout: ({ children }) => (
    <div data-testid="content-layout">{children}</div>
  ),
  TabGroup: ({ children, onTabChange, selectedTabIndex, label }) => (
    <div data-testid="tab-group" data-label={label}>
      {React.Children.map(children, (child) => {
        if (child?.type?.displayName === 'Tabs') {
          return React.cloneElement(child, { onTabChange, selectedTabIndex })
        }
        return child
      })}
    </div>
  ),
  Tabs: ({ children, onTabChange, selectedTabIndex: _selectedTabIndex }) => (
    <div data-testid="tabs">
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, {
          'data-index': index,
          onClick: () => onTabChange && onTabChange(index),
        }),
      )}
    </div>
  ),
  Tab: ({ children, ...props }) => (
    <button
      data-testid="tab"
      data-index={props['data-index']}
      onClick={props.onClick}
    >
      {children}
    </button>
  ),
  TabPanels: ({ children }) => <div data-testid="tab-panels">{children}</div>,
  TabPanel: ({ children }) => <div data-testid="tab-panel">{children}</div>,
  Box: ({ children, paddingTop, ...props }) => (
    <div data-testid="box" data-padding-top={paddingTop} {...props}>
      {children}
    </div>
  ),
  Typography: ({ children, variant, fontWeight, textColor, as, ...props }) => {
    const Component = as || 'span'
    return (
      <Component
        data-testid="typography"
        data-variant={variant}
        data-font-weight={fontWeight}
        data-text-color={textColor}
        {...props}
      >
        {children}
      </Component>
    )
  },
  Button: ({ children, onClick, variant, disabled, ...props }) => (
    <button
      data-testid="button"
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
  Flex: ({ children, justifyContent, alignItems, height, gap, ...props }) => (
    <div
      data-testid="flex"
      data-justify={justifyContent}
      data-align={alignItems}
      data-height={height}
      data-gap={gap}
      {...props}
    >
      {children}
    </div>
  ),
  Grid: ({ children, gap, ...props }) => (
    <div data-testid="grid" data-gap={gap} {...props}>
      {children}
    </div>
  ),
  GridItem: ({ children, col, s, xs, ...props }) => (
    <div
      data-testid="grid-item"
      data-col={col}
      data-s={s}
      data-xs={xs}
      {...props}
    >
      {children}
    </div>
  ),
  Divider: () => <hr data-testid="divider" />,
  Status: ({ children, variant }) => (
    <span data-testid="status" data-variant={variant}>
      {children}
    </span>
  ),
  Loader: ({ children }) => (
    <div data-testid="loader">{children || 'Loading...'}</div>
  ),
  EmptyStateLayout: ({ icon, content, action }) => (
    <div data-testid="empty-state">
      {icon && <div data-testid="empty-icon">{icon}</div>}
      <p>{content}</p>
      {action && <div data-testid="empty-action">{action}</div>}
    </div>
  ),
  Alert: ({ title, children, variant }) => (
    <div data-testid="alert" data-variant={variant}>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  ),
}))

// Mock @strapi/icons
jest.mock('@strapi/icons', () => ({
  Illo: () => <svg data-testid="illo-icon" />,
}))

// Mock @strapi/helper-plugin
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()

jest.mock('@strapi/helper-plugin', () => ({
  useFetchClient: () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
  }),
  useNotification: () => jest.fn(),
}))

// Mock @cmcc/ui components
jest.mock('@cmcc/ui', () => ({
  QueueTable: ({ items, loading, onModerate, ..._props }) => (
    <div
      data-testid="queue-table"
      data-item-count={items.length}
      data-loading={loading}
    >
      <span>Queue Table ({items.length} items)</span>
      {items.map((item) => (
        <div key={item.id} data-testid="queue-item">
          {item.title}
          <button onClick={() => onModerate(item.id, 'approve')}>
            Approve
          </button>
        </div>
      ))}
    </div>
  ),
  HeatmapChart: ({ data }) => (
    <div data-testid="heatmap-chart" data-has-data={data && data.length > 0} />
  ),
  SettingsForm: ({ initialData: _initialData, onSubmit, loading }) => (
    <div data-testid="settings-form" data-loading={loading}>
      <button onClick={() => onSubmit({ autoModerate: true })}>
        Save Settings
      </button>
    </div>
  ),
  ActionButton: ({ label, onClick, variant }) => (
    <button
      data-testid="action-button"
      data-variant={variant}
      onClick={onClick}
    >
      {label}
    </button>
  ),
  NotificationBadge: ({ count, type }) => (
    <span data-testid="notification-badge" data-count={count} data-type={type}>
      {count}
    </span>
  ),
}))

// Mock pluginId
jest.mock('../../pluginId', () => 'cmcc')

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockQueueResponse = {
  data: {
    data: [
      {
        id: 1,
        title: 'Test comment',
        contentType: 'comment',
        status: 'pending',
      },
    ],
    pagination: { page: 1, pageSize: 20, total: 1 },
  },
}

const mockAnalyticsResponse = {
  data: {
    data: {
      totalItems: 100,
      statusCounts: [
        { status: 'pending', count: 50 },
        { status: 'approved', count: 30 },
        { status: 'rejected', count: 10 },
        { status: 'spam', count: 8 },
        { status: 'deferred', count: 2 },
      ],
      recentActivity: [
        {
          id: 1,
          action: 'approved',
          moderatorId: 'mod-1',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
  },
}

const mockActivityResponse = {
  data: {
    data: [
      {
        id: 1,
        action: 'approved',
        moderatorId: 'mod-1',
        contentType: 'comment',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    pagination: { page: 1, pageSize: 20, total: 1 },
  },
}

const mockSettingsResponse = {
  data: {
    data: {
      autoModerate: false,
      moderationBehavior: 'flag',
      maxLinks: 5,
    },
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Strapi Admin Panel', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock resolves for initial data load
    mockGet
      .mockResolvedValueOnce(mockQueueResponse)
      .mockResolvedValueOnce(mockAnalyticsResponse)
      .mockResolvedValueOnce(mockActivityResponse)
      .mockResolvedValueOnce(mockSettingsResponse)
  })

  it('renders without crashing', async () => {
    const { container } = render(<App />)

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="layout"]'),
      ).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    // Don't resolve any promises to keep loading state
    mockGet.mockImplementation(() => new Promise(() => {}))

    render(<App />)

    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('renders all 4 tab labels', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Queue')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Activity Log')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('renders the header with CMCC title and subtitle', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('CMCC')).toBeInTheDocument()
      expect(
        screen.getByText('Content Moderation Command Center'),
      ).toBeInTheDocument()
    })
  })

  it('renders the queue table with items when data loads', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('queue-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('queue-table')).toHaveAttribute(
      'data-item-count',
      '1',
    )
  })

  it('shows empty state when queue is empty', async () => {
    // Override the queue mock to return empty
    mockGet
      .mockReset()
      .mockResolvedValueOnce({
        data: { data: [], pagination: { page: 1, pageSize: 20, total: 0 } },
      })
      .mockResolvedValueOnce(mockAnalyticsResponse)
      .mockResolvedValueOnce(mockActivityResponse)
      .mockResolvedValueOnce(mockSettingsResponse)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(
      screen.getByText('The moderation queue is empty'),
    ).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    // Make the queue endpoint fail
    mockGet
      .mockReset()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockAnalyticsResponse)
      .mockResolvedValueOnce(mockActivityResponse)
      .mockResolvedValueOnce(mockSettingsResponse)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument()
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('handles empty analytics gracefully', async () => {
    mockGet
      .mockReset()
      .mockResolvedValueOnce(mockQueueResponse)
      .mockResolvedValueOnce({
        data: { data: null },
      })
      .mockResolvedValueOnce(mockActivityResponse)
      .mockResolvedValueOnce(mockSettingsResponse)

    render(<App />)

    // Switch to analytics tab
    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Analytics'))

    await waitFor(() => {
      expect(
        screen.getByText('No analytics data available'),
      ).toBeInTheDocument()
    })
  })

  it('handles settings save correctly', async () => {
    mockPut.mockResolvedValue({
      data: { data: { autoModerate: true } },
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    // Switch to settings tab
    fireEvent.click(screen.getByText('Settings'))

    await waitFor(() => {
      expect(screen.getByTestId('settings-form')).toBeInTheDocument()
    })
  })
})
