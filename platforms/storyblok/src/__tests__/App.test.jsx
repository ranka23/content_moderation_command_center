import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// Mock global fetch used in the App
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        items: [],
        total: 0,
        log: [],
        sections: [],
        initialValues: {},
      }),
  }),
)

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('Storyblok App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

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
    // In the Storyblok App, tabs are rendered as simple buttons
    // The first tab button should be the Queue tab
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
})
