import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../App'

// ---------------------------------------------------------------------------
// Wix globals
// ---------------------------------------------------------------------------

const FAKE_WIX_HASH =
  '#instance=fake-instance-id&token=fake-wix-token&siteOwnerId=fake-owner-id'
const FAKE_BACKEND_URL = 'http://localhost:3000/api'

// Default props that the Wix index.js would normally provide
const defaultProps = {
  wixContext: {
    instance: 'fake-instance-id',
    token: 'fake-wix-token',
    siteOwnerId: 'fake-owner-id',
  },
  backendUrl: FAKE_BACKEND_URL,
}

async function renderApp(overrides = {}) {
  let result
  await act(async () => {
    result = render(<App {...defaultProps} {...overrides} />)
  })
  return result
}

// Flush pending promises so async effects settle before assertions
async function settleApp() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

// Mock global fetch used in the App
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        items: [],
        total: 0,
        stats: { pending: 0, spam: 0, flagged: 0, total: 0 },
        heatmap: { data: [], maxCount: 0 },
        spamRatio: {
          spamCount: 0,
          totalCount: 0,
          ratio: 0,
          percentage: 0,
        },
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

describe('Wix App', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Wix-style URL hash fragment (used by index.js getWixContext)
    Object.defineProperty(window, 'location', {
      value: { hash: FAKE_WIX_HASH },
      writable: true,
      configurable: true,
    })

    // Mock localStorage for backend URL (used by index.js getBackendUrl)
    // Storage.prototype is used since localStorage is a jsdom Storage instance
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'cmcc_backend_url') return FAKE_BACKEND_URL
      return null
    })
  })

  afterEach(async () => {
    await settleApp()
    jest.restoreAllMocks()
  })

  it('renders without crashing', async () => {
    const { container } = await renderApp()
    await settleApp()
    expect(container.querySelector('.cmcc-wix-app')).toBeInTheDocument()
  })

  it('renders the app title', async () => {
    await renderApp()
    await settleApp()
    expect(screen.getByText(/cmcc content moderation/i)).toBeInTheDocument()
  })

  it('renders all 4 tab buttons with icons', async () => {
    await renderApp()
    await settleApp()
    expect(screen.getByText(/Queue/)).toBeInTheDocument()
    expect(screen.getByText(/Analytics/)).toBeInTheDocument()
    expect(screen.getByText(/Activity Log/)).toBeInTheDocument()
    expect(screen.getByText(/Settings/)).toBeInTheDocument()
  })

  it('renders tab bar with role="tablist"', async () => {
    await renderApp()
    await settleApp()
    expect(document.querySelector('[role="tablist"]')).toBeInTheDocument()
  })

  it('default tab is Queue', async () => {
    await renderApp()
    await settleApp()
    const queueButton = screen.getByText(/Queue/).closest('button')
    expect(queueButton).toHaveClass('active')
  })

  it('switches to Analytics tab when clicked', async () => {
    await renderApp()
    await settleApp()
    fireEvent.click(screen.getByText(/Analytics/))
    await settleApp()
    const analyticsButton = screen.getByText(/Analytics/).closest('button')
    expect(analyticsButton).toHaveClass('active')
    const queueButton = screen.getByText(/Queue/).closest('button')
    expect(queueButton).not.toHaveClass('active')
  })

  it('switches to Settings tab when clicked', async () => {
    await renderApp()
    await settleApp()
    fireEvent.click(screen.getByText(/Settings/))
    await settleApp()
    const settingsButton = screen.getByText(/Settings/).closest('button')
    expect(settingsButton).toHaveClass('active')
  })

  it('switches to Activity Log tab when clicked', async () => {
    await renderApp()
    await settleApp()
    fireEvent.click(screen.getByText(/Activity Log/))
    await settleApp()
    const activityButton = screen.getByText(/Activity Log/).closest('button')
    expect(activityButton).toHaveClass('active')
  })

  it('renders header with notification badges', async () => {
    const { container } = await renderApp()
    await settleApp()
    expect(container.querySelector('.cmcc-app-header')).toBeInTheDocument()
    expect(container.querySelector('.cmcc-app-badges')).toBeInTheDocument()
  })

  it('renders tab content container', async () => {
    const { container } = await renderApp()
    await settleApp()
    expect(container.querySelector('.cmcc-tab-content')).toBeInTheDocument()
  })
})
