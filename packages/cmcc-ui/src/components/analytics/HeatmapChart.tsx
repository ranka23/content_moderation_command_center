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

// Hour labels (0-23)
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`)

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  onCellClick,
  showTooltip = true,
}) => {
  // Handle undefined or invalid data
  if (!data || !Array.isArray(data.data) || data.data.length === 0) {
    return <div className="cmcc-heatmap-chart">No data available</div>
  }

  const { data: heatmapData, maxCount } = data

  // Handle cell click
  const handleCellClick = (dayOfWeek: number, hour: number): void => {
    const row = heatmapData[dayOfWeek]
    const count = row && row[hour] !== undefined ? row[hour] : 0
    if (onCellClick) {
      onCellClick(dayOfWeek, hour, count)
    }
  }

  // Get color based on count and maxCount
  const getCellColor = (count: number): string => {
    const safeMaxCount = maxCount ?? 0
    if (safeMaxCount === 0) return '#f0f0f1' // Light gray when no data

    const intensity = count / safeMaxCount
    // Blue gradient: light blue to dark blue
    const blueValue = Math.round(180 + intensity * 75) // 180 to 255
    return `rgb(200, 230, ${blueValue})`
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

          {/* Heatmap cells */}
          <div className="cmcc-heatmap-cells">
            {heatmapData.map((row: number[], dayIndex: number) => (
              <React.Fragment key={dayIndex}>
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
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="cmcc-heatmap-legend">
        <div className="cmcc-heatmap-legend-label">Activity Level</div>
        <div className="cmcc-heatmap-legend-bar">
          <div
            className="cmcc-heatmap-legend-fill"
            style={{ backgroundColor: getCellColor(maxCount) }}
          />
        </div>
        <div className="cmcc-heatmap-legend-labels">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}

export default HeatmapChart
