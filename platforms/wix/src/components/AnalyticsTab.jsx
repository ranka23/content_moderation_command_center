import React from 'react'
import { HeatmapChart } from '@cmcc/ui'
import { AlertTriangle, BarChart3, FileText } from 'lucide-react'

// ---------------------------------------------------------------------------
// AnalyticsTab Component
// ---------------------------------------------------------------------------

export function AnalyticsTab({
  analytics,
  analyticsLoading,
  analyticsError,
  onRetry,
}) {
  // ---- Render helpers ----

  function renderLoading(message) {
    return <div className="cmcc-loading">{message}</div>
  }

  function renderEmpty(icon, text, sub) {
    return (
      <div className="cmcc-empty">
        <div className="cmcc-empty-icon">{icon}</div>
        <p className="cmcc-empty-text">{text}</p>
        {sub && <p className="cmcc-empty-sub">{sub}</p>}
      </div>
    )
  }

  // ---- Loading / Error / Empty states ----

  if (analyticsLoading) return renderLoading('Loading analytics...')

  if (analyticsError) {
    return (
      <div className="cmcc-error">
        <div className="cmcc-error-icon">
          <AlertTriangle size={16} />
        </div>
        <p className="cmcc-error-text">Failed to load analytics</p>
        <p className="cmcc-error-detail">{analyticsError}</p>
        {onRetry && (
          <button
            className="cmcc-btn-secondary"
            onClick={onRetry}
            style={{ marginTop: 12 }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const hasData =
    analytics.heatmap.data.some((row) => row.some((v) => v > 0)) ||
    analytics.contentTypeBreakdown.length > 0

  if (!hasData) {
    return renderEmpty(
      <BarChart3 size={24} />,
      'No analytics data yet',
      'Data will appear once content is moderated.',
    )
  }

  // ---- Render ----

  return (
    <div>
      <div className="cmcc-card">
        <h3 className="cmcc-card-title">Moderation Activity Heatmap</h3>
        <HeatmapChart data={analytics.heatmap} showTooltip />
      </div>

      <div className="cmcc-analytics-summary">
        <div className="cmcc-stat-card">
          <p className="cmcc-stat-label">Spam Ratio</p>
          <p
            className={
              'cmcc-stat-value' +
              (analytics.spamRatio.percentage > 50 ? ' danger' : '')
            }
          >
            {analytics.spamRatio.percentage.toFixed(1)}%
          </p>
        </div>
        <div className="cmcc-stat-card">
          <p className="cmcc-stat-label">Total Items</p>
          <p className="cmcc-stat-value">{analytics.spamRatio.totalCount}</p>
        </div>
        <div className="cmcc-stat-card">
          <p className="cmcc-stat-label">Spam Items</p>
          <p className="cmcc-stat-value">{analytics.spamRatio.spamCount}</p>
        </div>
      </div>

      {analytics.contentTypeBreakdown.length > 0 && (
        <div className="cmcc-card" style={{ marginTop: 16 }}>
          <h3 className="cmcc-card-title">Content Type Breakdown</h3>
          <ul className="cmcc-activity-list">
            {analytics.contentTypeBreakdown.map((item) => (
              <li key={item.type} className="cmcc-activity-item">
                <span className="cmcc-activity-icon">
                  <FileText size={14} />
                </span>
                <div className="cmcc-activity-body">
                  <p className="cmcc-activity-action">
                    {item.type}: {item.count} items (
                    {item.percentage.toFixed(1)}%)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
