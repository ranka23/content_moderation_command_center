import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
    const queueButton = screen.getByText('Queue').closest('button')
    expect(queueButton).toHaveClass('cmcc-tab-active')
  })

  it('switches to Analytics tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
    const analyticsButton = screen.getByRole('tab', { name: /analytics/i })
    expect(analyticsButton).toHaveClass('cmcc-tab-active')
  })

  it('switches to Settings tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    const settingsButton = screen.getByRole('tab', { name: /settings/i })
    expect(settingsButton).toHaveClass('cmcc-tab-active')
  })

  it('switches to Activity Log tab when clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /activity log/i }))
    const activityButton = screen.getByRole('tab', { name: /activity log/i })
    expect(activityButton).toHaveClass('cmcc-tab-active')
  })

  it('renders the footer with version info', () => {
    render(<App />)
    expect(screen.getByText(/cmcc moderation v1.0.0/i)).toBeInTheDocument()
  })

  it('renders the CMCC brand header', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-header')).toBeInTheDocument()
  })

  // ── State: No API Endpoint Configured ────────────────────

  it('shows connect prompt in Queue tab when no API endpoint set', () => {
    render(<App />)
    expect(
      screen.getByText(/connect your cmcc backend api in settings/i),
    ).toBeInTheDocument()
  })

  it('shows connect prompt in Analytics tab when no API endpoint set', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
    expect(
      screen.getByText(/connect your cmcc backend api in settings/i),
    ).toBeInTheDocument()
  })

  // ── State: API Endpoint Configured ───────────────────────

  it('shows loading state when fetching queue items', async () => {
    // Don't resolve the fetch promise
    global.fetch = jest.fn(() => new Promise(() => {}))
    setLocalStorageSettings()

    render(<App />)

    // Wait for the tab click to trigger fetch
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.getByText(/loading queue items/i)).toBeInTheDocument()
  })

  it('shows empty queue state when API returns no items', async () => {
    setLocalStorageSettings()
    global.fetch = jest.fn(() => mockFetchResponse({ items: [], total: 0 }))

    render(<App />)

    // Trigger a tab click which calls fetchQueueItems via handleTabChange
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Let the async fetch complete
    await waitFor(() => {
      expect(
        screen.getByText(/no items in the moderation queue/i),
      ).toBeInTheDocument()
    })
  })

  it('displays queue items when data is loaded', async () => {
    setLocalStorageSettings()
    global.fetch = jest.fn(() =>
      mockFetchResponse({ items: mockQueueItems, total: 2 }),
    )

    render(<App />)

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument()
    })
  })

  it('shows error banner when queue fetch fails', async () => {
    setLocalStorageSettings()
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<App />)

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load queue items/i),
      ).toBeInTheDocument()
    })
  })

  it('dismisses error banner when close button is clicked', async () => {
    setLocalStorageSettings()
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<App />)

    // Trigger error
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Error should appear
    await waitFor(() => {
      expect(
        screen.getByText(/failed to load queue items/i),
      ).toBeInTheDocument()
    })

    // Dismiss the error
    fireEvent.click(screen.getByLabelText('Dismiss error'))

    expect(
      screen.queryByText(/failed to load queue items/i),
    ).not.toBeInTheDocument()
  })

  it('shows SDK not available message in Settings when no SDK prop provided', () => {
    setLocalStorageSettings({
      apiEndpoint: 'https://custom.api.com',
      spamThreshold: 0.5,
    })

    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))

    expect(screen.getByText(/storyblok sdk not available/i)).toBeInTheDocument()
  })

  it('renders SettingsForm when sdk prop is provided', () => {
    const mockSdk = { getContext: jest.fn() }
    setLocalStorageSettings()

    render(<App sdk={mockSdk} />)

    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))

    // SettingsForm should be rendered (the section title 'Connection' is rendered by SettingsForm)
    expect(screen.getByText('API Connection')).toBeInTheDocument()
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

    // Should fall back to defaults - show the connect prompt
    expect(
      screen.getByText(/connect your cmcc backend api in settings/i),
    ).toBeInTheDocument()
  })

  it('handles apiEndpoint being set without apiKey', async () => {
    setLocalStorageSettings({ apiEndpoint: 'https://api.test.com', apiKey: '' })
    global.fetch = jest.fn(() => mockFetchResponse({ items: [], total: 0 }))

    render(<App />)

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    await waitFor(() => {
      expect(
        screen.getByText(/no items in the moderation queue/i),
      ).toBeInTheDocument()
    })

    // The fetch should have been called without X-API-Key header
    expect(global.fetch).toHaveBeenCalled()
  })
})
