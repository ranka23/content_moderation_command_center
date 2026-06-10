/**
 * AnalyticsTab - Analytics tab showing spam ratio, content breakdown stats cards,
 * and content type breakdown table.
 */

import React from 'react'
import { Card, DataTable, Layout, EmptyState } from '@shopify/polaris'

/**
 * @param {Object} props
 * @param {Object} props.analytics - Analytics data
 * @param {number} props.analytics.totalModerated
 * @param {number} props.analytics.spamDetected
 * @param {number} props.analytics.approved
 * @param {number} props.analytics.pendingReview
 * @param {number} props.analytics.spamRatio
 * @param {Array} props.analytics.contentBreakdown
 */
export default function AnalyticsTab({ analytics }) {
  const spamPct = analytics.totalModerated
    ? ((analytics.spamDetected / analytics.totalModerated) * 100).toFixed(1)
    : '0.0'

  const breakdownRows = (analytics.contentBreakdown || []).map((entry) => [
    entry.type || entry.content_type,
    entry.count,
    entry.percentage !== null ? `${entry.percentage}%` : '-',
  ])

  return (
    <Layout>
      <Layout.Section>
        <div className="cmcc-analytics-grid">
          <Card sectioned>
            <p className="cmcc-stat-label">Total Moderated</p>
            <p className="cmcc-stat-value">
              {analytics.totalModerated?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Spam Detected</p>
            <p className="cmcc-stat-value">
              {analytics.spamDetected?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Approved</p>
            <p className="cmcc-stat-value">
              {analytics.approved?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Pending Review</p>
            <p className="cmcc-stat-value">
              {analytics.pendingReview?.toLocaleString() ?? 0}
            </p>
          </Card>
        </div>
      </Layout.Section>

      <Layout.Section>
        <Card sectioned title="Spam Ratio">
          <div className="cmcc-spam-ratio">
            <span className="cmcc-spam-pct">{spamPct}%</span>
            <p>of all moderated content was flagged as spam</p>
          </div>
        </Card>
      </Layout.Section>

      {breakdownRows.length > 0 && (
        <Layout.Section>
          <Card title="Content Breakdown">
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric']}
              headings={['Type', 'Count', 'Percentage']}
              rows={breakdownRows}
            />
          </Card>
        </Layout.Section>
      )}

      {breakdownRows.length === 0 && (
        <Layout.Section>
          <Card sectioned>
            <EmptyState heading="No analytics data yet">
              <p>Analytics will appear once content is moderated.</p>
            </EmptyState>
          </Card>
        </Layout.Section>
      )}
    </Layout>
  )
}
