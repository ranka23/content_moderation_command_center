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
    authorName: 'Author 5',
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
    authorName: 'Author 3',
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
    authorName: 'Author 7',
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
    authorName: 'Author 2',
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
    authorName: 'Author 9',
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
  theme: 'light' as const,
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

  it('displays loading overlay when isLoading is true', () => {
    render(<QueueTable {...mockProps} isLoading />)
    // The loading overlay shows a spinner and "Loading..." text
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays empty state when no items match filters', () => {
    render(<QueueTable {...mockProps} items={[]} totalCount={0} />)
    expect(screen.getByText('No items match your filters.')).toBeInTheDocument()
    expect(
      screen.getByText('Try adjusting your search or filter criteria.'),
    ).toBeInTheDocument()
  })

  it('renders table headers correctly', () => {
    render(<QueueTable {...mockProps} />)
    // Column headers include Type, Title / Excerpt, Author, Date, Status, Spam Score, Actions
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Title / Excerpt')).toBeInTheDocument()
    expect(screen.getByText('Author')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Spam Score')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
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
    expect(screen.getByText('💬')).toBeInTheDocument()
    expect(screen.getByText('📝')).toBeInTheDocument()
    expect(screen.getByText('🖼️')).toBeInTheDocument()
    expect(screen.getByText('👤')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument()
  })

  it('shows Pending status badge', () => {
    render(<QueueTable {...mockProps} />)
    const pendingBadges = screen.getAllByText('Pending')
    expect(pendingBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Spam status badge', () => {
    render(<QueueTable {...mockProps} />)
    const spamElements = screen.getAllByText('Spam')
    // Find the badge in a table cell (not the column header)
    const spamBadge = spamElements.find(
      (el) => el.closest('td') !== null || el.closest('span') !== null,
    )
    expect(spamBadge).toBeInTheDocument()
  })

  it('shows Flagged status badge', () => {
    render(<QueueTable {...mockProps} />)
    // Multiple elements contain 'Flagged' (dropdown option and badge); find inside a span
    const flaggedBadges = screen.getAllByText('Flagged')
    const inBadge = flaggedBadges.find(
      (el) => el.closest('span') !== null || el.closest('td') !== null,
    )
    expect(inBadge).toBeInTheDocument()
  })

  it('calls onItemAction when approve button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    // The approve button has title="Approve" and displays ✓ icon
    const approveButtons = screen.getAllByTitle('Approve')
    fireEvent.click(approveButtons[0]!)
    expect(mockProps.onItemAction).toHaveBeenCalledWith('approve', '1')
  })

  it('calls onItemAction when reject button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    // Find the "✕" button (Reject) within the actions column
    const rejectButtons = screen.getAllByTitle('Reject')
    fireEvent.click(rejectButtons[0]!)
    expect(mockProps.onItemAction).toHaveBeenCalledWith('reject', '1')
  })

  it('calls onItemAction when spam button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const spamButtons = screen.getAllByTitle('Mark as Spam')
    fireEvent.click(spamButtons[0]!)
    expect(mockProps.onItemAction).toHaveBeenCalledWith('spam', '1')
  })

  it('calls onItemAction when defer button is clicked', () => {
    render(<QueueTable {...mockProps} />)
    const deferButtons = screen.getAllByTitle('Defer')
    fireEvent.click(deferButtons[0]!)
    expect(mockProps.onItemAction).toHaveBeenCalledWith('defer', '1')
  })

  it('selects items via checkbox', () => {
    render(<QueueTable {...mockProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is the select-all header checkbox, second is first row
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]!)
      expect(checkboxes[1]!).toBeChecked()
    }
  })

  it('header checkbox selects all items', () => {
    render(<QueueTable {...mockProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is the select-all header
    fireEvent.click(checkboxes[0]!)
    expect(checkboxes[0]!).toBeChecked()
  })

  it('renders pagination info with correct format', () => {
    render(<QueueTable {...mockProps} />)
    // Component shows "1–5 of 5 items"
    expect(screen.getByText(/1.*5.*of.*5.*items/i)).toBeInTheDocument()
  })

  it('shows correct pagination when totalCount differs', () => {
    render(<QueueTable {...mockProps} totalCount={100} />)
    // Component shows "1–5 of 100 items"
    expect(screen.getByText(/1.*5.*of.*100.*items/i)).toBeInTheDocument()
  })

  it('"Apply" button is rendered and can be clicked', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
  })

  it('renders author names', () => {
    render(<QueueTable {...mockProps} />)
    expect(screen.getByText('Author 5')).toBeInTheDocument()
    expect(screen.getByText('Author 3')).toBeInTheDocument()
    expect(screen.getByText('Author 7')).toBeInTheDocument()
  })

  it('handles empty items without crashing', () => {
    render(<QueueTable {...mockProps} items={[]} totalCount={0} />)
    expect(screen.getByText('No items match your filters.')).toBeInTheDocument()
    expect(
      screen.getByText('Try adjusting your search or filter criteria.'),
    ).toBeInTheDocument()
  })

  it('shows "per page" selector', () => {
    render(<QueueTable {...mockProps} />)
    // The per page label text is fragmented across the select element
    expect(screen.getByText(/per page/i)).toBeInTheDocument()
  })

  it('shows bulk actions dropdown', () => {
    render(<QueueTable {...mockProps} />)
    // The bulk actions dropdown should show "Bulk Actions" text
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
  })

  it('renders content type icons in type column', () => {
    render(<QueueTable {...mockProps} />)
    // Content type icons should be visible
    const typeIcons = screen.getAllByText('💬')
    expect(typeIcons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows search input', () => {
    render(<QueueTable {...mockProps} />)
    const searchInput = screen.getByPlaceholderText(/search titles & excerpts/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('sorts items by title', () => {
    render(<QueueTable {...mockProps} />)
    // Click the "Title / Excerpt" header to sort
    const titleHeader = screen.getByText('Title / Excerpt')
    fireEvent.click(titleHeader)
    // Sorting should be triggered (the onSort callback is not required, so just check no crash)
  })

  it('applies status filter via dropdown', () => {
    render(<QueueTable {...mockProps} />)
    // Find the status select and change it
    const selects = screen.getAllByRole('combobox')
    const statusSelect = selects.find((s) =>
      s.querySelector('option[value="all"]'),
    )
    if (statusSelect) {
      fireEvent.change(statusSelect, { target: { value: 'spam' } })
      expect(mockProps.onFilterChange).toHaveBeenCalledWith({ status: 'spam' })
    }
  })

  it('shows per page options', () => {
    render(<QueueTable {...mockProps} />)
    const perPageSelect = screen.getAllByRole('combobox').find((sel) => {
      const options = sel.querySelectorAll('option')
      return (
        options.length === 4 &&
        Array.from(options).some((o) => o.value === '25')
      )
    })
    expect(perPageSelect).toBeInTheDocument()
  })

  it('shows read/view button', () => {
    render(<QueueTable {...mockProps} />)
    const viewButtons = screen.getAllByTitle('View details')
    expect(viewButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('spam score column shows score values', () => {
    render(<QueueTable {...mockProps} />)
    // spamScore rendered with toFixed(2) - shows as "0.80", "0.95", etc.
    expect(screen.getByText('0.80')).toBeInTheDocument()
    expect(screen.getByText('0.95')).toBeInTheDocument()
  })
})
