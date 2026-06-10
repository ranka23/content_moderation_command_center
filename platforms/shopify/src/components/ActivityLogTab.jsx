/**
 * ActivityLogTab - Activity log tab with table of actions and embedded activity feed.
 */

import React from 'react'
import { Card, DataTable, Layout, EmptyState } from '@shopify/polaris'
import ActivityFeed from './ActivityFeed'

/**
 * @param {Object} props
 * @param {Array} props.activityLog - Activity log entries array
 */
export default function ActivityLogTab({ activityLog }) {
  const rows = (activityLog || []).map((entry) => [
    new Date(entry.created_at || entry.timestamp).toLocaleString(),
    entry.action,
    entry.content_type || entry.contentType,
    entry.item_id || entry.contentId,
    entry.moderator_id || entry.performedBy || '-',
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
