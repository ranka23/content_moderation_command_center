/**
 * Additional UI component unit tests for @cmcc/ui
 *
 * Tests components not covered in components.test.tsx
 */

import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ActionButton } from '../components/common/ActionButton'
import { NotificationBadge } from '../components/common/NotificationBadge'
import { SlideOutPanel } from '../components/common/SlideOutPanel'
import { ProgressBar } from '../components/common/ProgressBar/index'
import { ConfirmationModal } from '../components/common/ConfirmationModal/index'

// ── ActionButton ────────────────────────────────────────────────────

describe('ActionButton', () => {
  it('renders with children', () => {
    render(<ActionButton>Approve</ActionButton>)
    expect(screen.getByText('Approve')).toBeInTheDocument()
  })

  it('calls onClick handler', () => {
    const handleClick = jest.fn()
    render(<ActionButton onClick={handleClick}>Approve</ActionButton>)
    fireEvent.click(screen.getByText('Approve'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<ActionButton loading={true}>Approve</ActionButton>)
    expect(screen.getByText('Approve')).toBeDisabled()
  })
})

// ── NotificationBadge ───────────────────────────────────────────────

describe('NotificationBadge', () => {
  it('renders with count', () => {
    render(<NotificationBadge count={5} type="pending" />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders 0 when count is 0', () => {
    render(<NotificationBadge count={0} type="pending" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders max count when count exceeds max', () => {
    render(<NotificationBadge count={150} type="pending" />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('renders with type style', () => {
    const { container } = render(<NotificationBadge count={3} type="pending" />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

// ── SlideOutPanel ──────────────────────────────────────────────────

describe('SlideOutPanel', () => {
  it('renders when open', () => {
    render(
      <SlideOutPanel open={true} onClose={() => {}} title="Test Panel">
        <p>Panel content</p>
      </SlideOutPanel>,
    )
    expect(screen.getByText('Test Panel')).toBeInTheDocument()
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const handleClose = jest.fn()
    render(
      <SlideOutPanel open={true} onClose={handleClose} title="Close me">
        <p>Content</p>
      </SlideOutPanel>,
    )
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})

// ── ProgressBar ─────────────────────────────────────────────────────

describe('ProgressBar', () => {
  it('renders with label', () => {
    render(<ProgressBar value={60} label="Halfway" />)
    expect(screen.getByText('Halfway')).toBeInTheDocument()
  })

  it('renders with percentage', () => {
    render(<ProgressBar value={60} />)
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('shows indeterminate when set', () => {
    const { container } = render(<ProgressBar value={0} indeterminate />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('clamps percentage between 0 and 100', () => {
    render(<ProgressBar value={-10} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    render(<ProgressBar value={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows different size variants', () => {
    const { container, rerender } = render(<ProgressBar value={50} size="sm" />)
    rerender(<ProgressBar value={50} size="lg" />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

// ── ConfirmationModal ──────────────────────────────────────────────

describe('ConfirmationModal', () => {
  it('renders when open', () => {
    render(
      <ConfirmationModal
        open={true}
        title="Confirm"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // 'Confirm' appears both in the title and as the default confirm button label
    const confirmElements = screen.getAllByText('Confirm')
    expect(confirmElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm clicked', () => {
    const handleConfirm = jest.fn()
    render(
      <ConfirmationModal
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={handleConfirm}
        onCancel={() => {}}
        confirmLabel="Yes"
      />,
    )
    fireEvent.click(screen.getByText('Yes'))
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel clicked', () => {
    const handleCancel = jest.fn()
    render(
      <ConfirmationModal
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={handleCancel}
        cancelLabel="No"
      />,
    )
    fireEvent.click(screen.getByText('No'))
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('does not render when not open', () => {
    const { container } = render(
      <ConfirmationModal
        open={false}
        title="Hidden"
        message="Hidden"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
