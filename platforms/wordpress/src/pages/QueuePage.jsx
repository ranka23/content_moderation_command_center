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
} from '@cmcc/ui'
import { useQueue } from '../hooks/useQueue'
import { apiFetch } from '../lib/api'
import { KEYBOARD_SHORTCUTS } from '../lib/constants'

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

export default function QueuePage({ addToast, theme = 'light' }) {
  const h = useQueue({ addToast })
  const [cba, scba] = useState(null)
  const [aiEvalResult, setAiEvalResult] = useState(null)
  const [aiEvalLoading, setAiEvalLoading] = useState(false)
  const [aiEvalError, setAiEvalError] = useState(null)
  const hbawc = useCallback((a, ids) => scba({ action: a, ids }), [])
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
          `queue/${encodeURIComponent(id)}/evaluate`,
          {
            method: 'POST',
          },
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
                <span className="tw-text-xs tw-font-medium">{e.moderator_name || e.moderator_display_name || `User #${e.moderator_id}`}</span>
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
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
        <div className="tw-flex tw-items-center tw-gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => h.fetchQueue(h.queuePage)}
          >
            🔄 Refresh
          </Button>
          <span className="tw-text-xs tw-text-gray-400 tw-hidden sm:tw-inline">
            {h.isQueueLoading ? 'Loading...' : `${h.queueTotal} items`}
          </span>
        </div>
        <div className="tw-flex tw-items-center tw-gap-2">
          {h.savedFilters.length > 0 && (
            <select
              className="tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1"
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
            className="tw-text-xs tw-text-gray-400 hover:tw-text-gray-600 tw-px-2"
            onClick={() => scba({ action: '__shortcuts' })}
            title="Keyboard shortcuts"
          >
            ⌨️
          </button>
        </div>
      </div>
      <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
        <input
          type="text"
          id="cmcc-save-filter-input"
          className="tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1 tw-w-40"
          placeholder="Name this filter..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              h.saveFilter(e.target.value.trim(), h.filters)
              addToast('Filter saved: ' + e.target.value.trim(), 'success')
              e.target.value = ''
            }
          }}
        />
        <button
          className="tw-text-xs tw-text-primary-600 hover:tw-text-primary-800 tw-font-medium"
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
        </button>
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
              🔄 Refresh
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
            <div className="tw-flex tw-gap-2 tw-pt-2 tw-border-t tw-border-gray-100">
              {d.status !== 'approved' && (
                <button
                  onClick={() => {
                    h.handleItemAction('approve', d.id || d.originalId)
                    h.setDetailItem(null)
                  }}
                  className="tw-flex-1 tw-rounded tw-bg-green-600 tw-text-white tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-green-700"
                >
                  ✅ Approve
                </button>
              )}
              {d.status !== 'rejected' && (
                <button
                  onClick={() => {
                    h.handleItemAction('reject', d.id || d.originalId)
                    h.setDetailItem(null)
                  }}
                  className="tw-flex-1 tw-rounded tw-bg-red-600 tw-text-white tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-red-700"
                >
                  ❌ Reject
                </button>
              )}
              <button
                onClick={() => {
                  h.handleItemAction('spam', d.id || d.originalId)
                  h.setDetailItem(null)
                }}
                className="tw-flex-1 tw-rounded tw-bg-amber-600 tw-text-white tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-amber-700"
              >
                🚫 Spam
              </button>
              <button
                onClick={() => handleAiEvaluate(d)}
                className="tw-flex-1 tw-rounded tw-bg-purple-600 tw-text-white tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-purple-700"
                disabled={aiEvalLoading}
              >
                🤖 {aiEvalLoading ? 'Evaluating...' : 'AI Evaluate'}
              </button>
            </div>
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
                📋 Assignment
              </h4>
              <div className="tw-flex tw-flex-col tw-gap-2">
                <input
                  type="text"
                  placeholder="Assign to (moderator name)"
                  id="cmcc-assign-input"
                  className="tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1.5"
                />
                <div className="tw-flex tw-gap-2">
                  <input
                    type="date"
                    id="cmcc-assign-due"
                    className="tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1.5 tw-flex-1"
                  />
                  <select
                    id="cmcc-assign-priority"
                    className="tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-2 tw-py-1.5"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <button
                  className="tw-rounded tw-bg-primary-600 tw-text-white tw-px-3 tw-py-1.5 tw-text-xs hover:tw-bg-primary-700"
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
                📜 History Timeline
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
      {cba && cba.action === '__shortcuts' ? (
        <div className="cmcc-modal-overlay" onClick={() => scba(null)}>
          <div className="cmcc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmcc-modal-header">
              <h3 className="cmcc-modal-title">⌨️ Keyboard Shortcuts</h3>
              <button className="cmcc-modal-close" onClick={() => scba(null)}>
                ✕
              </button>
            </div>
            <div className="cmcc-modal-body">
              <div className="tw-space-y-2">
                {KEYBOARD_SHORTCUTS.map((sk) => (
                  <div
                    key={sk.key}
                    className="tw-flex tw-justify-between tw-items-center tw-py-1"
                  >
                    <span className="tw-text-sm tw-text-gray-600">
                      {sk.description}
                    </span>
                    <kbd className="tw-px-2 tw-py-1 tw-text-xs tw-font-mono tw-bg-gray-100 tw-border tw-border-gray-300 tw-rounded">
                      {sk.key.length === 1 ? sk.key.toUpperCase() : sk.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        cba && (
          <div className="cmcc-modal-overlay" onClick={() => scba(null)}>
            <div className="cmcc-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cmcc-modal-header">
                <h3 className="cmcc-modal-title">Confirm Bulk Action</h3>
                <button className="cmcc-modal-close" onClick={() => scba(null)}>
                  ✕
                </button>
              </div>
              <div className="cmcc-modal-body">
                <p className="tw-text-sm tw-text-gray-600">
                  Are you sure you want to apply &quot;{cba.action}&quot; to{' '}
                  {cba.ids.length} selected items? This action cannot be undone.
                </p>
                <div className="cmcc-modal-actions">
                  <button
                    onClick={() => scba(null)}
                    className="cmcc-btn cmcc-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      h.handleBulkAction(cba.action, cba.ids)
                      scba(null)
                    }}
                    className="cmcc-btn cmcc-btn-primary"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
