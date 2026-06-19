import React from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export interface StatusPieChartData {
  labels: string[]
  values: number[]
  colors: string[]
}

export interface StatusPieChartProps {
  data: StatusPieChartData
  title?: string
  height?: number
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  title = 'Status Distribution',
  height = 250,
}) => {
  if (
    !data ||
    !data.values ||
    data.values.length === 0 ||
    !data.labels ||
    data.labels.length === 0
  ) {
    return (
      <div className="cmcc-chart-empty">
        <p>No status data available</p>
      </div>
    )
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: data.colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }

  const options: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 12,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: Record<string, unknown>) => {
            const dataset = context['dataset'] as { data: number[] }
            const total = dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            )
            const value = context['parsed'] as number
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            return ` ${value} items (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="cmcc-chart-container" style={{ height }}>
      <h4 className="cmcc-chart-title">{title}</h4>
      <div className="cmcc-chart-wrapper" style={{ height: height - 40 }}>
        <Doughnut data={chartData} options={options as never} />
      </div>
    </div>
  )
}

export default StatusPieChart
