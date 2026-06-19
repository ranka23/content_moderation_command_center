import React, { useState } from 'react'
import { calculateUserSpamRatio } from '@cmcc/core'
import { Table, SkeletonTable, EmptyState, ActivityFeed } from '@cmcc/ui'
import {
  Download,
  Search,
  Users,
  BarChart3,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react'

/**
 * ReportsTab — Full reporting functionality including user reputation,
 * activity feed, moderator performance with pagination, CSV export,
 * and compliance audit buttons.
 *
 * @param {object} props
 * @param {Array} props.reputationUsers - User reputation data
 * @param {boolean} props.reputationLoading - Whether reputation is loading
 * @param {Array} props.activityFeed - Activity feed events
 * @param {boolean} props.feedLoading - Whether feed is loading
 * @param {string|null} props.feedError - Feed error message
 * @param {() => void} props.onFetchActivityFeed - Retry callback
 * @param {Array} props.moderatorPerformance - Moderator performance data
 * @param {string} props.backendUrl - Backend API URL
 * @param {(endpoint:string, options?:object) => Promise<any>} props.fetchFromAPI - API fetch function
 * @param {(msg:string, type:string) => void} props.addToast - Toast notification
 * @returns {React.ReactElement}
 */
export function ReportsTab({
  reputationUsers = [],
  reputationLoading = false,
  activityFeed = [],
  feedLoading = false,
  feedError = null,
  onFetchActivityFeed,
  moderatorPerformance = [],
  fetchFromAPI,
  addToast,
}) {
  // CSV export state
  const [exporting, setExporting] = useState(false)
  const [auditRunning, setAuditRunning] = useState(false)

  // Performance pagination
  const [perfPage, setPerfPage] = useState(0)
  const PERF_PAGE_SIZE = 5
  const totalPerfPages =
    Math.ceil(moderatorPerformance.length / PERF_PAGE_SIZE) || 1
  const paginatedPerf = moderatorPerformance.slice(
    perfPage * PERF_PAGE_SIZE,
    (perfPage + 1) * PERF_PAGE_SIZE,
  )

  // Platform status cards for Multi-Platform Hub
  const platforms = [
    { name: 'WordPress', status: 'available', connected: false },
    { name: 'Shopify', status: 'available', connected: false },
    { name: 'Storyblok', status: 'available', connected: false },
    { name: 'Strapi', status: 'available', connected: false },
    { name: 'Wix', status: 'active', connected: true },
  ]

  /**
   * Handle CSV export of moderation activity.
   * Downloads a CSV file from the API.
   */
  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const data = await fetchFromAPI('reports/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7, type: 'moderation' }),
      })
      if (data.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename || 'cmcc-moderation-export.csv'
        a.click()
        URL.revokeObjectURL(url)
        addToast('CSV exported successfully', 'success')
      } else {
        addToast('No data to export', 'info')
      }
    } catch (err) {
      addToast(err.message || 'Failed to export CSV', 'error')
    } finally {
      setExporting(false)
    }
  }

  /**
   * Handle compliance audit generation.
   */
  const handleComplianceAudit = async () => {
    setAuditRunning(true)
    try {
      const data = await fetchFromAPI('reports/compliance-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      })
      if (data.report) {
        // Display report summary
        const report = data.report
        addToast(
          `Audit complete: ${report.totalActions} actions over ${report.period}`,
          'success',
        )
      } else {
        addToast('No audit data available', 'info')
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate audit', 'error')
    } finally {
      setAuditRunning(false)
    }
  }

  return (
    <div className="cmcc-reports-tab">
      {/* Export & Audit Buttons */}
      <div className="cmcc-card cmcc-mb" style={{ padding: '16px' }}>
        <h3 className="cmcc-card-title">
          <Download size={16} style={{ display: 'inline' }} /> Export &
          Compliance
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          <button
            className="cmcc-btn-primary"
            onClick={handleExportCSV}
            disabled={exporting}
            style={{ fontSize: 13, padding: '8px 18px' }}
          >
            {exporting ? (
              'Exporting...'
            ) : (
              <>
                <Download size={14} style={{ display: 'inline' }} /> Export
                Moderation CSV
              </>
            )}
          </button>
          <button
            className="cmcc-btn-secondary"
            onClick={handleComplianceAudit}
            disabled={auditRunning}
            style={{ fontSize: 13, padding: '8px 18px' }}
          >
            {auditRunning ? (
              'Running...'
            ) : (
              <>
                <Search size={14} style={{ display: 'inline' }} /> Run
                Compliance Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* User Reputation Dashboard */}
      <div className="cmcc-card cmcc-mb">
        <h3 className="cmcc-card-title">
          <>
            <Users size={16} style={{ display: 'inline' }} /> User Reputation
            Dashboard
          </>
        </h3>
        <div className="cmcc-card-body">
          {reputationLoading ? (
            <SkeletonTable rows={4} columns={5} />
          ) : reputationUsers.length === 0 ? (
            <EmptyState
              icon="users"
              title="No user data available"
              description="User reputation data will appear as content is moderated."
            />
          ) : (
            <Table
              columns={[
                {
                  key: 'author',
                  label: 'User',
                  sortable: true,
                  align: 'left',
                  cell: (row) => (
                    <span className="cmcc-user-cell">
                      <strong>
                        {row.authorName || `User #${row.authorId}`}
                      </strong>
                    </span>
                  ),
                },
                {
                  key: 'trust_level',
                  label: 'Trust Level',
                  sortable: true,
                  align: 'center',
                  cell: (row) => {
                    const level = row.trustLevel || 'neutral'
                    const cls =
                      level === 'trusted'
                        ? 'cmcc-trust-trusted'
                        : level === 'neutral'
                          ? 'cmcc-trust-neutral'
                          : 'cmcc-trust-low'
                    return (
                      <span className={`cmcc-trust-badge ${cls}`}>{level}</span>
                    )
                  },
                },
                {
                  key: 'score',
                  label: 'Score',
                  sortable: true,
                  align: 'center',
                },
                {
                  key: 'approved',
                  label: 'Approved',
                  sortable: true,
                  align: 'center',
                },
                {
                  key: 'rejected',
                  label: 'Rejected',
                  sortable: true,
                  align: 'center',
                },
                {
                  key: 'spamRatio',
                  label: 'Spam Ratio',
                  sortable: true,
                  align: 'center',
                  cell: (row) => {
                    const { ratio, percentage } = calculateUserSpamRatio(
                      row.approved || 0,
                      row.rejected || 0,
                    )
                    return (
                      <span
                        className={ratio > 50 ? 'cmcc-stat-value danger' : ''}
                      >
                        {percentage}%
                      </span>
                    )
                  },
                },
              ]}
              data={reputationUsers}
            />
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="cmcc-card cmcc-mb">
        <h3 className="cmcc-card-title">
          <>
            <RefreshCw size={16} style={{ display: 'inline' }} /> Real-Time
            Activity Feed
          </>
        </h3>
        <div className="cmcc-card-body">
          <ActivityFeed
            events={activityFeed}
            isLoading={feedLoading}
            error={feedError}
            onRetry={onFetchActivityFeed}
            title="Moderator Actions"
          />
        </div>
      </div>

      {/* Moderator Performance with Pagination */}
      <div className="cmcc-card cmcc-mb">
        <h3 className="cmcc-card-title">
          <BarChart3 size={16} style={{ display: 'inline' }} /> Moderator
          Performance
        </h3>
        <div className="cmcc-card-body">
          {moderatorPerformance.length === 0 ? (
            <EmptyState
              icon="activity"
              title="No performance data yet"
              description="Moderator performance metrics will appear as actions are taken."
            />
          ) : (
            <>
              <Table
                columns={[
                  {
                    key: 'moderator',
                    label: 'Moderator',
                    sortable: true,
                    align: 'left',
                    cell: (row) => (
                      <strong>
                        {row.moderatorName || `Mod #${row.moderatorId}`}
                      </strong>
                    ),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    sortable: true,
                    align: 'center',
                  },
                  {
                    key: 'approve',
                    label: 'Approved',
                    sortable: true,
                    align: 'center',
                  },
                  {
                    key: 'reject',
                    label: 'Rejected',
                    sortable: true,
                    align: 'center',
                  },
                  {
                    key: 'spam',
                    label: 'Spam',
                    sortable: true,
                    align: 'center',
                  },
                  {
                    key: 'accuracy',
                    label: 'Accuracy',
                    sortable: true,
                    align: 'center',
                    cell: (row) => {
                      const pct = row.accuracy
                        ? (row.accuracy * 100).toFixed(1)
                        : 'N/A'
                      return (
                        <span>{typeof pct === 'string' ? pct : `${pct}%`}</span>
                      )
                    },
                  },
                ]}
                data={paginatedPerf}
              />
              {/* Pagination controls */}
              {totalPerfPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    className="cmcc-btn-secondary"
                    disabled={perfPage === 0}
                    onClick={() => setPerfPage((p) => Math.max(0, p - 1))}
                    style={{
                      fontSize: 12,
                      padding: '4px 12px',
                    }}
                  >
                    ← Prev
                  </button>
                  <span
                    style={{
                      fontSize: 13,
                      color: '#6b7280',
                    }}
                  >
                    Page {perfPage + 1} of {totalPerfPages}
                  </span>
                  <button
                    className="cmcc-btn-secondary"
                    disabled={perfPage >= totalPerfPages - 1}
                    onClick={() =>
                      setPerfPage((p) => Math.min(totalPerfPages - 1, p + 1))
                    }
                    style={{
                      fontSize: 12,
                      padding: '4px 12px',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Multi-Platform Hub */}
      <div className="cmcc-card cmcc-mb">
        <h3 className="cmcc-card-title">
          <Globe size={16} style={{ display: 'inline' }} /> Multi-Platform Hub
        </h3>
        <div className="cmcc-card-body">
          <p className="cmcc-mb-text">
            Connect and manage moderation across all your platforms from a
            single dashboard.
          </p>
          <div className="cmcc-platform-grid">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                className={`cmcc-platform-card${platform.connected ? ' connected' : ''}`}
                onClick={() => {
                  if (!platform.connected) {
                    addToast(`${platform.name} integration coming soon`, 'info')
                  }
                }}
              >
                <div
                  className="cmcc-platform-icon"
                  style={{ color: platform.connected ? '#16a34a' : '#9ca3af' }}
                >
                  ●
                </div>
                <div className="cmcc-platform-name">{platform.name}</div>
                {platform.connected ? (
                  <span className="cmcc-platform-status connected">
                    <CheckCircle size={12} style={{ display: 'inline' }} />{' '}
                    Connected
                  </span>
                ) : (
                  <span className="cmcc-platform-status">
                    <XCircle size={12} style={{ display: 'inline' }} /> Not
                    connected
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsTab
