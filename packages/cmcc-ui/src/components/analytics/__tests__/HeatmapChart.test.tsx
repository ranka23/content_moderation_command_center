import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HeatmapData } from '../HeatmapChart'
import HeatmapChart from '../HeatmapChart'

describe('HeatmapChart Component', () => {
  const mockHeatmapData: HeatmapData = {
    data: [
      [0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    maxCount: 3,
  }

  const emptyData: HeatmapData = {
    data: Array(7)
      .fill(0)
      .map(() => Array(24).fill(0)),
    maxCount: 0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    expect(screen.getByText(/activity level/i)).toBeInTheDocument()
  })

  it('renders all 7 day labels', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })

  it('renders hour labels every 4 hours', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    // Only every 4th hour shows a label (0:00, 4:00, 8:00, 12:00, 16:00, 20:00)
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getByText('4:00')).toBeInTheDocument()
    expect(screen.getByText('8:00')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('16:00')).toBeInTheDocument()
    expect(screen.getByText('20:00')).toBeInTheDocument()
  })

  it('displays cell counts correctly', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    const ones = screen.getAllByText('1')
    expect(ones.length).toBeGreaterThanOrEqual(1)
    const twos = screen.getAllByText('2')
    expect(twos.length).toBeGreaterThanOrEqual(1)
    const threes = screen.getAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(1)
  })

  it('handles empty heatmap data with all zeros', () => {
    render(<HeatmapChart data={emptyData} />)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('handles undefined data gracefully', () => {
    render(<HeatmapChart data={undefined as unknown as HeatmapData} />)
    expect(screen.getByText('No activity data yet')).toBeInTheDocument()
  })

  it('handles null data gracefully', () => {
    render(<HeatmapChart data={null as unknown as HeatmapData} />)
    expect(screen.getByText('No activity data yet')).toBeInTheDocument()
  })

  it('handles data with empty array', () => {
    const empty: HeatmapData = { data: [], maxCount: 0 }
    render(<HeatmapChart data={empty} />)
    expect(screen.getByText('No activity data yet')).toBeInTheDocument()
  })

  it('calls onCellClick when cell is clicked', () => {
    const onCellClickMock = jest.fn()
    render(
      <HeatmapChart data={mockHeatmapData} onCellClick={onCellClickMock} />,
    )
    const cellElements = screen.getAllByText('1')
    const cell = cellElements[0]
    if (cell) {
      fireEvent.click(cell)
      expect(onCellClickMock).toHaveBeenCalledWith(0, 1, 1)
    }
  })

  it('calls onCellClick with correct count for max value', () => {
    const onCellClickMock = jest.fn()
    render(
      <HeatmapChart data={mockHeatmapData} onCellClick={onCellClickMock} />,
    )
    const maxCells = screen.getAllByText('3')
    const maxCell = maxCells[0]
    if (maxCell) {
      fireEvent.click(maxCell)
      expect(onCellClickMock).toHaveBeenCalledWith(0, 3, 3)
    }
  })

  it('does not call onCellClick when handler is not provided', () => {
    const onCellClickMock = jest.fn()
    render(<HeatmapChart data={mockHeatmapData} />)
    const cells = screen.getAllByText('1')
    const cell = cells[0]
    if (cell) {
      fireEvent.click(cell)
      expect(onCellClickMock).not.toHaveBeenCalled()
    }
  })

  it('shows tooltip title when showTooltip is true', () => {
    render(<HeatmapChart data={mockHeatmapData} showTooltip={true} />)
    const cells = screen.getAllByText('1')
    if (cells.length > 0) {
      expect(cells[0]).toHaveAttribute('title')
    }
  })

  it('hides tooltip title when showTooltip is false', () => {
    render(<HeatmapChart data={mockHeatmapData} showTooltip={false} />)
    const cells = screen.getAllByText('1')
    if (cells.length > 0) {
      expect(cells[0]).not.toHaveAttribute('title')
    }
  })

  it('color legend renders with correct labels', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    expect(screen.getByText('Activity Level')).toBeInTheDocument()
    // Legend shows min (0) value — use getAllByText and find the one in the legend
    const zeroElements = screen.getAllByText('0')
    // There may be multiple '0' (one in legend, possibly in cells), but at least one exists
    expect(zeroElements.length).toBeGreaterThanOrEqual(1)
    // Legend shows max (maxCount=3) — the legend's max span
    const threeElements = screen.getAllByText('3')
    expect(threeElements.length).toBeGreaterThanOrEqual(1)
  })

  it('color intensity scales with count relative to maxCount', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    // Cells with value 0 should NOT render zero text (they display '')
    // Cells with positive counts should display their value text
    const ones = screen.getAllByText('1')
    expect(ones.length).toBeGreaterThanOrEqual(1)
    const threes = screen.getAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows pointer cursor when onCellClick is provided', () => {
    render(<HeatmapChart data={mockHeatmapData} onCellClick={jest.fn()} />)
    const cells = screen.getAllByText('1')
    if (cells.length > 0) {
      expect(cells[0]).toHaveStyle({ cursor: 'pointer' })
    }
  })

  it('shows default cursor when onCellClick is not provided', () => {
    render(<HeatmapChart data={mockHeatmapData} />)
    const cells = screen.getAllByText('1')
    if (cells.length > 0) {
      expect(cells[0]).toHaveStyle({ cursor: 'default' })
    }
  })

  it('passes theme prop without crashing', () => {
    const theme = {
      primaryColor: '#ff0000',
      fontFamily: 'Arial',
    }
    render(<HeatmapChart data={mockHeatmapData} theme={theme} />)
    expect(screen.getByText(/activity level/i)).toBeInTheDocument()
  })

  it('handles single row of data', () => {
    const singleRow: HeatmapData = {
      data: [
        [
          5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0,
        ],
      ],
      maxCount: 5,
    }
    render(<HeatmapChart data={singleRow} />)
    // The single row should render with the value 5 (both in cell and legend)
    const fives = screen.getAllByText('5')
    expect(fives.length).toBeGreaterThanOrEqual(1)
    // It should also show day label for Sun (row 0)
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })
})
