import React, { useState, useCallback } from 'react'
import {
  Button,
  SkeletonTable,
  EmptyState,
  SlideOutPanel,
  QuickFilterBar,
  ProgressBar,
  ModerationNotes,
  QueueTable,
  AiEvaluationResult,
  ConfirmationModal,
} from '@cmcc/ui'
import { apiFetch } from '../lib/api'
import {
  RefreshCw,
  Keyboard,
  CheckCircle,
  XCircle,
  Flag,
  Cpu,
  ClipboardList,
  History,
} from 'lucide-react'
import ConfirmActionDialog from '../components/ConfirmActionDialog'

const sb = (s) =>
  ({
    approved: 'tw-bg-green-100 tw-text-green-800',
    spam: 'tw-bg-red-100 tw-text-red-800',
    flagged: 'tw-bg-orange-100 tw-text-orange-800',
    rejected: 'tw-bg-gray-100 tw-text-gray-800',
    deferred: 'tw-bg-cyan-100 tw-text-cyan-800',
  })[s] || 'tw-bg-yellow-100 tw-text-yellow-800'
const hb = (a) =>
  ({
    approve: 'tw-bg-green-100 tw-text-green-800',
    reject: 'tw-bg-red-100 tw-text-red-800',
    spam: 'tw-bg-amber-100 tw-text-amber-800',
  })[a] || 'tw-bg-gray-100 tw-text-gray-700'

export default function QueuePage({
  queue: h,
  collaboration: _collab,
  queueStats: _qs,
  addToast,
  theme = 'light',
}) {
  const [cba, scba] = useState(null)
  const [aiEvalResult, setAiEvalResult] = useState(null)
  const [aiEvalLoading, setAiEvalLoading] = useState(false)
  const [aiEvalError, setAiEvalError] = useState(null)

  // ── Confirmation dialog for single item actions ───────────────────
  const [confirmAction, setConfirmAction] = useState(null) // { action, item }
  const [confirmLoading, setConfirmLoading] = useState(false)

  const hbawc = useCallback((a, ids) => scba({ action: a, ids }), [])

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return
    const { action, item } = confirmAction
    setConfirmLoading(true)
    try {
      const id = item.id || item.originalId
      await h.handleItemAction(action, id)
      h.setDetailItem(null)
    } finally {
      setConfirmLoading(false)
      setConfirmAction(null)
    }
  }, [confirmAction, h])

  const requestConfirmAction = useCallback((action, item) => {
    setConfirmAction({ action, item })
  }, [])

  const onRead = useCallback(
    (item) => {
      const id = item.id || item.originalId
      h.setDetailItem(item)
      h.fetchItemHistory(id)
      h.fetchItemNotes(id)
      // Reset AI evaluation when viewing a new item
      setAiEvalResult(null)
      setAiEvalError(null)
    },
    [h],
  )
  const handleAiEvaluate = useCallback(
    async (item) => {
      const id = item.id || item.originalId
      setAiEvalLoading(true)
      setAiEvalError(null)
      setAiEvalResult(null)
      try {
        const result = await apiFetch(
          `queue/${encodeURIComponent(id)}/ai-evaluate`,
        )
        setAiEvalResult(result)
        addToast('AI evaluation complete', 'success')
      } catch (err) {
        const msg = err?.message || 'AI evaluation request failed'
        setAiEvalError(msg)
        addToast(msg, 'error')
      } finally {
        setAiEvalLoading(false)
      }
    },
    [addToast],
  )
  const d = h.detailItem

  /* prettier-ignore */ const historyJsx = h.isHistoryLoading
    ? <div className="tw-text-sm tw-text-gray-400 tw-py-4 tw-text-center">Loading history...</div>
    : !h.itemHistory.length
      ? <div className="tw-text-sm tw-text-gray-400 tw-py-4 tw-text-center">No history recorded yet</div>
      : <div className="tw-space-y-3">{h.itemHistory.map((e) => (
          <div key={e.id} className="tw-flex tw-gap-3 tw-items-start">
            <div className="tw-w-2 tw-h-2 tw-rounded-full tw-mt-1.5 tw-flex-shrink-0 tw-bg-blue-500" />
            <div className="tw-flex-1 tw-min-w-0">
              <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                <span className="tw-text-xs tw-font-medium">{e.moderator_name || e.moderator || e.moderator_display_name || e.performedBy || (e.moderator_id ? `User #${e.moderator_id}` : 'Unknown user')}</span>
                <span className={`tw-inline-flex tw-items-center tw-rounded-full tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium ${hb(e.action)}`}>{e.action}</span>
              </div>
              <p className="tw-text-xs tw-text-gray-400 tw-mt-0.5">{e.timestamp ? new Date(e.timestamp).toLocaleString() : ''}</p>
              {e.notes && <p className="tw-text-xs tw-text-gray-500 tw-mt-0.5">{e.notes}</p>}
            </div>
          </div>
        ))}</div>

  return (
    <div className="cmcc-tab-panel" role="tabpanel">
      <div className="tw-mb-4">
        <QuickFilterBar
          activePreset={h.activeQuickPreset}
          onSelectPreset={h.handleQuickFilter}
        />
      </div>
      {h.bulkProgress.active && (
        <div className="tw-mb-4">
          <ProgressBar
            value={h.bulkProgress.current}
            max={h.bulkProgress.total}
            label={`Applying bulk action... (${h.bulkProgress.current}/${h.bulkProgress.total})`}
            variant={
              h.bulkProgress.current === h.bulkProgress.total
                ? 'success'
                : 'info'
            }
            showPercentage
          />
        </div>
      )}
      <div className="cmcc-page-header">
        <div className="cmcc-btn-group">
          <Button
            variant="outline"
            size="sm"
            onClick={() => h.fetchQueue(h.queuePage)}
          >
            <>
              <RefreshCw size={14} /> Refresh
            </>
          </Button>
          <span className="cmcc-queue-count">
            {h.isQueueLoading ? 'Loading...' : `${h.queueTotal} items`}
          </span>
        </div>
        <div className="cmcc-btn-group">
          {h.savedFilters.length > 0 && (
            <select
              id="cmcc-saved-filters"
              name="cmcc-saved-filters"
              className="cmcc-filter-select"
              onChange={(e) => {
                if (e.target.value) {
                  const f = h.savedFilters.find(
                    (s) => s.name === e.target.value,
                  )
                  if (f) h.handleFilterChange(f.filters)
                }
              }}
              defaultValue=""
            >
              <option value="">Saved Filters...</option>
              {h.savedFilters.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="cmcc-icon-btn"
            onClick={() => scba({ action: '__shortcuts' })}
            title="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>
        </div>
      </div>
      <div className="cmcc-save-filter-row">
        <input
          type="text"
          id="cmcc-save-filter-input"
          name="cmcc-save-filter-input"
          className="cmcc-search-input"
          style={{ width: '200px' }}
          placeholder="Name this filter..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              h.saveFilter(e.target.value.trim(), h.filters)
              addToast('Filter saved: ' + e.target.value.trim(), 'success')
              e.target.value = ''
            }
          }}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const inp = document.getElementById('cmcc-save-filter-input')
            if (inp && inp.value.trim()) {
              h.saveFilter(inp.value.trim(), h.filters)
              addToast('Filter saved: ' + inp.value.trim(), 'success')
              inp.value = ''
            }
          }}
        >
          + Save Filter
        </Button>
      </div>
      {h.isQueueLoading && h.queueItems.length === 0 ? (
        <SkeletonTable rows={5} columns={6} />
      ) : h.queueItems.length === 0 ? (
        <EmptyState
          icon="queue"
          title="No items in the queue"
          description="Items will appear here when content needs moderation."
          action={
            <Button variant="outline" size="sm" onClick={() => h.fetchQueue(1)}>
              <>
                <RefreshCw size={14} className="tw-inline tw-mr-1" /> Refresh
              </>
            </Button>
          }
        />
      ) : (
        <QueueTable
          items={h.queueItems}
          onBulkAction={hbawc}
          onItemAction={h.handleItemAction}
          filters={h.filters}
          onFilterChange={h.handleFilterChange}
          isLoading={h.isQueueLoading}
          totalCount={h.queueTotal}
          onSort={h.handleSort}
          sortField={h.sortField}
          sortDirection={h.sortDirection}
          page={h.queuePage}
          onPageChange={(p) => h.setQueuePage(p)}
          perPage={h.queuePerPage}
          onPerPageChange={(n) => {
            h.setQueuePerPage(n)
            h.setQueuePage(1)
          }}
          onSearch={(q) => h.handleFilterChange({ search: q })}
          theme={theme}
          onReadItem={onRead}
        />
      )}
      <SlideOutPanel
        open={!!d}
        onClose={() => h.setDetailItem(null)}
        title={d?.title || 'Item Details'}
        side="right"
      >
        {d && (
          <div className="tw-space-y-4">
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              <span
                className={`tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium ${sb(d.status)}`}
              >
                {d.statusLabel || d.status}
              </span>
              <span className="tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-bg-gray-100 tw-text-gray-700">
                {d.contentType || d.content_type}
              </span>
            </div>
            <div className="tw-text-sm tw-text-gray-500">
              <p>
                <strong>Author:</strong>{' '}
                {d.authorName || d.authorId || 'Unknown'}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {d.dateGmt ? new Date(d.dateGmt).toLocaleString() : 'N/A'}
              </p>
              <p>
                <strong>Spam Score:</strong>{' '}
                {typeof d.spamScore === 'number'
                  ? (d.spamScore * 100).toFixed(0) + '%'
                  : 'N/A'}
              </p>
            </div>
            {d.excerpt && (
              <div>
                <h4 className="tw-text-sm tw-font-semibold tw-mb-1">Content</h4>
                <p className="tw-text-sm tw-text-gray-600 tw-bg-gray-50 tw-rounded tw-p-3">
                  {d.excerpt}
                </p>
              </div>
            )}
            <div className="cmcc-slide-panel-actions">
              {d.status !== 'approved' && (
                <button
                  onClick={() => requestConfirmAction('approve', d)}
                  className="cmcc-sp-btn cmcc-sp-btn-approve"
                  title="Approve this item"
                >
                  <CheckCircle size={16} />
                  <span>Approve</span>
                </button>
              )}
              {d.status !== 'rejected' && (
                <button
                  onClick={() => requestConfirmAction('reject', d)}
                  className="cmcc-sp-btn cmcc-sp-btn-reject"
                  title="Reject this item"
                >
                  <XCircle size={16} />
                  <span>Reject</span>
                </button>
              )}
              <button
                onClick={() => requestConfirmAction('spam', d)}
                className="cmcc-sp-btn cmcc-sp-btn-spam"
                title="Mark as spam"
              >
                <Flag size={16} />
                <span>Spam</span>
              </button>
              <button
                onClick={() => handleAiEvaluate(d)}
                className="cmcc-sp-btn cmcc-sp-btn-ai"
                disabled={aiEvalLoading}
                title={aiEvalLoading ? 'Evaluating...' : 'Run AI evaluation'}
              >
                <Cpu size={16} />
                {aiEvalLoading ? 'Evaluating...' : 'AI Evaluate'}
              </button>
            </div>
            {/* Button spacing spacer */}
            <div className="tw-h-2" />
            {(aiEvalResult || aiEvalLoading || aiEvalError) && (
              <div className="tw-pt-4 tw-border-t tw-border-gray-100">
                <AiEvaluationResult
                  result={aiEvalResult}
                  isLoading={aiEvalLoading}
                  error={aiEvalError}
                  onReEvaluate={() => handleAiEvaluate(d)}
                />
              </div>
            )}
            <div className="tw-pt-4 tw-border-t tw-border-gray-100">
              <h4 className="tw-text-sm tw-font-semibold tw-mb-2">
                <>
                  <ClipboardList size={16} className="tw-inline tw-mr-1" />{' '}
                  Assignment
                </>
              </h4>
              <div className="tw-flex tw-flex-col tw-gap-3">
                <div className="cmcc-form-group">
                  <label htmlFor="cmcc-assign-input">Assign To</label>
                  <input
                    type="text"
                    placeholder="Moderator name"
                    id="cmcc-assign-input"
                    name="cmcc-assign-input"
                  />
                </div>
                <div className="cmcc-form-row">
                  <div className="cmcc-form-group">
                    <label htmlFor="cmcc-assign-due">Due Date</label>
                    <input
                      type="date"
                      id="cmcc-assign-due"
                      name="cmcc-assign-due"
                    />
                  </div>
                  <div className="cmcc-form-group">
                    <label htmlFor="cmcc-assign-priority">Priority</label>
                    <select
                      id="cmcc-assign-priority"
                      name="cmcc-assign-priority"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <button
                  className="cmcc-sp-btn cmcc-sp-btn-save"
                  onClick={() => {
                    const a =
                      document.getElementById('cmcc-assign-input')?.value
                    const dd = document.getElementById('cmcc-assign-due')?.value
                    const p = document.getElementById(
                      'cmcc-assign-priority',
                    )?.value
                    h.handleAssignItem(a, dd, p)
                    const i = document.getElementById('cmcc-assign-input')
                    if (i) i.value = ''
                  }}
                >
                  Save Assignment
                </button>
              </div>
            </div>
            <div className="tw-pt-4 tw-border-t tw-border-gray-100">
              <h4 className="tw-text-sm tw-font-semibold tw-mb-2">
                <>
                  <History size={16} className="tw-inline tw-mr-1" /> History
                  Timeline
                </>
              </h4>
              {historyJsx}
            </div>
            <div className="tw-pt-4 tw-border-t tw-border-gray-100">
              <ModerationNotes
                notes={h.itemNotes}
                onAddNote={h.addItemNote}
                canAdd={true}
                currentUserName={window.cmccData?.userDisplay || 'You'}
                isLoading={h.isNotesLoading}
              />
            </div>
          </div>
        )}
      </SlideOutPanel>
      {/* ── Confirmation dialog for single item actions ──────────────── */}
      <ConfirmActionDialog
        action={confirmAction?.action}
        item={confirmAction?.item}
        open={!!confirmAction}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      {/* ── Confirmation dialog for bulk actions ─────────────────────── */}
      {cba && cba.action !== '__shortcuts' && (
        <ConfirmationModal
          open={true}
          title="Confirm Bulk Action"
          message={`Are you sure you want to apply "${cba.action}" to ${cba.ids.length} selected items? This action cannot be undone.`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          confirmVariant="danger"
          destructive={true}
          onConfirm={() => {
            h.handleBulkAction(cba.action, cba.ids)
            scba(null)
          }}
          onCancel={() => scba(null)}
        />
      )}
    </div>
  )
}
