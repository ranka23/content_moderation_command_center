import React, {
  useEffect,
  startTransition,
  useState,
  useMemo,
  useCallback,
} from 'react'
import {
  Button,
  Table,
  SkeletonTable,
  EmptyState,
  Pagination,
  ActivityFeed,
  Icon,
} from '@cmcc/ui'
import {
  FileText,
  Calendar,
  Users,
  RefreshCw,
  BarChart3,
  Globe,
  Download,
  Plus,
} from 'lucide-react'
import { apiFetch } from '../lib/api'
import { DateRangePicker } from '../components/DateRangePicker'

const PO = [10, 25, 50, 100]
const PF = [
  { n: 'WordPress', i: 'wordpress', c: true },
  { n: 'Shopify', i: 'shopify', c: false },
  { n: 'Storyblok', i: 'storyblok', c: false },
  { n: 'Strapi', i: 'strapi', c: false },
  { n: 'Wix', i: 'wix', c: false },
]
const tlBadge = (r) => {
  const m = {
    Trusted: 'tw-bg-green-100 tw-text-green-800',
    New: 'tw-bg-blue-100 tw-text-blue-800',
    Suspicious: 'tw-bg-orange-100 tw-text-orange-800',
  }
  const label = r.riskLevel || 'Unknown'
  const c = m[label] || 'tw-bg-red-100 tw-text-red-800'
  return (
    <span
      className={
        'tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium ' +
        c
      }
    >
      {label}
    </span>
  )
}
const srBadge = (r) => {
  const ratio = r.spamRatio ?? 0
  const c =
    ratio > 0.5
      ? 'tw-text-red-600 tw-font-bold'
      : ratio > 0.2
        ? 'tw-text-orange-600'
        : 'tw-text-gray-600'
  return <span className={c}>{(ratio * 100).toFixed(0)}%</span>
}
const RC = [
  { key: 'authorId', label: 'User', sortable: true, align: 'left' },
  {
    key: 'riskLevel',
    label: 'Trust Level',
    sortable: true,
    align: 'center',
    cell: tlBadge,
  },
  { key: 'totalItems', label: 'Total Items', sortable: true, align: 'right' },
  {
    key: 'spamCount',
    label: 'Spam',
    sortable: true,
    align: 'right',
    cell: (r) => <span className="tw-text-red-600">{r.spamCount}</span>,
  },
  {
    key: 'approvedCount',
    label: 'Approved',
    sortable: true,
    align: 'right',
    cell: (r) => <span className="tw-text-green-600">{r.approvedCount}</span>,
  },
  {
    key: 'spamRatio',
    label: 'Spam Ratio',
    sortable: true,
    align: 'right',
    cell: srBadge,
  },
]

// B10 fix: Moderator column with fallback for various key names and broken images
const ModeratorCell = ({ row }) => {
  const name =
    row.moderator || row.moderatorName || row.moderator_name || 'Unknown'
  const nameStr = String(name)
  const [imgError, setImgError] = useState(false)

  // If the value contains an <img> tag, extract src and render with React onError
  if (/<img\s/i.test(nameStr) && !imgError) {
    const srcMatch = nameStr.match(/src=["']([^"']*)["']/i)
    const altMatch = nameStr.match(/alt=["']([^"']*)["']/i)
    const src = srcMatch ? srcMatch[1] : ''
    const alt = altMatch ? altMatch[1] : 'Moderator avatar'
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className="tw-w-8 tw-h-8 tw-rounded-full tw-object-cover"
      />
    )
  }

  // Fallback: show initials avatar when image fails or no img tag
  const initials = nameStr
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span
      className="tw-inline-flex tw-items-center tw-justify-center tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-200 tw-text-gray-600 tw-text-xs tw-font-medium"
      title={nameStr}
    >
      {initials || '?'}
    </span>
  )
}

const PC = [
  {
    key: 'moderator',
    label: 'Moderator',
    sortable: true,
    align: 'left',
    cell: (row) => <ModeratorCell row={row} />,
  },
  {
    key: 'actions',
    label: 'Total Actions',
    sortable: true,
    align: 'right',
    cell: (row) =>
      String(row.actions ?? row.totalActions ?? row.total_actions ?? 0),
  },
  {
    key: 'approvals',
    label: 'Approvals',
    sortable: true,
    align: 'right',
    cell: (row) => String(row.approvals ?? 0),
  },
  {
    key: 'rejections',
    label: 'Rejections',
    sortable: true,
    align: 'right',
    cell: (row) => String(row.rejections ?? row.trashes ?? 0),
  },
  {
    key: 'spam',
    label: 'Spam Marks',
    sortable: true,
    align: 'right',
    cell: (row) => String(row.spam ?? row.spamCount ?? row.spam_actions ?? 0),
  },
]
const SF = [
  {
    id: 'cmcc-rt',
    label: 'Report Type',
    opts: ['Moderation Activity', 'Compliance Audit', 'Moderator Performance'],
  },
  { id: 'cmcc-rf', label: 'Frequency', opts: ['Daily', 'Weekly', 'Monthly'] },
  { id: 'cmcc-rfmt', label: 'Format', opts: ['CSV', 'JSON'] },
]
const v = (id) => document.getElementById(id)?.value || ''
const PagBar = ({ t, p, pp, oc, opc, l }) => {
  const tp = Math.ceil(t / pp)
  return (
    <div className="cmcc-table-pagination">
      <div className="cmcc-table-pagination-left">
        <span className="cmcc-pagination-info">
          {t > 0
            ? `${(p - 1) * pp + 1}–${Math.min(p * pp, t)} of ${t} ${l}`
            : `No ${l}`}
        </span>
        <span className="cmcc-pagination-separator">|</span>
        <label className="cmcc-pagination-rows-label">
          Show
          <select
            id="cmcc-reports-per-page"
            name="cmcc-reports-per-page"
            className="cmcc-pagination-rows-select"
            value={String(pp)}
            onChange={(e) => {
              opc(Number(e.target.value))
              oc(1)
            }}
          >
            {PO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          per page
        </label>
      </div>
      {t > pp && (
        <Pagination currentPage={p} totalPages={tp} onPageChange={oc} />
      )}
    </div>
  )
}

export default function ReportsPage({
  reports,
  analytics,
  _collaboration,
  analyticsDateRange,
  addToast,
}) {
  // ── Sort state for User Reputation table ────────────────────────────
  const [repSortField, setRepSortField] = useState(null)
  const [repSortDir, setRepSortDir] = useState('asc')
  const handleRepSort = (field) => {
    if (repSortField === field) {
      setRepSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setRepSortField(field)
      setRepSortDir('asc')
    }
  }

  // ── Sort state for Moderator Performance table ──────────────────────
  const [perfSortField, setPerfSortField] = useState(null)
  const [perfSortDir, setPerfSortDir] = useState('asc')
  const handlePerfSort = (field) => {
    if (perfSortField === field) {
      setPerfSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setPerfSortField(field)
      setPerfSortDir('asc')
    }
  }

  const [rp, srp] = useState(1)
  const [rpp, srpp] = useState(25)
  const [mp, smp] = useState(1)
  const [mpp, smpp] = useState(25)
  const [feedPage, setFeedPage] = useState(1)
  const [feedPerPage, setFeedPerPage] = useState(10)
  const {
    reputationUsers: ru,
    isReputationLoading: irl,
    fetchUserReputation: fur,
    activityFeed: af,
    isFeedLoading: ifl,
    feedError: fe,
    fetchActivityFeed: faf,
  } = reports

  // ── Activity Feed date range ────────────────────────────────────────
  const [feedDateRange, setFeedDateRange] = useState(null)
  const handleFeedRangeChange = useCallback(
    (range) => {
      setFeedDateRange(range)
      faf(range)
    },
    [faf],
  )
  const pl = analytics?.analyticsData?.moderatorPerformance || []

  useEffect(() => {
    startTransition(() => {
      fur()
      faf()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rt = ru.length
  const rpag = ru.slice((rp - 1) * rpp, (rp - 1) * rpp + rpp)
  const pt = pl.length
  const ppag = pl.slice((mp - 1) * mpp, (mp - 1) * mpp + mpp)

  // ── Activity Feed pagination ────────────────────────────────────────────
  const feedTotal = af.length
  const feedStart = (feedPage - 1) * feedPerPage
  const feedEnd = Math.min(feedPage * feedPerPage, feedTotal)
  const feedPaginated = af.slice(feedStart, feedEnd)

  // ── Sort reputation users locally ──────────────────────────────────────
  const sortedRPag = useMemo(() => {
    if (!repSortField) return rpag
    return [...rpag].sort((a, b) => {
      const aVal = a[repSortField]
      const bVal = b[repSortField]
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
          numeric: true,
        })
      }
      return repSortDir === 'asc' ? cmp : -cmp
    })
  }, [rpag, repSortField, repSortDir])

  // ── Sort moderator performance data locally ────────────────────────────
  const sortedPPag = useMemo(() => {
    if (!perfSortField) return ppag
    return [...ppag].sort((a, b) => {
      const aVal = a[perfSortField]
      const bVal = b[perfSortField]
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
          numeric: true,
        })
      }
      return perfSortDir === 'asc' ? cmp : -cmp
    })
  }, [ppag, perfSortField, perfSortDir])

  const hex = async (ep, pre) => {
    try {
      const d = await apiFetch(ep, {
        method: 'POST',
        body: JSON.stringify({
          start_date: analyticsDateRange.from?.toISOString() || '',
          end_date: analyticsDateRange.to?.toISOString() || '',
          format: 'csv',
        }),
      })
      // If API returns raw CSV string
      if (typeof d === 'string') {
        const blob = new Blob([d], { type: 'text/csv' })
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u
        a.download = `${pre}-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(u)
        addToast('Report exported as CSV', 'success')
        return
      }
      // If API returns JSON with data array (expected CSV lines)
      if (d.success && d.data) {
        const csvContent = Array.isArray(d.data)
          ? d.data.join('\n')
          : String(d.data)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u
        a.download =
          d.filename || `${pre}-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(u)
        addToast('Report exported as CSV', 'success')
        return
      }
      // If API returned JSON that is not CSV, convert it
      if (d && typeof d === 'object') {
        const items =
          d.items || d.results || d.data || (Array.isArray(d) ? d : [d])
        if (Array.isArray(items) && items.length > 0) {
          const headers = Object.keys(items[0])
          const csvRows = [
            headers.join(','),
            ...items.map((row) =>
              headers
                .map((h) => {
                  const val = String(row[h] ?? '')
                  // Escape commas and quotes for CSV
                  return val.includes(',') ||
                    val.includes('"') ||
                    val.includes('\n')
                    ? `"${val.replace(/"/g, '""')}"`
                    : val
                })
                .join(','),
            ),
          ]
          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
          const u = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = u
          a.download = `${pre}-${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          URL.revokeObjectURL(u)
          addToast('Report exported as CSV (converted from JSON)', 'success')
          return
        }
      }
      addToast('No data available for export', 'info')
    } catch {
      addToast('Failed to export report', 'error')
    }
  }
  const hs = async () => {
    try {
      await apiFetch('reports/scheduled', {
        method: 'POST',
        body: JSON.stringify({
          type: v('cmcc-rt') || 'moderation_activity',
          frequency: v('cmcc-rf') || 'weekly',
          format: v('cmcc-rfmt') || 'csv',
          emails: [window.cmccData?.userDisplay || ''],
        }),
      })
      addToast('Report scheduled successfully', 'success')
    } catch {
      addToast('Failed to schedule report', 'error')
    }
  }

  return (
    <div className="cmcc-tab-panel" role="tabpanel">
      <div className="cmcc-page-header">
        <h2>
          <FileText size={20} />
          Reports &amp; Compliance
        </h2>
      </div>
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-6">
        <div className="cmcc-report-card">
          <h3>Moderation Activity Report</h3>
          <p>Export all moderation activity for the selected period.</p>
          <div className="cmcc-btn-group">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                hex('reports/moderation-activity', 'cmcc-moderation')
              }
            >
              <Download size={14} className="tw-inline tw-mr-1" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addToast('PDF export coming soon', 'info')}
            >
              <Download size={14} className="tw-inline tw-mr-1" /> Export PDF
            </Button>
          </div>
        </div>
        <div className="cmcc-report-card">
          <h3>Compliance Audit Log</h3>
          <p>
            Export compliance audit trail with timestamps and moderator details.
          </p>
          <div className="cmcc-btn-group">
            <Button
              variant="outline"
              size="sm"
              onClick={() => hex('reports/compliance-audit', 'cmcc-compliance')}
            >
              <Download size={14} className="tw-inline tw-mr-1" /> Export Audit
              Log
            </Button>
          </div>
        </div>
      </div>
      <div className="cmcc-report-section-card">
        <div className="cmcc-report-section-header">
          <Calendar size={16} />
          <h3>Scheduled Reports</h3>
        </div>
        <div className="cmcc-report-section-body">
          <p className="tw-text-sm tw-text-gray-500 tw-mb-4">
            Schedule recurring reports to be generated and emailed.
          </p>
          <div className="cmcc-schedule-row">
            {SF.map((f) => (
              <div key={f.id} className="cmcc-schedule-field">
                <label htmlFor={f.id}>{f.label}</label>
                <select id={f.id} name={f.id}>
                  {f.opts.map((o) => (
                    <option
                      key={o}
                      value={o.toLowerCase().replace(/\s+/g, '_')}
                    >
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="cmcc-schedule-field cmcc-schedule-action">
              <Button variant="primary" size="sm" onClick={hs}>
                <Plus size={14} className="tw-inline tw-mr-1" /> Schedule Report
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="cmcc-report-section-card">
        <div className="cmcc-report-section-header">
          <Users size={16} />
          <h3>User Reputation Dashboard</h3>
        </div>
        <div className="cmcc-report-section-body">
          {irl ? (
            <SkeletonTable rows={4} columns={5} />
          ) : ru.length === 0 ? (
            <EmptyState
              icon="users"
              title="No user data available"
              description="User reputation data will appear as content is moderated."
            />
          ) : (
            <>
              <Table
                columns={RC}
                data={sortedRPag}
                sortConfig={
                  repSortField
                    ? { field: repSortField, direction: repSortDir }
                    : undefined
                }
                onSort={handleRepSort}
                rowKey={(r) => r.author_id}
              />
              <PagBar t={rt} p={rp} pp={rpp} oc={srp} opc={srpp} l="users" />
            </>
          )}
        </div>
      </div>
      <div className="cmcc-report-section-card">
        <div className="cmcc-report-section-header">
          <RefreshCw size={16} />
          <h3>Activity Feed</h3>
        </div>
        <div className="cmcc-report-section-body">
          <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
            <DateRangePicker
              value={feedDateRange}
              onChange={handleFeedRangeChange}
            />
            {feedDateRange && (
              <button
                className="cmcc-text-btn cmcc-text-btn-sm"
                onClick={() => {
                  setFeedDateRange(null)
                  faf()
                }}
                title="Clear date filter"
              >
                × Clear
              </button>
            )}
          </div>
          <ActivityFeed
            events={feedPaginated}
            isLoading={ifl}
            error={fe}
            onRetry={faf}
          />
          {feedTotal > feedPerPage && (
            <div className="cmcc-table-pagination">
              <div className="cmcc-table-pagination-left">
                <span className="cmcc-pagination-info">
                  {feedTotal > 0
                    ? `${feedStart + 1}–${feedEnd} of ${feedTotal} events`
                    : 'No events'}
                </span>
                <span className="cmcc-pagination-separator">|</span>
                <label className="cmcc-pagination-rows-label">
                  Show
                  <select
                    id="cmcc-feed-per-page"
                    name="cmcc-feed-per-page"
                    className="cmcc-pagination-rows-select"
                    value={String(feedPerPage)}
                    onChange={(e) => {
                      setFeedPerPage(Number(e.target.value))
                      setFeedPage(1)
                    }}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  per page
                </label>
              </div>
              <Pagination
                currentPage={feedPage}
                totalPages={Math.ceil(feedTotal / feedPerPage)}
                onPageChange={(p) => setFeedPage(p)}
              />
            </div>
          )}
        </div>
      </div>
      <div className="cmcc-report-section-card">
        <div className="cmcc-report-section-header">
          <BarChart3 size={16} />
          <h3>Moderator Performance</h3>
        </div>
        <div className="cmcc-report-section-body">
          {pl.length > 0 ? (
            <>
              <Table
                columns={PC}
                data={sortedPPag}
                sortConfig={
                  perfSortField
                    ? { field: perfSortField, direction: perfSortDir }
                    : undefined
                }
                onSort={handlePerfSort}
                rowKey={(r) => r.moderator}
              />
              <PagBar
                t={pt}
                p={mp}
                pp={mpp}
                oc={smp}
                opc={smpp}
                l="moderators"
              />
            </>
          ) : (
            <EmptyState
              icon="activity"
              title="No performance data yet"
              description="Moderator performance metrics will appear as actions are taken."
            />
          )}
        </div>
      </div>
      <div className="cmcc-report-section-card">
        <div className="cmcc-report-section-header">
          <Globe size={16} />
          <h3>Multi-Platform Hub</h3>
        </div>
        <div className="cmcc-report-section-body">
          <p className="tw-text-sm tw-text-gray-500 tw-mb-4">
            Connect and manage all your platforms from a single dashboard.
          </p>
          <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-3 tw-gap-3">
            {PF.map((p) => (
              <div
                key={p.n}
                onClick={() => {
                  if (!p.c) addToast(`${p.n} integration coming soon`, 'info')
                }}
                className={
                  'tw-rounded-lg tw-border tw-p-3 tw-text-center tw-transition-colors ' +
                  (p.c
                    ? 'tw-border-green-300 tw-bg-green-50'
                    : 'tw-border-gray-200 tw-bg-gray-50 hover:tw-border-primary-300 hover:tw-bg-primary-50 tw-cursor-pointer')
                }
              >
                <div className="tw-text-2xl tw-mb-1">
                  <Icon name={p.i} size={24} />
                </div>
                <div className="tw-text-sm tw-font-medium">{p.n}</div>
                {p.c ? (
                  <span className="tw-text-xs tw-text-green-600">
                    ● Connected
                  </span>
                ) : (
                  <span className="tw-text-xs tw-text-gray-400">
                    ○ Not connected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
