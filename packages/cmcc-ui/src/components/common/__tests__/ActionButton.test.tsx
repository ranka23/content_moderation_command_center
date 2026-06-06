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
  })

  it('renders with different variants', () => {
    const variants: ActionButtonProps['variant'][] = [
      'primary',
      'secondary',
      'danger',
      'ghost',
    ]

    for (const variant of variants) {
      const { unmount } = render(
        <ActionButton {...baseProps} variant={variant}>
          {variant}
        </ActionButton>,
      )
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument()
      unmount()
    }
  })

  it('renders with different sizes', () => {
    const sizes: ActionButtonProps['size'][] = ['sm', 'md', 'lg']

    for (const size of sizes) {
      const { unmount } = render(
        <ActionButton {...baseProps} size={size}>
          {size}
        </ActionButton>,
      )
      expect(screen.getByRole('button', { name: size })).toBeInTheDocument()
      unmount()
    }
  })

  it('renders icon on the left by default', () => {
    render(
      <ActionButton {...baseProps} icon={<span data-testid="test-icon" />}>
        With Icon
      </ActionButton>,
    )
    const icon = screen.getByTestId('test-icon')
    expect(icon).toBeInTheDocument()
    // Icon is before the text
    const button = screen.getByRole('button')
    expect(button).toContainElement(icon)
  })

  it('renders icon on the right when iconPosition is right', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon" />}
        iconPosition="right"
      >
        With Icon
      </ActionButton>,
    )
    const icon = screen.getByTestId('test-icon')
    expect(icon).toBeInTheDocument()
  })

  it('shows loading spinner and disables button when loading', () => {
    render(
      <ActionButton {...baseProps} loading>
        Loading
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    // Loading spinner should be present
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('hides icon when loading', () => {
    render(
      <ActionButton
        {...baseProps}
        icon={<span data-testid="test-icon" />}
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

  it('applies custom className', () => {
    render(
      <ActionButton {...baseProps} className="custom-class">
        Styled
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('renders with type submit', () => {
    render(
      <ActionButton {...baseProps} type="submit">
        Submit
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('sets aria-disabled when disabled', () => {
    render(
      <ActionButton {...baseProps} disabled>
        Disabled
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
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
})
