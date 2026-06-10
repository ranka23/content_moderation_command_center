import React, { useEffect } from 'react'
import {
  HeatmapChart,
  StatusPieChart,
  ModerationLineChart,
  SpamBarChart,
} from '@cmcc/ui'

export default function AnalyticsPage({ analytics }) {
  useEffect(() => {
    analytics.fetchAnalytics()
  }, [analytics])

  const data = analytics.data

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>
        📊 Analytics Dashboard
      </h2>

      {analytics.loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Loading analytics...</p>
        </div>
      )}

      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3
              style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 500 }}
            >
              Activity Heatmap
            </h3>
            <HeatmapChart data={data.heatmap} />
          </div>

          <div
            style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3
              style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 500 }}
            >
              Spam Ratio
            </h3>
            <div
              style={{
                textAlign: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                color: data.spamRatio.ratio > 0.3 ? '#dc2626' : '#16a34a',
              }}
            >
              {data.spamRatio.percentage.toFixed(1)}%
            </div>
            <p
              style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
              }}
            >
              {data.spamRatio.spamCount} spam / {data.spamRatio.totalCount}{' '}
              total
            </p>
          </div>

          <div
            style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3
              style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 500 }}
            >
              Status Distribution
            </h3>
            <StatusPieChart data={data.contentTypeBreakdown} />
          </div>

          {data.moderationTrend && (
            <div
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                Moderation Trend
              </h3>
              <ModerationLineChart data={data.moderationTrend} />
            </div>
          )}

          {data.contentTypeBreakdown && (
            <div
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                Content by Type
              </h3>
              <SpamBarChart data={data.contentTypeBreakdown} />
            </div>
          )}
        </div>
      )}

      {!analytics.loading && !data && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
          <p>No analytics data yet.</p>
        </div>
      )}
    </div>
  )
}
