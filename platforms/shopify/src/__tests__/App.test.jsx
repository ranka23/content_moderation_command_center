import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock @shopify/polaris components
jest.mock('@shopify/polaris', () => ({
  AppProvider: ({ children }) => (
    <div data-testid="app-provider">{children}</div>
  ),
  Page: ({ children, title }) => (
    <div data-testid="page">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  Card: ({ children, title, _sectioned }) => (
    <div data-testid="card" data-sectioned={_sectioned}>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  ),
  Tabs: ({ tabs, selected, onSelect, fitted }) => (
    <div data-testid="tabs" data-selected={selected} data-fitted={fitted}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onSelect(tabs.indexOf(tab))}>
          {tab.content}
        </button>
      ))}
    </div>
  ),
  DataTable: ({ headings, rows }) => (
    <table data-testid="data-table">
      <thead>
        <tr>
          {headings.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Button: ({
    children,
    onClick,
    primary,
    destructive,
    size,
    loading,
    disabled,
  }) => (
    <button
      data-primary={primary}
      data-destructive={destructive}
      data-size={size}
      data-loading={loading}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Select: ({ label, value, onChange, options }) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  TextField: ({ label, value, onChange, type, helpText, min, max, step }) => (
    <div>
      <label>{label}</label>
      <input
        type={type || 'text'}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {helpText && <span>{helpText}</span>}
    </div>
  ),
  Layout: ({ children, _sectioned }) => (
    <div data-testid="layout">{children}</div>
  ),
  Layout: {
    Section: ({ children }) => (
      <div data-testid="layout-section">{children}</div>
    ),
  },
  Banner: ({ title, status, children, action }) => (
    <div data-testid="banner" data-status={status}>
      <h2>{title}</h2>
      {children}
      {action && <button onClick={action.onAction}>{action.content}</button>}
    </div>
  ),
  Toast: ({ content }) => <div data-testid="toast">{content}</div>,
  Spinner: ({ accessibilityLabel, size }) => (
    <div
      data-testid="spinner"
      aria-label={accessibilityLabel}
      data-size={size}
    />
  ),
  Badge: ({ children, status }) => (
    <span data-testid="badge" data-status={status}>
      {children}
    </span>
  ),
  EmptyState: ({ heading, children, action }) => (
    <div data-testid="empty-state">
      <h2>{heading}</h2>
      {children}
      {action && <button onClick={action.onAction}>{action.content}</button>}
    </div>
  ),
  Frame: ({ children }) => <div data-testid="frame">{children}</div>,
}))

// Mock polaris styles
jest.mock('@shopify/polaris/build/esm/styles.css', () => '')

describe('Shopify App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch for initial data load
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
            totalModerated: 0,
            spamDetected: 0,
            approved: 0,
            pendingReview: 0,
            spamRatio: 0,
            contentBreakdown: [],
            log: [],
            settings: {
              autoModerate: false,
              spamThreshold: 0.8,
              notifyOnFlag: true,
              maxQueueSize: 1000,
            },
          }),
      }),
    )
  })

  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.cmcc-shopify-app')).toBeInTheDocument()
  })

  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText(/cmcc content moderation/i)).toBeInTheDocument()
  })

  it('renders the AppProvider', () => {
    render(<App />)
    expect(screen.getByTestId('app-provider')).toBeInTheDocument()
  })

  it('renders the Frame component', () => {
    render(<App />)
    expect(screen.getByTestId('frame')).toBeInTheDocument()
  })

  it('renders tab navigation', () => {
    render(<App />)
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  it('renders the Page component with title', () => {
    render(<App />)
    expect(screen.getByTestId('page')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<App />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders all 4 tab names', () => {
    render(<App />)
    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Activity Log')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})
