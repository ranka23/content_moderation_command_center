import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ActionButtonProps } from '../ActionButton'
import ActionButton from '../ActionButton'

describe('ActionButton Component', () => {
  const baseProps: ActionButtonProps = {
    variant: 'primary',
    size: 'md',
    children: 'Click me',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default props', () => {
    render(<ActionButton {...baseProps} />)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-disabled', 'false')
  })

  it('renders primary variant with correct styles', () => {
    render(
      <ActionButton {...baseProps} variant="primary">
        Primary
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: '#2563eb',
      color: '#ffffff',
    })
  })

  it('renders secondary variant with correct styles', () => {
    render(
      <ActionButton {...baseProps} variant="secondary">
        Secondary
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: '#6b7280',
      color: '#ffffff',
    })
  })

  it('renders danger variant with correct styles', () => {
    render(
      <ActionButton {...baseProps} variant="danger">
        Danger
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: '#dc2626',
      color: '#ffffff',
    })
  })

  it('renders ghost variant with correct styles', () => {
    render(
      <ActionButton {...baseProps} variant="ghost">
        Ghost
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: 'transparent',
      color: '#374151',
    })
  })

  it('renders sm size with correct padding', () => {
    render(
      <ActionButton {...baseProps} size="sm">
        Small
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveStyle({
      padding: '4px 12px',
      fontSize: '12px',
    })
  })

  it('renders md size with correct padding', () => {
    render(
      <ActionButton {...baseProps} size="md">
        Medium
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveStyle({
      padding: '8px 16px',
      fontSize: '14px',
    })
  })

  it('renders lg size with correct padding', () => {
    render(
      <ActionButton {...baseProps} size="lg">
        Large
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveStyle({
      padding: '12px 24px',
      fontSize: '16px',
    })
  })

  it('renders icon on the left by default', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon">*</span>}
      >
        With Icon
      </ActionButton>,
    )
    const icon = screen.getByTestId('test-icon')
    expect(icon).toBeInTheDocument()
    const button = screen.getByRole('button')
    expect(button).toContainElement(icon)
  })

  it('renders icon on the right when iconPosition is right', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon">*</span>}
        iconPosition="right"
      >
        With Icon
      </ActionButton>,
    )
    const icon = screen.getByTestId('test-icon')
    expect(icon).toBeInTheDocument()
    const button = screen.getByRole('button')
    expect(button).toContainElement(icon)
  })

  it('shows loading spinner when loading', () => {
    render(
      <ActionButton {...baseProps} loading>
        Loading
      </ActionButton>,
    )
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })

  it('disables button when loading', () => {
    render(
      <ActionButton {...baseProps} loading>
        Loading
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('hides icon when loading', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon">*</span>}
        loading
      >
        Loading
      </ActionButton>,
    )
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(
      <ActionButton {...baseProps} onClick={onClick}>
        Clickable
      </ActionButton>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn()
    render(
      <ActionButton {...baseProps} onClick={onClick} disabled>
        Disabled
      </ActionButton>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not call onClick when loading', () => {
    const onClick = jest.fn()
    render(
      <ActionButton {...baseProps} onClick={onClick} loading>
        Loading
      </ActionButton>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets aria-disabled when disabled', () => {
    render(
      <ActionButton {...baseProps} disabled>
        Disabled
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('sets aria-disabled to false when not disabled or loading', () => {
    render(<ActionButton {...baseProps}>Enabled</ActionButton>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false')
  })

  it('sets aria-busy when loading', () => {
    render(
      <ActionButton {...baseProps} loading>
        Loading
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders with type submit', () => {
    render(
      <ActionButton {...baseProps} type="submit">
        Submit
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('renders with type button by default', () => {
    render(<ActionButton {...baseProps}>Button</ActionButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('applies custom className', () => {
    render(
      <ActionButton {...baseProps} className="custom-class">
        Styled
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('hides icon from accessibility tree with aria-hidden', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon">*</span>}
      >
        With Icon
      </ActionButton>,
    )
    const icon = screen.getByTestId('test-icon')
    const iconContainer = icon.parentElement
    expect(iconContainer).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders children text', () => {
    render(<ActionButton {...baseProps}>Button Text</ActionButton>)
    expect(screen.getByText('Button Text')).toBeInTheDocument()
  })

  it('applies reduced opacity when disabled', () => {
    render(
      <ActionButton {...baseProps} disabled>
        Disabled
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveStyle({ opacity: 0.6 })
  })

  it('applies full opacity when enabled', () => {
    render(<ActionButton {...baseProps}>Enabled</ActionButton>)
    expect(screen.getByRole('button')).toHaveStyle({ opacity: 1 })
  })
})
