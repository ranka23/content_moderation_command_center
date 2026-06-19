import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export interface ModerationLineChartData {
  labels: string[]
  approved: number[]
  rejected: number[]
  spam: number[]
  flagged: number[]
  deferred: number[]
}

export interface ModerationLineChartProps {
  data: ModerationLineChartData
  title?: string
  height?: number
}

export const ModerationLineChart: React.FC<ModerationLineChartProps> = ({
  data,
  title = 'Moderation Volume Over Time',
  height = 260,
}) => {
  if (
    !data ||
    !data.labels ||
    data.labels.length === 0 ||
    !Array.isArray(data.approved) ||
    !Array.isArray(data.rejected) ||
    !Array.isArray(data.spam) ||
    !Array.isArray(data.flagged) ||
    !Array.isArray(data.deferred)
  ) {
    return (
      <div className="cmcc-chart-empty">
        <p>No moderation volume data available</p>
      </div>
    )
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Approved',
        data: data.approved,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Rejected',
        data: data.rejected,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Spam',
        data: data.spam,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Flagged',
        data: data.flagged,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Deferred',
        data: data.deferred,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 11 },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 15 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { size: 10 },
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  }

  return (
    <div className="cmcc-chart-container" style={{ height }}>
      <h4 className="cmcc-chart-title">{title}</h4>
      <div className="cmcc-chart-wrapper" style={{ height: height - 40 }}>
        <Line data={chartData} options={options as never} />
      </div>
    </div>
  )
}

export default ModerationLineChart
