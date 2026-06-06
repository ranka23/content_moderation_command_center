import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { QueueItem, QueueTableProps } from '../QueueTable'
import QueueTable from '../QueueTable'

// Mock queue items
const mockQueueItems: QueueItem[] = [
  {
    id: '1',
    contentType: 'comment',
    originalId: 101,
    status: 'pending',
    spamScore: 0.8,
    authorId: 5,
    dateGmt: '2023-06-15T10:30:00Z',
    title: 'Test comment',
    excerpt: 'This is a test comment',
    typeIcon: '💬',
    statusLabel: 'Pending',
    statusColor: '#ffc107',
  },
  {
    id: '2',
    contentType: 'post',
    originalId: 202,
    status: 'spam',
    spamScore: 0.95,
    authorId: 3,
    dateGmt: '2023-06-15T09:15:00Z',
    title: 'Test post',
    excerpt: 'This is a test post',
    typeIcon: '📝',
    statusLabel: 'Spam',
    statusColor: '#dc3545',
  },
]

// Mock props
const mockProps: QueueTableProps = {
  items: mockQueueItems,
  onBulkAction: jest.fn(),
  onItemAction: jest.fn(),
  filters: {
    contentType: 'all',
    status: 'all',
    dateRange: 'all',
    search: '',
  },
  onFilterChange: jest.fn(),
  isLoading: false,
  totalCount: 2,
}

describe('QueueTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.getByText('Test post')).toBeInTheDocument()
  })

  it('displays loading state when isLoading is true', () => {
    render(<QueueTable {...mockProps} isLoading />)
    expect(screen.getByText('Loading queue items...')).toBeInTheDocument()
  })

  it('displays empty state when no items match filters', () => {
    const emptyProps = {
      ...mockProps,
      items: [],
      totalCount: 0,
    }
    render(<QueueTable {...emptyProps} />)
    expect(
      screen.getByText(
        'No items match your filters. Try adjusting your criteria.',
      ),
    ).toBeInTheDocument()
  })

  it('renders table headers correctly', () => {
    render(<QueueTable {...mockProps} />)

    // Check for header elements
    expect(
      screen.getByRole('columnheader', { name: /type/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /title.*excerpt/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /author/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /date/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /status/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /spam.*score/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /actions/i }),
    ).toBeInTheDocument()
  })

  it('renders queue items with correct data', () => {
    render(<QueueTable {...mockProps} />)

    // First item
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.getByText('This is a test comment')).toBeInTheDocument()
    expect(screen.getByText('💬')).toBeInTheDocument() // comment icon
    expect(screen.getByText('Pending')).toBeInTheDocument()

    // Second item
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.getByText('This is a test post')).toBeInTheDocument()
    expect(screen.getByText('📝')).toBeInTheDocument() // post icon
    // Use getAllByText('Spam') because there are 2 Spam buttons and 1 Spam status label
    expect(screen.getAllByText('Spam').length).toBe(3)
  })

  it('calls onItemAction when approve button is clicked', () => {
    render(<QueueTable {...mockProps} />)

    // Find and click the first approve button
    const approveButtons = screen.getAllByRole('button', { name: /approve/i })
    fireEvent.click(approveButtons[0]!)

    expect(mockProps.onItemAction).toHaveBeenCalledWith('approve', '1')
  })

  it('calls onItemAction when reject button is clicked', () => {
    render(<QueueTable {...mockProps} />)

    // Find and click the first reject button
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
    fireEvent.click(rejectButtons[0]!)

    expect(mockProps.onItemAction).toHaveBeenCalledWith('reject', '1')
  })

  it('calls onItemAction when spam button is clicked', () => {
    render(<QueueTable {...mockProps} />)

    // Find and click the first spam button
    const spamButtons = screen.getAllByRole('button', { name: /spam/i })
    fireEvent.click(spamButtons[0]!)

    expect(mockProps.onItemAction).toHaveBeenCalledWith('spam', '1')
  })

  it('calls onItemAction when defer button is clicked', () => {
    render(<QueueTable {...mockProps} />)

    // Find and click the first defer button
    const deferButtons = screen.getAllByRole('button', { name: /defer/i })
    fireEvent.click(deferButtons[0]!)

    expect(mockProps.onItemAction).toHaveBeenCalledWith('defer', '1')
  })

  it('handles bulk action dropdown change', () => {
    render(<QueueTable {...mockProps} />)

    const bulkSelect = screen.getByRole('combobox')
    fireEvent.change(bulkSelect, { target: { value: 'approve-all' } })

    expect(mockProps.onBulkAction).toHaveBeenCalledWith('approve-all', [])
  })

  it('applies content type filter', () => {
    const filteredProps = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        contentType: 'comment',
      },
    }

    render(<QueueTable {...filteredProps} />)

    // Should only show comment item
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.queryByText('Test post')).not.toBeInTheDocument()
  })

  it('applies status filter', () => {
    const filteredProps = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        status: 'spam',
      },
    }

    render(<QueueTable {...filteredProps} />)

    // Should only show spam item
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument()
  })

  it('applies search filter', () => {
    const filteredProps = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        search: 'post',
      },
    }

    render(<QueueTable {...filteredProps} />)

    // Should only show item with 'post' in title or excerpt
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument()
  })

  it('shows pagination info', () => {
    render(<QueueTable {...mockProps} />)

    expect(screen.getByText(/showing 2 of 2 items/i)).toBeInTheDocument()
  })
})
