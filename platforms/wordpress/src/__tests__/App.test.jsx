import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// Mock window.cmccData used by apiFetch
beforeEach(() => {
  global.window = Object.create(window)
  Object.assign(global.window, {
    cmccData: {
      restUrl: '/wp-json/cmcc/v1/',
      nonce: 'test-nonce-123',
      initialTab: 'cmcc',
    },
  })
})

// Mock global fetch used by the App
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        items: [],
        total: 0,
        stats: { pending: 0, spam: 0, flagged: 0, total: 0 },
        heatmap: { data: [], maxCount: 0 },
        spamRatio: { spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 },
        contentTypeBreakdown: [],
        moderatorPerformance: [],
        anomalyAlerts: [],
        dateRange: { start: '', end: '' },
        log: [],
        logTotal: 0,
        sections: [],
        initialValues: {},
      }),
  }),
)

describe('WordPress App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-admin')).toBeInTheDocument()
  })

  it('renders all 4 tab navigation buttons', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /queue/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /activity log/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument()
  })

  it('default tab is Queue', () => {
    render(<App />)
    const queueTab = screen.getByRole('tab', { name: /queue/i })
    expect(queueTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Analytics tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
    const analyticsTab = screen.getByRole('tab', {
      name: /analytics/i,
    })
    expect(analyticsTab).toHaveAttribute('aria-selected', 'true')
    const queueTab = screen.getByRole('tab', { name: /queue/i })
    expect(queueTab).toHaveAttribute('aria-selected', 'false')
  })

  it('switches to Settings tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    const settingsTab = screen.getByRole('tab', {
      name: /settings/i,
    })
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Activity Log tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /activity log/i }))
    const activityTab = screen.getByRole('tab', {
      name: /activity log/i,
    })
    expect(activityTab).toHaveAttribute('aria-selected', 'true')
  })

  it('renders tab content panel for active tab', () => {
    render(<App />)
    const tabPanels = document.querySelectorAll('[role="tabpanel"]')
    expect(tabPanels.length).toBe(1)
  })

  it('has the correct app structure', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-tab-nav')).toBeInTheDocument()
    expect(container.querySelector('.cmcc-tab-content')).toBeInTheDocument()
  })
})
