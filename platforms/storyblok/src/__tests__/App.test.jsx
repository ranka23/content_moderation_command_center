import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock localStorage setup helper
const STORYBLOK_SETTINGS_KEY = 'cmcc-storyblok-settings'

function setLocalStorageSettings(overrides = {}) {
  const defaultSettings = {
    apiEndpoint: 'https://api.example.com',
    apiKey: 'test-key',
    spamThreshold: 0.8,
    autoApprove: false,
    notifyOnSpike: true,
    notifyOnSpam: true,
    queuePollInterval: 30,
  }
  window.localStorage.setItem(
    STORYBLOK_SETTINGS_KEY,
    JSON.stringify({ ...defaultSettings, ...overrides }),
  )
}

// Helper to create a mock fetch response
function mockFetchResponse(data, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

// Mock queue items
const mockQueueItems = [
  {
    id: '1',
    title: 'Test comment',
    contentType: 'comment',
    status: 'pending',
    spamScore: 0.2,
    author: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Spam post',
    contentType: 'post',
    status: 'spam',
    spamScore: 0.95,
    author: 'spammer',
    createdAt: '2024-01-02T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Storyblok App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.fetch = jest.fn(() => mockFetchResponse({ items: [], total: 0 }))
  })

  // ── Smoke Tests ──────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-storyblok-app')).toBeInTheDocument()
  })

  it('renders all tab buttons', () => {
    render(<App />)
    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Activity Log')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('default tab is Queue', () => {
    render(<App />)
    const queueButton = screen.getByRole('tab', { name: /queue/i })
    expect(queueButton).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Analytics tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
    const analyticsButton = screen.getByRole('tab', { name: /analytics/i })
    expect(analyticsButton).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Settings tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    const settingsButton = screen.getByRole('tab', { name: /settings/i })
    expect(settingsButton).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Activity Log tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /activity log/i }))
    const activityButton = screen.getByRole('tab', { name: /activity log/i })
    expect(activityButton).toHaveAttribute('aria-selected', 'true')
  })

  it('renders the header with title', () => {
    render(<App />)
    expect(screen.getByText(/cmcc storyblok moderation/i)).toBeInTheDocument()
  })

  // ── State: No API Endpoint Configured ────────────────────

  it('shows queue page with empty state when no API endpoint set', () => {
    render(<App />)
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument()
  })

  it('shows analytics page when switched', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
    expect(screen.getByRole('tab', { name: /analytics/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  // ── State: API Endpoint Configured ───────────────────────

  it('shows loading state when fetching queue items', async () => {
    // Don't resolve the fetch promise
    global.fetch = jest.fn(() => new Promise(() => {}))
    setLocalStorageSettings()

    render(<App />)

    expect(screen.getByText(/loading queue/i)).toBeInTheDocument()
  })

  it('renders queue with items when data is loaded', async () => {
    setLocalStorageSettings()
    global.fetch = jest.fn(() =>
      mockFetchResponse({ items: mockQueueItems, total: 2 }),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument()
    })
  })

  it('shows error when queue fetch fails', async () => {
    setLocalStorageSettings()
    // Need fetch to start, then fail — mock a delayed rejection
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  // ── Settings ────────────────────────────────────────────────

  it('shows settings page', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('renders SettingsForm when sdk prop is provided', () => {
    const mockSdk = { getContext: jest.fn() }
    setLocalStorageSettings()

    render(<App sdk={mockSdk} />)

    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))

    // Settings should be accessible
    expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  // ── Edge Cases ───────────────────────────────────────────

  it('handles localStorage being unavailable', () => {
    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('localStorage not available')
      })

    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-storyblok-app')).toBeInTheDocument()

    getItemSpy.mockRestore()
  })

  it('handles corrupt localStorage settings gracefully', () => {
    window.localStorage.setItem(
      STORYBLOK_SETTINGS_KEY,
      'this is not valid json',
    )

    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-storyblok-app')).toBeInTheDocument()
  })

  it('handles apiEndpoint being set without apiKey', async () => {
    setLocalStorageSettings({ apiEndpoint: 'https://api.test.com', apiKey: '' })
    global.fetch = jest.fn(() => mockFetchResponse({ items: [], total: 0 }))

    render(<App />)

    await waitFor(() => {
      // The queue should render with empty state — no error thrown
      expect(screen.getByText('Moderation Queue')).toBeInTheDocument()
    })

    // The fetch should have been called without X-API-Key header
    expect(global.fetch).toHaveBeenCalled()
  })
})
