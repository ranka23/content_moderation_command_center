import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  Download,
  Users,
  BarChart3,
  Globe,
  Calendar,
  RefreshCw,
  Plus,
} from 'lucide-react'
import {
  Button,
  Table,
  SkeletonTable,
  EmptyState,
  ActivityFeed,
  Pagination,
  Icon,
} from '@cmcc/ui'
// apiFetch configured inline from props

function apiFetchFromProps(apiEndpoint, apiHeaders, path, options = {}) {
  const url = apiEndpoint
    ? `${apiEndpoint.replace(/\/+$/, '')}/api/${path.replace(/^\/+/, '')}`
    : path
  const headers = {
    'Content-Type': 'application/json',
    ...apiHeaders,
    ...options.headers,
  }
  return fetch(url, { ...options, headers }).then((res) => {
    if (!res.ok) {
      return res.json().then((e) => {
        throw new Error(e.message || `API request failed: ${res.status}`)
      })
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/csv')) return res.text()
    return res.json()
  })
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const trustBadge = (row) => {
  const level = row.trust_level || 'Unknown'
  const styles = {
    Trusted: { background: '#dcfce7', color: '#166534' },
    New: { background: '#dbeafe', color: '#1e40af' },
    Suspicious: { background: '#ffedd5', color: '#9a3412' },
  }
  const s = styles[level] || { background: '#fee2e2', color: '#991b1b' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        padding: '2px 10px',
        fontSize: '0.75rem',
        fontWeight: 500,
        ...s,
      }}
    >
      {level}
    </span>
  )
}

const spamRatioBadge = (row) => {
  const ratio = row.spam_ratio ?? 0
  const color = ratio > 0.5 ? '#dc2626' : ratio > 0.2 ? '#ea580c' : '#4b5563'
  const weight = ratio > 0.5 ? 700 : 400
  return (
    <span style={{ color, fontWeight: weight }}>
      {(ratio * 100).toFixed(0)}%
    </span>
  )
}

const REPUTATION_COLUMNS = [
  { key: 'author', label: 'Author', sortable: true, align: 'left' },
  {
    key: 'trust_level',
    label: 'Trust Level',
    sortable: true,
    align: 'center',
    cell: trustBadge,
  },
  { key: 'total_items', label: 'Total Items', sortable: true, align: 'right' },
  {
    key: 'spam_count',
    label: 'Spam Count',
    sortable: true,
    align: 'right',
    cell: (r) => <span style={{ color: '#dc2626' }}>{r.spam_count}</span>,
  },
  {
    key: 'spam_ratio',
    label: 'Spam Ratio',
    sortable: true,
    align: 'right',
    cell: spamRatioBadge,
  },
]

const MODERATOR_COLUMNS = [
  { key: 'moderator', label: 'Moderator', sortable: true, align: 'left' },
  {
    key: 'actions',
    label: 'Actions',
    sortable: true,
    align: 'right',
    cell: (r) => String(r.actions ?? r.totalActions ?? r.total_actions ?? 0),
  },
  {
    key: 'accuracy',
    label: 'Accuracy',
    sortable: true,
    align: 'right',
    cell: (r) => {
      const acc = r.accuracy ?? r.accuracyRate ?? r.accuracy_rate ?? null
      return acc !== null ? `${(acc * 100).toFixed(0)}%` : '—'
    },
  },
  {
    key: 'approvals',
    label: 'Approvals',
    sortable: true,
    align: 'right',
    cell: (r) => String(r.approvals ?? r.approved ?? 0),
  },
  {
    key: 'rejections',
    label: 'Rejections',
    sortable: true,
    align: 'right',
    cell: (r) => String(r.rejections ?? r.trashes ?? 0),
  },
]

function PaginationBar({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  label,
}) {
  const totalPages = Math.ceil(total / perPage)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {total > 0
            ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total} ${label}`
            : `No ${label}`}
        </span>
        <span style={{ color: '#d1d5db' }}>|</span>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}
        >
          Show
          <select
            value={String(perPage)}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value))
              onPageChange(1)
            }}
            style={{
              width: '64px',
              height: '32px',
              fontSize: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '0 4px',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
          per page
        </label>
      </div>
      {total > perPage && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

function Card({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '16px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {Icon && <Icon size={16} style={{ flexShrink: 0 }} />}
        {title}
      </h3>
    </div>
  )
}

function SectionBody({ children, style, ...rest }) {
  return (
    <div style={{ padding: '16px', ...style }} {...rest}>
      {children}
    </div>
  )
}

export default function ReportsPage({
  reports,
  apiEndpoint,
  apiHeaders,
  addToast,
}) {
  // ── Export state ──────────────────────────────────────────────────
  const [exportingMod, setExportingMod] = useState(false)
  const [exportingAudit, setExportingAudit] = useState(false)

  // ── Reputation state ──────────────────────────────────────────────
  const [reputationData, setReputationData] = useState([])
  const [reputationLoading, setReputationLoading] = useState(true)
  const [reputationError, setReputationError] = useState(null)
  const [repPage, setRepPage] = useState(1)
  const [repPerPage, setRepPerPage] = useState(25)

  // ── Moderator performance state ───────────────────────────────────
  const [modData, setModData] = useState([])
  const [modLoading, setModLoading] = useState(true)
  const [modPage, setModPage] = useState(1)
  const [modPerPage, setModPerPage] = useState(25)

  // ── Activity feed from reports prop ───────────────────────────────
  const activityFeed = reports?.activityFeed ?? []
  const isFeedLoading = reports?.isFeedLoading ?? false
  const feedError = reports?.feedError ?? null
  const fetchActivityFeed = useMemo(
    () => reports?.fetchActivityFeed ?? (() => {}),
    [reports?.fetchActivityFeed],
  )

  // ── Data fetching ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setReputationLoading(true)
      setReputationError(null)
      try {
        const data = await apiFetchFromProps(
          apiEndpoint,
          apiHeaders,
          'reputation',
        )
        if (!cancelled) {
          const items = Array.isArray(data)
            ? data
            : (data.items ?? data.results ?? data.data ?? [])
          setReputationData(items)
        }
      } catch (err) {
        if (!cancelled) {
          setReputationError(err.message)
          setReputationData([])
        }
      } finally {
        if (!cancelled) setReputationLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setModLoading(true)
      try {
        const data = await apiFetchFromProps(
          apiEndpoint,
          apiHeaders,
          'moderators/performance',
        )
        if (!cancelled) {
          const items = Array.isArray(data)
            ? data
            : (data.items ?? data.results ?? data.data ?? [])
          setModData(items)
        }
      } catch {
        // Silently fall back to empty — performance data is optional
        if (!cancelled) setModData([])
      } finally {
        if (!cancelled) setModLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (fetchActivityFeed) fetchActivityFeed()
  }, [fetchActivityFeed])

  // ── Export handler ────────────────────────────────────────────────
  const handleExport = async (endpoint, label) => {
    const setter = endpoint.includes('audit')
      ? setExportingAudit
      : setExportingMod
    setter(true)
    try {
      const res = await apiFetchFromProps(apiEndpoint, apiHeaders, endpoint, {
        method: 'POST',
      })
      let csvContent = ''

      if (typeof res === 'string') {
        csvContent = res
      } else if (res?.success && res?.data) {
        csvContent = Array.isArray(res.data)
          ? res.data.join('\n')
          : String(res.data)
      } else if (res && typeof res === 'object') {
        const items =
          res.items ??
          res.results ??
          res.data ??
          (Array.isArray(res) ? res : [])
        if (Array.isArray(items) && items.length > 0) {
          const headers = Object.keys(items[0])
          csvContent = [
            headers.join(','),
            ...items.map((row) =>
              headers
                .map((h) => {
                  const val = String(row[h] ?? '')
                  return val.includes(',') ||
                    val.includes('"') ||
                    val.includes('\n')
                    ? `"${val.replace(/"/g, '""')}"`
                    : val
                })
                .join(','),
            ),
          ].join('\n')
        }
      }

      if (!csvContent) {
        addToast('No data available for export', 'info')
        setter(false)
        return
      }

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${label}-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      addToast(`${label} exported as CSV`, 'success')
    } catch {
      addToast(`Failed to export ${label}`, 'error')
    } finally {
      setter(false)
    }
  }

  // ── Pagination slices ─────────────────────────────────────────────
  const repPaginated = reputationData.slice(
    (repPage - 1) * repPerPage,
    repPage * repPerPage,
  )
  const modPaginated = modData.slice(
    (modPage - 1) * modPerPage,
    modPage * modPerPage,
  )

  // ── Styles ────────────────────────────────────────────────────────
  const sectionStyle = {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* ── Page heading ──────────────────────────────────────────── */}
      <h2
        style={{
          margin: '0 0 20px',
          fontSize: '1.25rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FileText size={20} />
        Reports &amp; Compliance
      </h2>

      {/* ── Export cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Moderation Activity Report
          </h3>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Export all moderation activity for the selected period.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleExport('reports/moderation-activity', 'cmcc-moderation')
            }
            disabled={exportingMod}
          >
            <Download size={14} style={{ display: 'inline', marginRight: 4 }} />
            {exportingMod ? 'Exporting...' : 'Export CSV'}
          </Button>
        </Card>

        <Card>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Compliance Audit Log
          </h3>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Export compliance audit trail with timestamps and moderator details.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleExport('reports/compliance-audit', 'cmcc-compliance')
            }
            disabled={exportingAudit}
          >
            <Download size={14} style={{ display: 'inline', marginRight: 4 }} />
            {exportingAudit ? 'Exporting...' : 'Export Audit Log'}
          </Button>
        </Card>
      </div>

      {/* ── Scheduled Reports ─────────────────────────────────────── */}
      <div style={sectionStyle}>
        <SectionHeader icon={Calendar} title="Scheduled Reports" />
        <SectionBody>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Schedule recurring reports to be generated and emailed.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <label
                style={{ fontSize: '0.75rem', color: '#6b7280' }}
                htmlFor="sb-report-type"
              >
                Report Type
              </label>
              <select
                id="sb-report-type"
                style={{
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '6px 8px',
                }}
              >
                <option value="moderation_activity">Moderation Activity</option>
                <option value="compliance_audit">Compliance Audit</option>
                <option value="moderator_performance">
                  Moderator Performance
                </option>
              </select>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <label
                style={{ fontSize: '0.75rem', color: '#6b7280' }}
                htmlFor="sb-report-freq"
              >
                Frequency
              </label>
              <select
                id="sb-report-freq"
                style={{
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '6px 8px',
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <label
                style={{ fontSize: '0.75rem', color: '#6b7280' }}
                htmlFor="sb-report-format"
              >
                Format
              </label>
              <select
                id="sb-report-format"
                style={{
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '6px 8px',
                }}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  await apiFetch('reports/scheduled', {
                    method: 'POST',
                    body: JSON.stringify({
                      type:
                        document.getElementById('sb-report-type')?.value ||
                        'moderation_activity',
                      frequency:
                        document.getElementById('sb-report-freq')?.value ||
                        'weekly',
                      format:
                        document.getElementById('sb-report-format')?.value ||
                        'csv',
                    }),
                  })
                  addToast('Report scheduled successfully', 'success')
                } catch {
                  addToast('Failed to schedule report', 'error')
                }
              }}
            >
              <Plus size={14} style={{ display: 'inline', marginRight: 4 }} />
              Schedule Report
            </Button>
          </div>
        </SectionBody>
      </div>

      {/* ── User Reputation Dashboard ─────────────────────────────── */}
      <div style={sectionStyle}>
        <SectionHeader icon={Users} title="User Reputation Dashboard" />
        <SectionBody>
          {reputationLoading ? (
            <SkeletonTable rows={4} columns={5} />
          ) : reputationError ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px',
                color: '#dc2626',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Failed to load reputation data: {reputationError}
              </p>
              <button
                onClick={() => {
                  setReputationLoading(true)
                  setReputationError(null)
                  apiFetch('reputation')
                    .then((data) => {
                      const items = Array.isArray(data)
                        ? data
                        : (data.items ?? data.results ?? data.data ?? [])
                      setReputationData(items)
                    })
                    .catch((err) => {
                      setReputationError(err.message)
                    })
                    .finally(() => setReputationLoading(false))
                }}
                style={{
                  marginTop: '12px',
                  padding: '6px 16px',
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <RefreshCw
                  size={14}
                  style={{ display: 'inline', marginRight: 4 }}
                />
                Retry
              </button>
            </div>
          ) : reputationData.length === 0 ? (
            <EmptyState
              icon="users"
              title="No user data available"
              description="User reputation data will appear as content is moderated."
            />
          ) : (
            <>
              <Table
                columns={REPUTATION_COLUMNS}
                data={repPaginated}
                rowKey={(r) => r.author_id ?? r.id ?? r.author}
              />
              <PaginationBar
                total={reputationData.length}
                page={repPage}
                perPage={repPerPage}
                onPageChange={setRepPage}
                onPerPageChange={setRepPerPage}
                label="users"
              />
            </>
          )}
        </SectionBody>
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <SectionHeader icon={RefreshCw} title="Activity Feed" />
        <SectionBody>
          <ActivityFeed
            events={activityFeed}
            isLoading={isFeedLoading}
            error={feedError}
            onRetry={fetchActivityFeed}
          />
        </SectionBody>
      </div>

      {/* ── Moderator Performance ─────────────────────────────────── */}
      <div style={sectionStyle}>
        <SectionHeader icon={BarChart3} title="Moderator Performance" />
        <SectionBody>
          {modLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : modData.length === 0 ? (
            <EmptyState
              icon="activity"
              title="No performance data yet"
              description="Moderator performance metrics will appear as actions are taken."
            />
          ) : (
            <>
              <Table
                columns={MODERATOR_COLUMNS}
                data={modPaginated}
                rowKey={(r) => r.moderator ?? r.id ?? r.moderatorId}
              />
              <PaginationBar
                total={modData.length}
                page={modPage}
                perPage={modPerPage}
                onPageChange={setModPage}
                onPerPageChange={setModPerPage}
                label="moderators"
              />
            </>
          )}
        </SectionBody>
      </div>

      {/* ── Multi-Platform Hub ────────────────────────────────────── */}
      <div style={sectionStyle}>
        <SectionHeader icon={Globe} title="Multi-Platform Hub" />
        <SectionBody>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Connect and manage all your platforms from a single dashboard.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              { name: 'Storyblok', icon: 'storyblok', connected: true },
              { name: 'WordPress', icon: 'wordpress', connected: false },
              { name: 'Shopify', icon: 'shopify', connected: false },
              { name: 'Strapi', icon: 'strapi', connected: false },
              { name: 'Wix', icon: 'wix', connected: false },
            ].map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  if (!p.connected)
                    addToast(`${p.name} integration coming soon`, 'info')
                }}
                style={{
                  borderRadius: '8px',
                  border: `1px solid ${p.connected ? '#86efac' : '#e5e7eb'}`,
                  padding: '12px',
                  textAlign: 'center',
                  cursor: p.connected ? 'default' : 'pointer',
                  background: p.connected ? '#f0fdf4' : '#f9fafb',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!p.connected) {
                    e.currentTarget.style.borderColor = '#93c5fd'
                    e.currentTarget.style.background = '#eff6ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!p.connected) {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.background = '#f9fafb'
                  }
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                  <Icon name={p.icon} size={24} />
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: p.connected ? '#16a34a' : '#9ca3af',
                  }}
                >
                  {p.connected ? '● Connected' : '○ Not connected'}
                </div>
              </div>
            ))}
          </div>
        </SectionBody>
      </div>
    </div>
  )
}
