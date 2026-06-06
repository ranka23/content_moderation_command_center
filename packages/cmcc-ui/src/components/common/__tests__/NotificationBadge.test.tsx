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

  it('renders the count number', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 99+ for counts above 99', () => {
    render(<NotificationBadge {...baseProps} count={100} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('shows 99+ for very large counts', () => {
    render(<NotificationBadge {...baseProps} count={9999} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('shows 0 for zero count', () => {
    render(<NotificationBadge {...baseProps} count={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows 0 for negative counts', () => {
    render(<NotificationBadge {...baseProps} count={-5} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders pending type with yellow background', () => {
    render(<NotificationBadge {...baseProps} type="pending" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      backgroundColor: '#eab308',
      color: '#1c1917',
    })
  })

  it('renders spam type with red background', () => {
    render(<NotificationBadge {...baseProps} type="spam" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      backgroundColor: '#dc2626',
      color: '#ffffff',
    })
  })

  it('renders alert type with orange background', () => {
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
    expect(badge.style.animation).toBe('')
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

  it('calls onClick multiple times correctly', () => {
    const onClick = jest.fn()
    render(<NotificationBadge {...baseProps} onClick={onClick} />)
    const badge = screen.getByRole('status')
    fireEvent.click(badge)
    fireEvent.click(badge)
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('has pointer cursor when onClick is provided', () => {
    render(<NotificationBadge {...baseProps} onClick={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveStyle({
      cursor: 'pointer',
    })
  })

  it('does not have pointer cursor without onClick', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByRole('status')).not.toHaveStyle({
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

  it('has correct aria-label for 99+ overflow', () => {
    render(<NotificationBadge {...baseProps} type="pending" count={150} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Pending items: 150',
    )
  })

  it('renders sm size with correct dimensions', () => {
    render(<NotificationBadge {...baseProps} size="sm" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      fontSize: '10px',
      minWidth: '18px',
      height: '18px',
    })
  })

  it('renders md size with correct dimensions', () => {
    render(<NotificationBadge {...baseProps} size="md" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveStyle({
      fontSize: '12px',
      minWidth: '22px',
      height: '22px',
    })
  })

  it('renders md size by default', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByRole('status')).toHaveStyle({
      fontSize: '12px',
    })
  })

  it('has role="status" for accessibility', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has rounded pill shape', () => {
    render(<NotificationBadge {...baseProps} />)
    expect(screen.getByRole('status')).toHaveStyle({
      borderRadius: '9999px',
    })
  })

  it('shows correct count for single digit', () => {
    render(<NotificationBadge {...baseProps} count={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows correct count for double digit', () => {
    render(<NotificationBadge {...baseProps} count={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
