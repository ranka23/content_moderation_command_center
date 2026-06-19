import React, { useState } from 'react'
import {
  QueueTable,
  QuickFilterBar,
  AiEvaluationResult,
  ConfirmationModal,
} from '@cmcc/ui'
import { AlertTriangle, Bot, CheckCircle, Keyboard, Search } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_PRESETS = [
  {
    id: 'last-hour',
    label: 'Last Hour',
    icon: 'last-hour',
    filters: { dateRange: 'last-hour', status: 'all' },
  },
  {
    id: 'today',
    label: 'Today',
    icon: 'today',
    filters: { dateRange: 'today', status: 'all' },
  },
  {
    id: 'this-week',
    label: 'This Week',
    icon: 'this-week',
    filters: { dateRange: 'this-week', status: 'all' },
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: 'pending',
    filters: { status: 'pending', dateRange: 'all' },
  },
  {
    id: 'high-spam',
    label: 'High Spam',
    icon: 'high-spam',
    filters: { status: 'spam', dateRange: 'all' },
  },
  {
    id: 'flagged',
    label: 'Flagged',
    icon: 'flagged',
    filters: { status: 'flagged', dateRange: 'all' },
  },
]

// ---------------------------------------------------------------------------
// QueueTab Component
// ---------------------------------------------------------------------------

export function QueueTab({
  queueItems,
  queueLoading,
  queueError,
  onRetry,
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  perPage,
  activeQuickPreset,
  setActiveQuickPreset,
  savedFilters,
  saveFilter,
  onBulkAction,
  onItemAction,
  onViewItem,
  onAiEvaluate,
  aiConfig,
  aiEvaluatingId,
  aiEvaluationResult,
  aiEvaluationError,
  evaluatedItemId,
  addToast,
  filters,
  onFilterChange,
  setShowShortcuts,
  onPerPageChange,
}) {
  const [confirmAction, setConfirmAction] = useState(null)
  // ---- Render helpers ----

  const handleItemAction = (action, itemId) => {
    if (['reject', 'spam', 'defer'].includes(action)) {
      setConfirmAction({ action, itemId })
      return
    }
    onItemAction(action, itemId)
  }

  function renderLoading(message) {
    return <div className="cmcc-loading">{message}</div>
  }

  function renderEmpty(icon, text, sub) {
    return (
      <div className="cmcc-empty">
        <div className="cmcc-empty-icon">{icon}</div>
        <p className="cmcc-empty-text">{text}</p>
        {sub && <p className="cmcc-empty-sub">{sub}</p>}
      </div>
    )
  }

  // ---- Loading / Error / Empty states ----

  if (queueLoading) return renderLoading('Loading queue...')

  if (queueError) {
    return (
      <div className="cmcc-error">
        <div className="cmcc-error-icon">
          <AlertTriangle size={16} />
        </div>
        <p className="cmcc-error-text">Failed to load queue</p>
        <p className="cmcc-error-detail">{queueError}</p>
        {onRetry && (
          <button
            className="cmcc-btn-secondary"
            onClick={onRetry}
            style={{ marginTop: 12 }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!queueLoading && queueItems.length === 0) {
    return renderEmpty(
      <CheckCircle size={24} />,
      'All clear!',
      'No items in the moderation queue.',
    )
  }

  // ---- Derived state ----

  const lowerQuery = searchQuery.toLowerCase()
  const searchedItems = queueItems.filter((item) => {
    const title = (item.title || item.name || '').toLowerCase()
    const author = (item.author_name || item.author || '').toLowerCase()
    return title.includes(lowerQuery) || author.includes(lowerQuery)
  })

  const totalPages = Math.ceil(searchedItems.length / perPage) || 1
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const paginatedItems = searchedItems.slice(start, start + perPage)

  // ---- Render ----

  return (
    <div>
      {/* Quick Filters */}
      <div style={{ marginBottom: 12 }}>
        <QuickFilterBar
          presets={QUICK_PRESETS}
          activePreset={activeQuickPreset}
          onSelectPreset={setActiveQuickPreset}
        />
      </div>

      {/* Saved Filters Bar */}
      <div className="cmcc-queue-toolbar">
        <div className="cmcc-queue-toolbar-left">
          {savedFilters.length > 0 && (
            <select
              className="cmcc-saved-filters-select"
              onChange={(e) => {
                if (e.target.value) {
                  const found = savedFilters.find(
                    (f) => f.name === e.target.value,
                  )
                  if (found) {
                    addToast('Filter applied: ' + found.name, 'success')
                  }
                }
              }}
              defaultValue=""
            >
              <option value="">Saved Filters...</option>
              {savedFilters.map((sf) => (
                <option key={sf.name} value={sf.name}>
                  {sf.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="cmcc-queue-toolbar-right">
          <input
            type="text"
            className="cmcc-save-filter-input"
            placeholder="Name this filter..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                saveFilter(e.target.value.trim(), {
                  contentType: 'all',
                  status: 'all',
                  dateRange: 'all',
                  search: '',
                })
                addToast('Filter saved: ' + e.target.value.trim(), 'success')
                e.target.value = ''
              }
            }}
          />
          <button
            className="cmcc-save-filter-btn"
            onClick={() => {
              const input = document.querySelector('.cmcc-save-filter-input')
              if (input && input.value.trim()) {
                saveFilter(input.value.trim(), {
                  contentType: 'all',
                  status: 'all',
                  dateRange: 'all',
                  search: '',
                })
                addToast('Filter saved: ' + input.value.trim(), 'success')
                input.value = ''
              }
            }}
          >
            + Save Filter
          </button>
          <button
            className="cmcc-save-filter-btn"
            onClick={() =>
              onAiEvaluate(queueItems[0]?._id || queueItems[0]?.id)
            }
            disabled={
              aiConfig.engine === 'none' ||
              queueItems.length === 0 ||
              !!aiEvaluatingId
            }
            title={
              aiConfig.engine === 'none'
                ? 'Enable an AI engine in Settings first'
                : 'Evaluate with AI'
            }
          >
            <Bot size={16} style={{ display: 'inline' }} /> AI Eval
          </button>
          <button
            className="cmcc-shortcuts-btn"
            onClick={() => setShowShortcuts((p) => !p)}
            title="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Search size={16} color="#888" />
        <input
          type="text"
          placeholder="Search by title or author..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 4,
            border: '1px solid #ddd',
            fontSize: '0.85rem',
            width: 240,
          }}
        />
      </div>

      <QueueTable
        items={paginatedItems}
        onBulkAction={(action, ids) => {
          if (['reject', 'spam', 'defer'].includes(action)) {
            setConfirmAction({ action, ids })
            return
          }
          onBulkAction(action, ids)
        }}
        onItemAction={handleItemAction}
        onViewItem={onViewItem}
        filters={filters}
        onFilterChange={(newFilters) => onFilterChange(newFilters)}
        isLoading={queueLoading}
        totalCount={queueItems.length}
        page={safePage}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={onPerPageChange}
        onSearch={setSearchQuery}
      />

      {confirmAction && (
        <ConfirmationModal
          open={!!confirmAction}
          title={`Confirm ${confirmAction.action}`}
          message={`Are you sure you want to ${confirmAction.action} this item?`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={() => {
            if (confirmAction.ids) {
              onBulkAction(confirmAction.action, confirmAction.ids)
            } else {
              onItemAction(confirmAction.action, confirmAction.itemId)
            }
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* AI Evaluation Result */}
      {(aiEvaluationResult || aiEvaluationError || aiEvaluatingId) && (
        <div className="cmcc-card" style={{ marginTop: 16, padding: 16 }}>
          <h3 className="cmcc-card-title">
            <Bot size={16} style={{ display: 'inline' }} /> AI Moderation
          </h3>
          <AiEvaluationResult
            result={aiEvaluationResult}
            isLoading={
              !!aiEvaluatingId && !aiEvaluationResult && !aiEvaluationError
            }
            error={aiEvaluationError}
            onReEvaluate={
              !evaluatedItemId || aiEvaluatingId
                ? undefined
                : () => onAiEvaluate(evaluatedItemId)
            }
          />
        </div>
      )}
    </div>
  )
}
