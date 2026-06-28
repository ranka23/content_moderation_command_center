import React, { useEffect, startTransition, useState, useMemo } from 'react'
import {
  HeatmapChart,
  StatusPieChart,
  ModerationLineChart,
  SpamBarChart,
  Table,
  SkeletonCard,
  SkeletonTable,
  Pagination,
} from '@cmcc/ui'
import { DateRangePicker } from '../components/DateRangePicker'

const CT_PER_PAGE_OPTIONS = [10, 25, 50, 100]

/**
 * Analytics tab page.
 * Displays queue stats, activity heatmap, status/charts, spam ratio,
 * and a paginated content type breakdown table.
 */
export default function AnalyticsPage({ analytics }) {
  const {
    analyticsData,
    analyticsDateRange,
    setAnalyticsDateRange,
    isAnalyticsLoading,
    fetchAnalytics,
    queueStats,
    spamRatioData,
    ctbList,
  } = analytics

  const [ctPage, setCtPage] = useState(1)
  const [ctPerPage, setCtPerPage] = useState(10)

  // ── Sort state for content breakdown table ─────────────────────────
  const [ctSortField, setCtSortField] = useState(null)
  const [ctSortDir, setCtSortDir] = useState('asc')
  const handleCtSort = (field) => {
    if (ctSortField === field) {
      setCtSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setCtSortField(field)
      setCtSortDir('asc')
    }
  }

  // Refetch when date range changes
  useEffect(() => {
    startTransition(() => {
      fetchAnalytics(analyticsDateRange)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsDateRange])

  // ── Content type breakdown pagination ───────────────────────────────
  const ctbTotal = ctbList.length
  const ctbTotalPages = Math.max(1, Math.ceil(ctbTotal / ctPerPage))
  const ctbStart = (ctPage - 1) * ctPerPage
  const ctbEnd = Math.min(ctPage * ctPerPage, ctbTotal)

  // ── Sort content breakdown data ────────────────────────────────────────
  const sortedCtbList = useMemo(() => {
    if (!ctSortField) return ctbList
    return [...ctbList].sort((a, b) => {
      const aVal = a[ctSortField]
      const bVal = b[ctSortField]
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
          numeric: true,
        })
      }
      return ctSortDir === 'asc' ? cmp : -cmp
    })
  }, [ctbList, ctSortField, ctSortDir])

  const ctbPaginated = sortedCtbList.slice(ctbStart, ctbEnd)

  // ── Loading state ───────────────────────────────────────────────────
  if (isAnalyticsLoading && !analyticsData?.heatmap?.data) {
    return (
      <div className="cmcc-tab-panel" role="tabpanel">
        <div className="tw-grid tw-grid-cols-4 tw-gap-4 tw-mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={5} columns={5} />
      </div>
    )
  }

  return (
    <div className="cmcc-tab-panel" role="tabpanel">
      {/* Page Header */}
      <div className="cmcc-page-header">
        <h2>Analytics</h2>
        <DateRangePicker
          value={analyticsDateRange}
          onChange={(range) => {
            setAnalyticsDateRange(range)
            setCtPage(1)
          }}
        />
      </div>

      {/* Stat Cards */}
      <div className="cmcc-stats-grid cmcc-stats-grid-4">
        <div className="cmcc-stat-card">
          <span className="cmcc-stat-label">Pending</span>
          <span className="cmcc-stat-value cmcc-stat-pending">
            {queueStats.pending}
          </span>
        </div>
        <div className="cmcc-stat-card">
          <span className="cmcc-stat-label">Spam</span>
          <span className="cmcc-stat-value cmcc-stat-spam">
            {queueStats.spam}
          </span>
        </div>
        <div className="cmcc-stat-card">
          <span className="cmcc-stat-label">Flagged</span>
          <span className="cmcc-stat-value cmcc-stat-flagged">
            {queueStats.flagged}
          </span>
        </div>
        <div className="cmcc-stat-card">
          <span className="cmcc-stat-label">Total</span>
          <span className="cmcc-stat-value">{queueStats.total}</span>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="cmcc-analytics-section">
        <h3>Activity Heatmap</h3>
        <HeatmapChart
          data={
            analyticsData.heatmap || {
              data: Array(7)
                .fill(0)
                .map(() => Array(24).fill(0)),
              maxCount: 0,
            }
          }
        />
      </div>

      {/* Charts Row: Pie Chart + Line Chart */}
      <div className="cmcc-charts-row">
        <div className="cmcc-chart-card">
          <StatusPieChart
            data={{
              labels: analyticsData.statusDistribution?.labels || [],
              values: analyticsData.statusDistribution?.values || [],
              colors: analyticsData.statusDistribution?.colors || [],
            }}
          />
        </div>
        <div className="cmcc-chart-card">
          <ModerationLineChart
            data={{
              labels: analyticsData.moderationVolume?.labels || [],
              approved: analyticsData.moderationVolume?.approved || [],
              rejected: analyticsData.moderationVolume?.rejected || [],
              spam: analyticsData.moderationVolume?.spam || [],
              flagged: analyticsData.moderationVolume?.flagged || [],
              deferred: analyticsData.moderationVolume?.deferred || [],
            }}
          />
        </div>
      </div>

      {/* Second Row: Spam Trend + Spam Ratio */}
      <div className="cmcc-charts-row">
        {analyticsData.spamContentTypes?.labels?.length > 0 && (
          <div className="cmcc-chart-card cmcc-chart-card-half">
            <SpamBarChart
              data={{
                labels: analyticsData.spamContentTypes.labels,
                values: analyticsData.spamContentTypes.values,
                colors: analyticsData.spamContentTypes.colors,
              }}
              title="Top Spam Content Types"
            />
          </div>
        )}
        <div className="cmcc-chart-card cmcc-chart-card-half">
          <div className="cmcc-analytics-section">
            <h3>Spam Ratio</h3>
            <div className="cmcc-spam-ratio">
              <div className="cmcc-spam-ratio-bar">
                <div
                  className="cmcc-spam-ratio-fill"
                  style={{
                    width: `${Math.min(spamRatioData.percentage, 100)}%`,
                  }}
                />
              </div>
              <span className="cmcc-spam-ratio-text">
                {spamRatioData.percentage}% spam ({spamRatioData.spamCount} of{' '}
                {spamRatioData.totalCount} items)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Type Breakdown Table */}
      {ctbList.length > 0 && (
        <div className="cmcc-analytics-section">
          <h3 className="cmcc-section-heading">Content Breakdown</h3>
          <Table
            columns={[
              {
                key: 'content_type',
                label: 'Content Type',
                sortable: true,
                align: 'left',
              },
              {
                key: 'count',
                label: 'Total (%)',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <>
                    {row.count}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.percentage}%)
                    </span>
                  </>
                ),
              },
              {
                key: 'approved',
                label: 'Approved',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-green-600">
                    {row.approved ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.approved_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
              {
                key: 'pending',
                label: 'Pending',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-amber-600">
                    {row.pending ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.pending_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
              {
                key: 'spam',
                label: 'Spam',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-red-600">
                    {row.spam ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.spam_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
              {
                key: 'flagged',
                label: 'Flagged',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-orange-600">
                    {row.flagged ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.flagged_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
              {
                key: 'rejected',
                label: 'Rejected',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-gray-500">
                    {row.rejected ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.rejected_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
              {
                key: 'deferred',
                label: 'Deferred',
                sortable: true,
                align: 'right',
                cell: (row) => (
                  <span className="tw-text-cyan-600">
                    {row.deferred ?? 0}{' '}
                    <span className="tw-text-gray-400 tw-text-xs">
                      ({row.deferred_pct ?? 0}%)
                    </span>
                  </span>
                ),
              },
            ]}
            data={ctbPaginated}
            sortConfig={
              ctSortField
                ? { field: ctSortField, direction: ctSortDir }
                : undefined
            }
            onSort={handleCtSort}
            rowKey={(row) => row.content_type}
          />
          {/* MUI Table Pagination */}
          <div className="cmcc-table-pagination">
            <div className="cmcc-table-pagination-left">
              <span className="cmcc-pagination-info">
                {ctbTotal > 0
                  ? `${ctbStart + 1}–${ctbEnd} of ${ctbTotal} types`
                  : 'No types'}
              </span>
              <span className="cmcc-pagination-separator">|</span>
              <label className="cmcc-pagination-rows-label">
                Show
                <select
                  id="cmcc-ct-per-page"
                  name="cmcc-ct-per-page"
                  className="cmcc-pagination-rows-select"
                  value={String(ctPerPage)}
                  onChange={(e) => {
                    setCtPerPage(Number(e.target.value))
                    setCtPage(1)
                  }}
                >
                  {CT_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                per page
              </label>
            </div>
            {ctbTotal > ctPerPage && (
              <Pagination
                currentPage={ctPage}
                totalPages={Math.ceil(ctbTotal / ctPerPage)}
                onPageChange={(p) => setCtPage(p)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
