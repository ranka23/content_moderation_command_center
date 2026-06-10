import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export interface SpamBarChartData {
  labels: string[]
  values: number[]
  colors: string[]
}

export interface SpamBarChartProps {
  data: SpamBarChartData
  title?: string
  height?: number
}

export const SpamBarChart: React.FC<SpamBarChartProps> = ({
  data,
  title = 'Top Content Types',
  height = 220,
}) => {
  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="cmcc-chart-empty">
        <p>No content type data available</p>
      </div>
    )
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Items',
        data: data.values,
        backgroundColor: data.colors,
        borderColor: data.colors.map((c) => c),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: Record<string, unknown>): string => {
            const parsed = context['parsed'] as Record<string, unknown>
            const x = parsed?.['x'] as number
            const val = x ?? (context['parsed'] as number)
            return `${val} items`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  }

  return (
    <div className="cmcc-chart-container" style={{ height }}>
      <h4 className="cmcc-chart-title">{title}</h4>
      <div className="cmcc-chart-wrapper" style={{ height: height - 40 }}>
        <Bar data={chartData} options={options as never} />
      </div>
    </div>
  )
}

export default SpamBarChart
