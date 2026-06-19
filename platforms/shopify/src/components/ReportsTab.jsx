/**
 * ReportsTab - Full reports tab with CSV export, compliance audit,
 * user reputation, moderator performance, and multi-platform hub.
 */

import React, { useState, useMemo } from 'react'
import {
  Card,
  DataTable,
  Layout,
  Badge,
  EmptyState,
  Button,
} from '@shopify/polaris'
import {
  classifyRiskLevel,
  generateModeratorPerformance,
  getDefaultRiskLevelThresholds,
} from '@cmcc/core'

const API_BASE = '/api/cmcc'
const RISK_THRESHOLDS = getDefaultRiskLevelThresholds()

/**
 * @param {Object} props
 * @param {Object} props.reports - Reports data with userReputation, moderatorPerformance, platformHubs
 * @param {Function} props.showToast - Toast display function
 * @param {Array} props.rawEvents - Normalized events array
 * @param {Object} props.moderatorNames - Map of moderator IDs to names
 */
export default function ReportsTab({
  reports,
  showToast,
  rawEvents,
  moderatorNames,
}) {
  const {
    userReputation,
    moderatorPerformance: serverModPerformance,
    platformHubs,
  } = reports
  const [exporting, setExporting] = useState(false)
  const [auditData, setAuditData] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  async function handleExportCSV() {
    setExporting(true)
    try {
      const res = await fetch(`${API_BASE}/reports/export/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      })
      if (!res.ok) throw new Error('Failed to export CSV')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-moderation-report-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('CSV exported successfully')
    } catch (err) {
      showToast(err.message, true)
    } finally {
      setExporting(false)
    }
  }

  async function handleGenerateAudit() {
    setAuditLoading(true)
    try {
      const res = await fetch(`${API_BASE}/reports/compliance-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      })
      if (!res.ok) throw new Error('Failed to generate audit')
      const data = await res.json()
      setAuditData(data.data)
      showToast('Compliance audit generated')
    } catch (err) {
      showToast(err.message, true)
    } finally {
      setAuditLoading(false)
    }
  }

  // ── Map risk level to badge status ────────────────────
  function riskToBadgeStatus(level) {
    switch (level) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
      case 'critical':
        return 'critical'
      default:
        return 'info'
    }
  }

  // ── User Reputation Rows ──────────────────────────────
  const reputationRows = (userReputation || []).map((user) => {
    const rawScore =
      user.trustLevel ??
      (user.reputation_score !== null && user.reputation_score !== undefined
        ? user.reputation_score
        : 50)
    const breachCount = user.spam_items ?? user.spamPosts ?? 0
    const riskLevel = classifyRiskLevel(rawScore, breachCount, RISK_THRESHOLDS)

    return [
      user.author_name || user.username || user.author_id,
      <Badge
        key={`trust-${user.author_id || user.username}`}
        status={riskToBadgeStatus(riskLevel)}
      >
        {riskLevel}
      </Badge>,
      user.total_items ?? user.totalPosts ?? '-',
      user.spam_items ?? user.spamPosts ?? 0,
      user.reputation_score !== null && user.reputation_score !== undefined
        ? `${user.reputation_score}%`
        : user.spamRatio !== null && user.spamRatio !== undefined
          ? `${(user.spamRatio * 100).toFixed(1)}%`
          : '-',
      user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-',
    ]
  })

  // ── Moderator Performance Rows ─────────────────────────
  // Use core generateModeratorPerformance when raw events are available; fall back to server data
  const modPerformanceData = useMemo(() => {
    if (rawEvents && rawEvents.length > 0) {
      return generateModeratorPerformance(rawEvents, moderatorNames)
    }
    return null
  }, [rawEvents, moderatorNames])

  const modPerformance = modPerformanceData || serverModPerformance || []

  const modRows = modPerformance.map((mod) => [
    mod.moderatorName || mod.moderator || mod.moderatorId,
    mod.totalActions ?? mod.actionsTaken ?? 0,
    mod.accuracyRate !== null && mod.accuracyRate !== undefined
      ? `${(mod.accuracyRate * 100).toFixed(0)}%`
      : '-',
    mod.avgResponseTime !== null && mod.avgResponseTime !== undefined
      ? `${mod.avgResponseTime}h`
      : '-',
    <Badge
      key={`mod-status-${mod.moderator || mod.moderatorId}`}
      status={mod.active !== false ? 'success' : 'critical'}
    >
      {mod.active !== false ? 'Active' : 'Inactive'}
    </Badge>,
  ])

  // ── Compliance Audit Rows ─────────────────────────────
  const auditStatusRows = (auditData?.itemsByStatus || []).map((entry) => [
    entry.status,
    entry.count,
  ])

  const auditTimelineRows = (auditData?.actionsTimeline || []).map((entry) => [
    entry.date,
    entry.action,
    entry.count,
  ])

  return (
    <Layout>
      {/* Export & Audit Actions */}
      <Layout.Section>
        <Card sectioned title="Report Actions">
          <div className="cmcc-reports-actions">
            <Button
              primary
              onClick={handleExportCSV}
              loading={exporting}
              disabled={exporting}
            >
              Export CSV Report
            </Button>
            <Button
              onClick={handleGenerateAudit}
              loading={auditLoading}
              disabled={auditLoading}
            >
              Generate Compliance Audit
            </Button>
          </div>
          {auditData && (
            <div className="cmcc-audit-meta">
              <p>
                Audit generated:{' '}
                {new Date(auditData.generatedAt).toLocaleString()} | Period:{' '}
                {auditData.days} days | Unmoderated old items:{' '}
                {auditData.unmoderatedOldItems}
              </p>
            </div>
          )}
        </Card>
      </Layout.Section>

      {/* Compliance Audit Table */}
      {auditData && auditStatusRows.length > 0 && (
        <Layout.Section>
          <Card title="Compliance Audit - Items by Status">
            <DataTable
              columnContentTypes={['text', 'numeric']}
              headings={['Status', 'Count']}
              rows={auditStatusRows}
            />
          </Card>
        </Layout.Section>
      )}

      {auditData && auditTimelineRows.length > 0 && (
        <Layout.Section>
          <Card title="Compliance Audit - Actions Timeline">
            <DataTable
              columnContentTypes={['text', 'text', 'numeric']}
              headings={['Date', 'Action', 'Count']}
              rows={auditTimelineRows}
            />
          </Card>
        </Layout.Section>
      )}

      {/* User Reputation Dashboard */}
      <Layout.Section>
        <Card title="User Reputation Dashboard">
          {reputationRows.length > 0 ? (
            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'numeric',
                'numeric',
                'numeric',
                'text',
              ]}
              headings={[
                'Username',
                'Trust Level',
                'Total Posts',
                'Spam Posts',
                'Score',
                'Last Active',
              ]}
              rows={reputationRows}
            />
          ) : (
            <Card.Section>
              <EmptyState heading="No user reputation data">
                <p>
                  User reputation data will appear once moderation activity is
                  recorded.
                </p>
              </EmptyState>
            </Card.Section>
          )}
        </Card>
      </Layout.Section>

      {/* Moderator Performance */}
      <Layout.Section>
        <Card title="Moderator Performance">
          {modRows.length > 0 ? (
            <DataTable
              columnContentTypes={[
                'text',
                'numeric',
                'numeric',
                'numeric',
                'text',
              ]}
              headings={[
                'Moderator',
                'Actions Taken',
                'Accuracy',
                'Avg Response Time',
                'Status',
              ]}
              rows={modRows}
            />
          ) : (
            <Card.Section>
              <EmptyState heading="No moderator data">
                <p>
                  Moderator performance metrics will appear after moderation
                  actions are taken.
                </p>
              </EmptyState>
            </Card.Section>
          )}
        </Card>
      </Layout.Section>

      {/* Multi-Platform Hub Status */}
      <Layout.Section>
        <Card title="Multi-Platform Hub Status">
          {platformHubs && platformHubs.length > 0 ? (
            <div className="cmcc-platform-grid">
              {platformHubs.map((hub) => (
                <Card key={hub.platform} sectioned>
                  <div className="cmcc-platform-card">
                    <div className="cmcc-platform-header">
                      <span className="cmcc-platform-name">{hub.platform}</span>
                      <Badge
                        status={
                          hub.status === 'connected'
                            ? 'success'
                            : hub.status === 'syncing'
                              ? 'warning'
                              : 'critical'
                        }
                      >
                        {hub.status}
                      </Badge>
                    </div>
                    <div className="cmcc-platform-stats">
                      <div className="cmcc-platform-stat">
                        <span className="cmcc-stat-label">Queued</span>
                        <span className="cmcc-stat-value">
                          {hub.itemsQueued?.toLocaleString() ?? '-'}
                        </span>
                      </div>
                      <div className="cmcc-platform-stat">
                        <span className="cmcc-stat-label">Last Sync</span>
                        <span className="cmcc-stat-value">
                          {hub.lastSync
                            ? new Date(hub.lastSync).toLocaleString()
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card.Section>
              <EmptyState heading="No platform hubs connected">
                <p>Connect multi-platform hubs to see their status here.</p>
              </EmptyState>
            </Card.Section>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  )
}
