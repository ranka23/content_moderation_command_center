import React from 'react'

// Define types for our heatmap data
export interface HeatmapData {
  data: number[][]
  maxCount: number
}

export interface HeatmapChartProps {
  data: HeatmapData
  theme?: Record<string, unknown>
  onCellClick?: (dayOfWeek: number, hour: number, count: number) => void
  showTooltip?: boolean
}

// Day labels (0-6 = Sunday-Saturday)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Hour labels (0-23) — show every 4th hour to avoid crowding
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i % 4 === 0 ? `${i}:00` : '',
)

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  onCellClick,
  showTooltip = true,
}) => {
  // Handle undefined or invalid data
  if (!data || !Array.isArray(data.data) || data.data.length === 0) {
    return (
      <div className="cmcc-heatmap-chart cmcc-heatmap-empty">
        <span className="cmcc-heatmap-empty-icon">📊</span>
        <p className="cmcc-heatmap-empty-text">No activity data yet</p>
        <p className="cmcc-heatmap-empty-hint">
          Moderation activity will appear here as actions are taken.
        </p>
      </div>
    )
  }

  const { data: heatmapData, maxCount } = data

  // Check if all cells are zero (empty data)
  const allZero = heatmapData.every((row) => !row || row.every((c) => c === 0))
  if (allZero) {
    return (
      <div className="cmcc-heatmap-chart cmcc-heatmap-empty">
        <span className="cmcc-heatmap-empty-icon">📊</span>
        <p className="cmcc-heatmap-empty-text">No activity data yet</p>
        <p className="cmcc-heatmap-empty-hint">
          Moderation activity will appear here as actions are taken.
        </p>
      </div>
    )
  }

  // Handle cell click
  const handleCellClick = (dayOfWeek: number, hour: number): void => {
    const row = heatmapData[dayOfWeek]
    const count = row && row[hour] !== undefined ? row[hour] : 0
    if (onCellClick) {
      onCellClick(dayOfWeek, hour, count)
    }
  }

  // Get color based on count and maxCount
  // Uses a single-hue blue sequential palette for readability
  const getCellColor = (count: number): string => {
    const safeMaxCount = maxCount ?? 0
    if (safeMaxCount === 0) return '#f0f0f1'
    if (count === 0) return '#f0f0f1'

    const intensity = count / safeMaxCount
    // Sequential blue palette: light → dark
    if (intensity <= 0.2) return '#e3f0fa'
    if (intensity <= 0.4) return '#abd0e6'
    if (intensity <= 0.6) return '#6fa8d1'
    if (intensity <= 0.8) return '#3b7cb8'
    return '#1a4d8f'
  }

  // Format tooltip content
  const getTooltipContent = (
    dayOfWeek: number,
    hour: number,
    count: number,
  ): string => {
    const dayLabel = DAY_LABELS[dayOfWeek]
    const hourLabel = `${hour}:00`
    return `${dayLabel} ${hourLabel}: ${count} items`
  }

  return (
    <div className="cmcc-heatmap-chart">
      <div className="cmcc-heatmap-wrapper">
        {/* Hour labels on top */}
        <div className="cmcc-heatmap-hour-labels">
          {HOUR_LABELS.map((label, index) => (
            <div key={index} className="cmcc-heatmap-hour-label">
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="cmcc-heatmap-grid">
          {/* Day labels on left */}
          <div className="cmcc-heatmap-day-labels">
            {DAY_LABELS.map((label, dayIndex) => (
              <div key={dayIndex} className="cmcc-heatmap-day-label">
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap cells — each day is a row with 24 hour cells */}
          <div className="cmcc-heatmap-cells">
            {heatmapData.map((row: number[], dayIndex: number) => (
              <div key={dayIndex} className="cmcc-heatmap-row">
                {row.map((count: number, hourIndex: number) => {
                  const color = getCellColor(count)
                  const tooltip = showTooltip
                    ? getTooltipContent(dayIndex, hourIndex, count)
                    : undefined

                  return (
                    <div
                      key={hourIndex}
                      className="cmcc-heatmap-cell"
                      style={{
                        backgroundColor: color,
                        cursor: onCellClick ? 'pointer' : 'default',
                      }}
                      onClick={() =>
                        onCellClick
                          ? handleCellClick(dayIndex, hourIndex)
                          : undefined
                      }
                      title={tooltip}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Color legend — gradient bar showing the full palette */}
      <div className="cmcc-heatmap-legend">
        <div className="cmcc-heatmap-legend-label">Activity Level</div>
        <div className="cmcc-heatmap-legend-bar">
          <div className="cmcc-heatmap-legend-gradient" />
        </div>
        <div className="cmcc-heatmap-legend-labels">
          <span>0</span>
          <span>{maxCount}</span>
        </div>
      </div>
    </div>
  )
}

export default HeatmapChart
