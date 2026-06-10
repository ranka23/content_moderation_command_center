import React, { useEffect, startTransition, useState } from 'react'
import {
  Button,
  Table,
  SkeletonTable,
  EmptyState,
  Pagination,
  ActivityFeed,
} from '@cmcc/ui'
import { apiFetch } from '../lib/api'

const PO = [10, 25, 50, 100]
const PF = [
  { n: 'WordPress', i: '🔵', c: true },
  { n: 'Shopify', i: '🟢', c: false },
  { n: 'Storyblok', i: '🔴', c: false },
  { n: 'Strapi', i: '🟣', c: false },
  { n: 'Wix', i: '⚫', c: false },
]
const tlBadge = (r) => {
  const m = {
    Trusted: 'tw-bg-green-100 tw-text-green-800',
    New: 'tw-bg-blue-100 tw-text-blue-800',
    Suspicious: 'tw-bg-orange-100 tw-text-orange-800',
  }
  const c = m[r.trust_level] || 'tw-bg-red-100 tw-text-red-800'
  return (
    <span
      className={
        'tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium ' +
        c
      }
    >
      {r.trust_level}
    </span>
  )
}
const srBadge = (r) => {
  const c =
    r.spam_ratio > 0.5
      ? 'tw-text-red-600 tw-font-bold'
      : r.spam_ratio > 0.2
        ? 'tw-text-orange-600'
        : 'tw-text-gray-600'
  return <span className={c}>{(r.spam_ratio * 100).toFixed(0)}%</span>
}
const RC = [
  { key: 'author_id', label: 'User', sortable: true, align: 'left' },
  {
    key: 'trust_level',
    label: 'Trust Level',
    sortable: true,
    align: 'center',
    cell: tlBadge,
  },
  { key: 'total_items', label: 'Total Items', sortable: true, align: 'right' },
  {
    key: 'spam_count',
    label: 'Spam',
    sortable: true,
    align: 'right',
    cell: (r) => <span className="tw-text-red-600">{r.spam_count}</span>,
  },
  {
    key: 'approved_count',
    label: 'Approved',
    sortable: true,
    align: 'right',
    cell: (r) => <span className="tw-text-green-600">{r.approved_count}</span>,
  },
  {
    key: 'spam_ratio',
    label: 'Spam Ratio',
    sortable: true,
    align: 'right',
    cell: srBadge,
  },
]
const PC = [
  { key: 'moderator', label: 'Moderator', sortable: true, align: 'left' },
  { key: 'actions', label: 'Total Actions', sortable: true, align: 'right' },
  { key: 'approvals', label: 'Approvals', sortable: true, align: 'right' },
  { key: 'rejections', label: 'Rejections', sortable: true, align: 'right' },
  { key: 'spam', label: 'Spam Marks', sortable: true, align: 'right' },
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
    <div className="tw-flex tw-items-center tw-justify-between tw-py-4 tw-px-2">
      <div className="tw-flex tw-items-center tw-gap-2">
        <span className="tw-text-sm tw-text-gray-500">
          {t > 0
            ? `${(p - 1) * pp + 1}\u2013${Math.min(p * pp, t)} of ${t} ${l}`
            : `No ${l}`}
        </span>
        <span className="tw-text-gray-300">|</span>
        <label className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-gray-500">
          Show
          <select
            value={String(pp)}
            onChange={(e) => {
              opc(Number(e.target.value))
              oc(1)
            }}
            className="tw-w-16 tw-h-8 tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-1"
          >
            {PO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
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
  const [rp, srp] = useState(1)
  const [rpp, srpp] = useState(25)
  const [mp, smp] = useState(1)
  const [mpp, smpp] = useState(25)
  const {
    reputationUsers: ru,
    isReputationLoading: irl,
    fetchUserReputation: fur,
    activityFeed: af,
    isFeedLoading: ifl,
    feedError: fe,
    fetchActivityFeed: faf,
  } = reports
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
      <h2 className="tw-text-lg tw-font-semibold tw-mb-4">
        📄 Reports &amp; Compliance
      </h2>
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-6">
        <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-p-4 tw-shadow-sm">
          <h3 className="tw-text-sm tw-font-semibold tw-mb-3">
            Moderation Activity Report
          </h3>
          <p className="tw-text-sm tw-text-gray-500 tw-mb-4">
            Export all moderation activity for the selected period.
          </p>
          <div className="tw-flex tw-gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                hex('reports/moderation-activity', 'cmcc-moderation')
              }
            >
              📥 Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addToast('PDF export coming soon', 'info')}
            >
              📥 Export PDF
            </Button>
          </div>
        </div>
        <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-p-4 tw-shadow-sm">
          <h3 className="tw-text-sm tw-font-semibold tw-mb-3">
            Compliance Audit Log
          </h3>
          <p className="tw-text-sm tw-text-gray-500 tw-mb-4">
            Export compliance audit trail with timestamps and moderator details.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => hex('reports/compliance-audit', 'cmcc-compliance')}
          >
            📥 Export Audit Log
          </Button>
        </div>
      </div>
      <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm tw-mb-6">
        <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-sm tw-font-semibold">📅 Scheduled Reports</h3>
        </div>
        <div className="tw-p-4">
          <p className="tw-text-sm tw-text-gray-500 tw-mb-4">
            Schedule recurring reports to be generated and emailed.
          </p>
          <div className="tw-flex tw-flex-wrap tw-gap-3 tw-items-end">
            {SF.map((f) => (
              <div key={f.id} className="tw-flex tw-flex-col tw-gap-1">
                <label className="tw-text-xs tw-text-gray-500" htmlFor={f.id}>
                  {f.label}
                </label>
                <select
                  id={f.id}
                  className="tw-text-sm tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1.5"
                >
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
            <Button variant="primary" size="sm" onClick={hs}>
              + Schedule Report
            </Button>
          </div>
        </div>
      </div>
      <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm tw-mb-6">
        <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-sm tw-font-semibold">
            👤 User Reputation Dashboard
          </h3>
        </div>
        <div className="tw-p-4">
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
              <Table columns={RC} data={rpag} rowKey={(r) => r.author_id} />
              <PagBar t={rt} p={rp} pp={rpp} oc={srp} opc={srpp} l="users" />
            </>
          )}
        </div>
      </div>
      <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm tw-mb-6">
        <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-sm tw-font-semibold">🔄 Activity Feed</h3>
        </div>
        <div className="tw-p-4">
          <ActivityFeed events={af} isLoading={ifl} error={fe} onRetry={faf} />
        </div>
      </div>
      <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm tw-mb-6">
        <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-sm tw-font-semibold">
            📊 Moderator Performance
          </h3>
        </div>
        <div className="tw-p-4">
          {pl.length > 0 ? (
            <>
              <Table columns={PC} data={ppag} rowKey={(r) => r.moderator} />
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
      <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm">
        <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-sm tw-font-semibold">🌐 Multi-Platform Hub</h3>
        </div>
        <div className="tw-p-4">
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
                <div className="tw-text-2xl tw-mb-1">{p.i}</div>
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
