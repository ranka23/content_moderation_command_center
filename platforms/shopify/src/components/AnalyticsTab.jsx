/**
 * AnalyticsTab - Analytics tab showing spam ratio, content breakdown stats cards,
 * and content type breakdown table.
 */

import React, { useMemo } from 'react'
import { Card, DataTable, Layout, EmptyState } from '@shopify/polaris'
import {
  calculateSpamRatio,
  generateContentTypeBreakdown,
  getEmptyAnalytics,
} from '@cmcc/core'
import { SkeletonTable } from '@cmcc/ui'

/**
 * @param {Object} props
 * @param {Object} props.processedAnalytics - Processed analytics from @cmcc/core
 * @param {Array} props.rawEvents - Raw normalized events
 * @param {Array} props.queueItems - Queue items normalized to core QueueItem shape
 */
export default function AnalyticsTab({
  processedAnalytics,
  rawEvents,
  queueItems,
  isLoading,
}) {
  const analytics = processedAnalytics || getEmptyAnalytics()

  const spamRatioData = useMemo(
    () => calculateSpamRatio(rawEvents || []),
    [rawEvents],
  )

  const breakdownData = useMemo(
    () => generateContentTypeBreakdown(queueItems || []),
    [queueItems],
  )

  const spamPct =
    spamRatioData.percentage !== null && spamRatioData.percentage !== undefined
      ? spamRatioData.percentage.toFixed(1)
      : '0.0'

  const breakdownRows = breakdownData.map((entry) => [
    entry.contentType,
    entry.count,
    entry.percentage !== null && entry.percentage !== undefined
      ? `${entry.percentage}%`
      : '-',
  ])

  if (isLoading) {
    return (
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <SkeletonTable rows={4} columns={2} />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <SkeletonTable rows={3} columns={3} />
          </Card>
        </Layout.Section>
      </Layout>
    )
  }

  return (
    <Layout>
      <Layout.Section>
        <div className="cmcc-analytics-grid">
          <Card sectioned>
            <p className="cmcc-stat-label">Total Moderated</p>
            <p className="cmcc-stat-value">
              {analytics.spamRatio?.totalCount?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Spam Detected</p>
            <p className="cmcc-stat-value">
              {analytics.spamRatio?.spamCount?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Approved</p>
            <p className="cmcc-stat-value">
              {analytics.moderatorPerformance
                ?.reduce((sum, m) => sum + (m.approvals || 0), 0)
                ?.toLocaleString() ?? 0}
            </p>
          </Card>
          <Card sectioned>
            <p className="cmcc-stat-label">Pending Review</p>
            <p className="cmcc-stat-value">
              {(queueItems || [])
                .filter((i) => i.status === 'pending')
                .length?.toLocaleString() ?? 0}
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
