/**
 * ActivityLogTab - Activity log tab with table of actions and embedded activity feed.
 */

import React, { useMemo } from 'react'
import { Card, DataTable, Layout, EmptyState } from '@shopify/polaris'
import ActivityFeed from './ActivityFeed'
import { filterActivityLog } from '@cmcc/core'
import { normalizeLogEntryForCore } from '../lib/normalizers'

/**
 * @param {Object} props
 * @param {Array} props.activityLog - Activity log entries array
 * @param {string} props.moderatorId - Current moderator ID for filtering
 */
export default function ActivityLogTab({
  activityLog,
  moderatorId: _moderatorId,
}) {
  const normalizedLogEntries = useMemo(
    () => (activityLog || []).map(normalizeLogEntryForCore),
    [activityLog],
  )

  const filteredEntries = useMemo(
    () => filterActivityLog(normalizedLogEntries),
    [normalizedLogEntries],
  )

  const rows = filteredEntries.map((entry) => [
    new Date(entry.timestamp).toLocaleString(),
    entry.action,
    entry.contentType,
    entry.itemId,
    entry.moderatorName || entry.moderatorId || '-',
  ])

  return (
    <Layout>
      <Layout.Section>
        <Card title="Activity Log">
          {rows.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text']}
              headings={[
                'Timestamp',
                'Action',
                'Content Type',
                'Content ID',
                'Performed By',
              ]}
              rows={rows}
            />
          ) : (
            <Card.Section>
              <EmptyState heading="No activity recorded">
                <p>Actions taken on moderated content will appear here.</p>
              </EmptyState>
            </Card.Section>
          )}
        </Card>
      </Layout.Section>

      <Layout.Section>
        <Card>
          <Card.Section>
            <ActivityFeed limit={10} compact />
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  )
}
