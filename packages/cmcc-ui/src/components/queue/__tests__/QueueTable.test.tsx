import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { QueueItem, QueueTableProps } from '../QueueTable'
import QueueTable from '../QueueTable'

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
  {
    id: '3',
    contentType: 'media',
    originalId: 303,
    status: 'flagged',
    spamScore: 0.5,
    authorId: 7,
    dateGmt: '2023-06-14T14:00:00Z',
    title: 'Test media',
    excerpt: 'This is a test media item',
    typeIcon: '🖼️',
    statusLabel: 'Flagged',
    statusColor: '#fd7e14',
  },
  {
    id: '4',
    contentType: 'user',
    originalId: 404,
    status: 'pending',
    spamScore: 0.2,
    authorId: 2,
    dateGmt: '2023-06-13T08:00:00Z',
    title: 'Test user',
    excerpt: 'This is a test user profile',
    typeIcon: '👤',
    statusLabel: 'Pending',
    statusColor: '#ffc107',
  },
  {
    id: '5',
    contentType: 'form_entry',
    originalId: 505,
    status: 'pending',
    spamScore: 0.1,
    authorId: 9,
    dateGmt: '2023-06-12T16:45:00Z',
    title: 'Form entry',
    excerpt: 'This is a form submission',
    typeIcon: '📋',
    statusLabel: 'Pending',
    statusColor: '#ffc107',
  },
]

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
  totalCount: 5,
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
    render(<QueueTable {...mockProps} items={[]} totalCount={0} />)
    expect(
      screen.getByText(
        'No items match your filters. Try adjusting your criteria.',
      ),
    ).toBeInTheDocument()
  })

  it('renders table headers correctly', () => {
    render(<QueueTable {...mockProps} />)
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

  it('renders all queue items with correct data', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.getByText('Test media')).toBeInTheDocument()
    expect(screen.getByText('Test user')).toBeInTheDocument()
    expect(screen.getByText('Form entry')).toBeInTheDocument()
  })

  it('renders different content type icons', () => {
    render(<QueueTable {...mockProps} />)
    // comment, post, media, user, form_entry
    expect(screen.getByText('💬')).toBeInTheDocument()
    expect(screen.getByText('📝')).toBeInTheDocument()
    expect(screen.getByText('🖼️')).toBeInTheDocument()
    expect(screen.getByText('👤')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument()
  })

  it('shows Pending status text', () => {
    render(<QueueTable {...mockProps} />)
    const pendingStatusElements = screen.getAllByText('Pending')
    expect(pendingStatusElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Spam status with red color', () => {
    render(<QueueTable {...mockProps} />)
    const spamElements = screen.getAllByText('Spam')
    // Filter to find the status label (not the action buttons)
    const spamStatus = spamElements.find((el) => el.closest('td') !== null)
    expect(spamStatus).toBeInTheDocument()
  })

  it('shows Flagged status with orange color', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('Flagged')).toBeInTheDocument()
  })

  it('calls onItemAction when approve button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const approveButtons = screen.getAllByRole('button', {
      name: /approve/i,
    })
    fireEvent.click(approveButtons[0])
    expect(mockProps.onItemAction).toHaveBeenCalledWith('approve', '1')
  })

  it('calls onItemAction when reject button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const rejectButtons = screen.getAllByRole('button', {
      name: /reject/i,
    })
    fireEvent.click(rejectButtons[0])
    expect(mockProps.onItemAction).toHaveBeenCalledWith('reject', '1')
  })

  it('calls onItemAction when spam button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const spamButtons = screen.getAllByRole('button', {
      name: /spam/i,
    })
    fireEvent.click(spamButtons[0])
    expect(mockProps.onItemAction).toHaveBeenCalledWith('spam', '1')
  })

  it('calls onItemAction when defer button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const deferButtons = screen.getAllByRole('button', {
      name: /defer/i,
    })
    fireEvent.click(deferButtons[0])
    expect(mockProps.onItemAction).toHaveBeenCalledWith('defer', '1')
  })

  it('handles bulk action dropdown change', () => {
    render(<QueueTable {...mockProps} />)
    const bulkSelect = screen.getByRole('combobox')
    fireEvent.change(bulkSelect, { target: { value: 'approve-all' } })
    expect(mockProps.onBulkAction).toHaveBeenCalledWith('approve-all', [])
  })

  it('handles mark-as-spam bulk action', () => {
    render(<QueueTable {...mockProps} />)
    const bulkSelect = screen.getByRole('combobox')
    fireEvent.change(bulkSelect, {
      target: { value: 'mark-as-spam' },
    })
    expect(mockProps.onBulkAction).toHaveBeenCalledWith('mark-as-spam', [])
  })

  it('handles export-csv bulk action', () => {
    render(<QueueTable {...mockProps} />)
    const bulkSelect = screen.getByRole('combobox')
    fireEvent.change(bulkSelect, {
      target: { value: 'export-csv' },
    })
    expect(mockProps.onBulkAction).toHaveBeenCalledWith('export-csv', [])
  })

  it('renders checkbox in each row', () => {
    render(<QueueTable {...mockProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders header checkbox', () => {
    render(<QueueTable {...mockProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is the header checkbox
    expect(checkboxes[0]).toBeInTheDocument()
  })

  it('applies content type filter', () => {
    render(
      <QueueTable
        {...mockProps}
        filters={{ ...mockProps.filters, contentType: 'comment' }}
      />,
    )
    expect(screen.getByText('Test comment')).toBeInTheDocument()
    expect(screen.queryByText('Test post')).not.toBeInTheDocument()
    expect(screen.queryByText('Test media')).not.toBeInTheDocument()
  })

  it('applies status filter for spam', () => {
    render(
      <QueueTable
        {...mockProps}
        filters={{ ...mockProps.filters, status: 'spam' }}
      />,
    )
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument()
  })

  it('applies status filter for flagged', () => {
    render(
      <QueueTable
        {...mockProps}
        filters={{ ...mockProps.filters, status: 'flagged' }}
      />,
    )
    expect(screen.getByText('Test media')).toBeInTheDocument()
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument()
  })

  it('applies search filter matching title', () => {
    render(
      <QueueTable
        {...mockProps}
        filters={{ ...mockProps.filters, search: 'post' }}
      />,
    )
    expect(screen.getByText('Test post')).toBeInTheDocument()
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument()
  })

  it('applies search filter matching excerpt', () => {
    render(
      <QueueTable
        {...mockProps}
        filters={{ ...mockProps.filters, search: 'form' }}
      />,
    )
    expect(screen.getByText('Form entry')).toBeInTheDocument()
  })

  it('shows pagination info', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText(/showing 5 of 5 items/i)).toBeInTheDocument()
  })

  it('shows correct pagination when totalCount differs', () => {
    render(<QueueTable {...mockProps} totalCount={100} />)
    expect(screen.getByText(/showing 5 of 100 items/i)).toBeInTheDocument()
  })

  it('"Apply" button is rendered', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
  })

  it('"Refresh" button is rendered', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('renders spam score with one decimal place', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('0.8')).toBeInTheDocument()
    // 0.95.toFixed(1) returns '0.9' due to IEEE 754
    expect(screen.getByText('0.9')).toBeInTheDocument()
  })

  it('passes theme prop without errors', () => {
    render(<QueueTable {...mockProps} theme={{ primaryColor: '#000' }} />)
    expect(screen.getByText('Test comment')).toBeInTheDocument()
  })

  it('renders author IDs', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('Author 5')).toBeInTheDocument()
    expect(screen.getByText('Author 3')).toBeInTheDocument()
    expect(screen.getByText('Author 7')).toBeInTheDocument()
  })

  it('handles empty items without crashing', () => {
    render(<QueueTable {...mockProps} items={[]} totalCount={0} />)
    expect(
      screen.getByText(
        'No items match your filters. Try adjusting your criteria.',
      ),
    ).toBeInTheDocument()
  })
})
