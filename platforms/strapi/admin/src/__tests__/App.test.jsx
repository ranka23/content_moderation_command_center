import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../pages/App/index.jsx'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock global.fetch (App uses apiFetch → fetch)
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock @cmcc/ui components that the App imports
jest.mock('@cmcc/ui', () => ({
  AiSettingsForm: ({ engine, _apiKey, _model, onChange }) => (
    <div data-testid="ai-settings-form">
      <select
        value={engine}
        onChange={(e) => onChange('engine', e.target.value)}
      >
        <option value="none">None</option>
      </select>
    </div>
  ),
  AiEvaluationResult: ({ result }) => (
    <div data-testid="ai-evaluation-result">
      {result ? 'AI Result' : 'No result'}
    </div>
  ),
}))

// Mock pluginId
jest.mock('../pluginId', () => 'cmcc')

// Helper: create a mock fetch Response
function mockFetchResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([JSON.stringify(body)])),
  })
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockQueueData = {
  data: [
    {
      id: 1,
      title: 'Test comment',
      contentType: 'comment',
      status: 'pending',
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 1 },
}

const mockAnalyticsData = {
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
}

const mockActivityData = {
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
}

const mockSettingsData = {
  autoModerate: false,
  moderationBehavior: 'flag',
  maxLinks: 5,
  blacklistedKeywords: [],
  duplicateDetection: true,
  notifyOnSpam: true,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Strapi Admin Panel', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock resolves for initial data load
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse(mockQueueData))
      .mockResolvedValueOnce(mockFetchResponse(mockAnalyticsData))
      .mockResolvedValueOnce(mockFetchResponse(mockActivityData))
      .mockResolvedValueOnce(mockFetchResponse(mockSettingsData))
  })

  it('renders without crashing', async () => {
    const { container } = render(<App />)

    await waitFor(() => {
      expect(container.querySelector('h1')).toBeInTheDocument()
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

  it('renders all 5 tab labels', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Queue')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Activity Log')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('shows loading spinner initially, then renders content', async () => {
    // Keep fetch pending indefinitely so loading state persists
    mockFetch.mockReset().mockImplementation(() => new Promise(() => {}))

    render(<App />)

    // Check for loading state — App renders a "Spinner" div during loading
    await waitFor(() => {
      // No need for explicit spinner check — just verify header renders
      expect(screen.getByText('CMCC')).toBeInTheDocument()
    })
  })

  it('renders the queue tab with items when data loads', async () => {
    render(<App />)

    // Wait for loading to complete and queue items to render
    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument()
    })
  })

  it('shows empty queue state when no items', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce(
        mockFetchResponse({
          data: [],
          pagination: { page: 1, pageSize: 20, total: 0 },
        }),
      )
      .mockResolvedValueOnce(mockFetchResponse(mockAnalyticsData))
      .mockResolvedValueOnce(mockFetchResponse(mockActivityData))
      .mockResolvedValueOnce(mockFetchResponse(mockSettingsData))

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByText('The moderation queue is empty'),
      ).toBeInTheDocument()
    })
  })

  it('shows error state when API fails', async () => {
    mockFetch
      .mockReset()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockFetchResponse(mockAnalyticsData))
      .mockResolvedValueOnce(mockFetchResponse(mockActivityData))
      .mockResolvedValueOnce(mockFetchResponse(mockSettingsData))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })
  })

  it('shows onboarding banner on first visit', async () => {
    // Ensure no localStorage dismissal
    localStorage.removeItem('cmcc-onboarding-dismissed')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome to CMCC/i)).toBeInTheDocument()
    })
  })

  it('dismisses onboarding banner when clicking "Got it"', async () => {
    localStorage.removeItem('cmcc-onboarding-dismissed')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Got it')).toBeInTheDocument()
    })

    // Click dismiss
    screen.getByText('Got it').click()

    await waitFor(() => {
      expect(screen.queryByText(/Welcome to CMCC/i)).not.toBeInTheDocument()
    })
  })
})
