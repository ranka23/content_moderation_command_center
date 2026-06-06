import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { NotificationBadgeProps } from '../NotificationBadge'
import NotificationBadge from '../NotificationBadge'

describe('NotificationBadge Component', () => {
  const baseProps: NotificationBadgeProps = {
    count: 5,
    type: 'pending',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the count', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 99+ for overflow counts', () => {
    render(<NotificationBadge {...baseProps} count={150} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('shows 0 for negative counts', () => {
    render(<NotificationBadge {...baseProps} count={-5} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders with correct colors for pending type', () => {
    render(<NotificationBadge {...baseProps} type="pending" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      backgroundColor: '#eab308',
      color: '#1c1917',
    })
  })

  it('renders with correct colors for spam type', () => {
    render(<NotificationBadge {...baseProps} type="spam" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      backgroundColor: '#dc2626',
      color: '#ffffff',
    })
  })

  it('renders with correct colors for alert type', () => {
    render(<NotificationBadge {...baseProps} type="alert" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      backgroundColor: '#ea580c',
      color: '#ffffff',
    })
  })

  it('has pulse animation when pulse is true', () => {
    render(<NotificationBadge {...baseProps} pulse />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      animation: 'cmcc-badge-pulse 1.5s ease-in-out infinite',
    })
  })

  it('does not have pulse animation when pulse is false', () => {
    render(<NotificationBadge {...baseProps} pulse={false} />)
    const badge = screen.getByRole('status')
    expect(badge).not.toHaveStyle({
      animation: 'cmcc-badge-pulse 1.5s ease-in-out infinite',
    })
  })

  it('does not have pulse animation by default', () => {
    render(<NotificationBadge {...baseProps} />)
    const badge = screen.getByRole('status')
    expect(badge.style.animation).toBe('')
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<NotificationBadge {...baseProps} onClick={onClick} />)
    fireEvent.click(screen.getByRole('status'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has pointer cursor when onClick is provided', () => {
    render(<NotificationBadge {...baseProps} onClick={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveStyle({
      cursor: 'pointer',
    })
  })

  it('has correct aria-label for pending type', () => {
    render(<NotificationBadge {...baseProps} type="pending" count={3} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Pending items: 3',
    )
  })

  it('has correct aria-label for spam type', () => {
    render(<NotificationBadge {...baseProps} type="spam" count={10} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Spam items: 10',
    )
  })

  it('has correct aria-label for alert type', () => {
    render(<NotificationBadge {...baseProps} type="alert" count={1} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Alerts: 1',
    )
  })

  it('renders with sm size', () => {
    render(<NotificationBadge {...baseProps} size="sm" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      fontSize: '10px',
      minWidth: '18px',
      height: '18px',
    })
  })

  it('renders with md size (default)', () => {
    render(<NotificationBadge {...baseProps} size="md" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      fontSize: '12px',
      minWidth: '22px',
      height: '22px',
    })
  })

  it('renders with md size by default', () => {
    render(<NotificationBadge {...baseProps} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      fontSize: '12px',
    })
  })
})
