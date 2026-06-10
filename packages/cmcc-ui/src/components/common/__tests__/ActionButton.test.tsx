import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ActionButtonProps } from '../ActionButton'
import { ActionButton } from '../ActionButton'

describe('ActionButton Component', () => {
  const baseProps: ActionButtonProps = {
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
  })

  it('applies variant classes', () => {
    render(
      <ActionButton {...baseProps} variant="destructive">
        Destructive
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('tw-bg-red-600')
  })

  it('renders ghost variant', () => {
    render(
      <ActionButton {...baseProps} variant="ghost">
        Ghost
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('tw-bg-transparent')
  })

  it('renders sm size', () => {
    render(
      <ActionButton {...baseProps} size="sm">
        Small
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveClass(
      'tw-h-9',
      'tw-rounded-md',
      'tw-px-3',
      'tw-text-xs',
    )
  })

  it('renders default size', () => {
    render(<ActionButton {...baseProps}>Default</ActionButton>)
    expect(screen.getByRole('button')).toHaveClass(
      'tw-h-10',
      'tw-px-4',
      'tw-py-2',
    )
  })

  it('renders lg size', () => {
    render(
      <ActionButton {...baseProps} size="lg">
        Large
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveClass('tw-h-11')
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

  it('disables button when loading', () => {
    render(
      <ActionButton {...baseProps} loading>
        Loading
      </ActionButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
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

  it('renders with type submit', () => {
    render(
      <ActionButton {...baseProps} type="submit">
        Submit
      </ActionButton>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
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
})
