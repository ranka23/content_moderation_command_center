/**
 * Unit tests for @cmcc/ui shared components
 *
 * Tests rendering, props, and edge cases for all UI components.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Pagination } from '../components/ui/Pagination'
import { SkeletonTable } from '../components/common/SkeletonTable'
import { SkeletonCard } from '../components/common/SkeletonCard'
import { EmptyState } from '../components/common/EmptyState'

// ── Button ─────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('renders as disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onClick handler', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(
      <Button disabled onClick={handleClick}>
        Click
      </Button>,
    )
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('tw-bg-red-600')
  })

  it('applies size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    expect(container.firstChild).toHaveClass('tw-h-9')
  })
})

// ── Badge ──────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>Pending</Badge>)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { container } = render(<Badge variant="success">Approved</Badge>)
    expect(container.firstChild).toHaveClass('tw-bg-green-100')
  })

  it('applies default variant when none specified', () => {
    const { container } = render(<Badge>Default</Badge>)
    expect(container.firstChild).toHaveClass('tw-bg-primary-100')
  })
})

// ── Card ───────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Content</p>
      </Card>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="My Card">Content</Card>)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('renders action element when provided', () => {
    render(<Card action={<button>Action</button>}>Content</Card>)
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('does not render header when no title or action', () => {
    const { container } = render(<Card>Content</Card>)
    const header = container.querySelector('.tw-border-b')
    expect(header).not.toBeInTheDocument()
  })
})

// ── Input ──────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders as disabled', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})

// ── Select ─────────────────────────────────────────────────────────────

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders placeholder when provided', () => {
    render(<Select options={options} placeholder="Choose..." />)
    expect(screen.getByText('Choose...')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    render(<Select options={options} onChange={handleChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(handleChange).toHaveBeenCalled()
  })
})

// ── Pagination ─────────────────────────────────────────────────────────

describe('Pagination', () => {
  it('renders page numbers', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />,
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('does not render when totalPages <= 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onPageChange when clicking a page', () => {
    const handleChange = jest.fn()
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={handleChange} />,
    )
    fireEvent.click(screen.getByText('2'))
    expect(handleChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]!).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[buttons.length - 1]!).toBeDisabled()
  })

  it('shows ellipsis for many pages', () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={() => {}} />,
    )
    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(1)
  })
})

// ── SkeletonTable ──────────────────────────────────────────────────────

describe('SkeletonTable', () => {
  it('renders specified number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} columns={4} />)
    // Rows are rendered as <tr> elements inside <tbody>
    const tbody = container.querySelector('tbody')
    const rows = tbody?.querySelectorAll('tr') || []
    expect(rows.length).toBe(3)
  })
})

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

// ── EmptyState ─────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No Data" />)
    expect(screen.getByText('No Data')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing to show" />)
    expect(screen.getByText('Nothing to show')).toBeInTheDocument()
  })

  it('renders action element when provided', () => {
    render(<EmptyState title="Empty" action={<button>Retry</button>} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('uses default icon when no icon specified', () => {
    const { container } = render(<EmptyState title="Empty" />)
    // The component renders the default Inbox SVG icon when no icon prop is provided
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('lucide-inbox')
  })
})
