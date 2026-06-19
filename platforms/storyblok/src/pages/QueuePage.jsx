import React, { useEffect, useCallback, useState } from 'react'
import {
  QueueTable,
  Pagination,
  useSavedFilters,
  SkeletonTable,
  ConfirmationModal,
} from '@cmcc/ui'
import { ListChecks, Save, XCircle, Search } from 'lucide-react'

export default function QueuePage({ queue, theme, addToast }) {
  const { savedFilters: _savedFilters, saveFilter } = useSavedFilters(
    'storyblok-queue',
    {
      contentType: 'all',
      status: 'all',
      dateRange: 'all',
      search: '',
    },
  )

  useEffect(() => {
    queue.fetchItems()
  }, [queue])

  const handleSaveFilter = useCallback(() => {
    const name = prompt('Filter name:')
    if (name) saveFilter(name, {})
  }, [saveFilter])

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [confirmAction, setConfirmAction] = useState(null)

  const handleModerateWithConfirm = (action, itemId) => {
    if (['reject', 'spam', 'defer'].includes(action)) {
      setConfirmAction({ action, itemId })
      return
    }
    queue.handleAction(action, itemId)
  }

  const lowerQuery = searchQuery.toLowerCase()
  const filteredItems = queue.items.filter((item) => {
    const title = (item.title || item.name || '').toLowerCase()
    const author = (item.authorName || item.author || '').toLowerCase()
    return title.includes(lowerQuery) || author.includes(lowerQuery)
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const paginatedItems = filteredItems.slice(start, start + perPage)

  return (
    <div className="cmcc-queue-page">
      <div className="cmcc-queue-header-area">
        <h2>
          <ListChecks size={20} className="cmcc-queue-header-icon" />
          Moderation Queue
        </h2>
        <div className="cmcc-queue-header-actions">
          <button onClick={handleSaveFilter} className="cmcc-queue-header-btn">
            <Save size={14} />
            Save Filter
          </button>
          <span className="cmcc-queue-item-count">
            {filteredItems.length}
            {filteredItems.length !== queue.items.length
              ? ` / ${queue.items.length}`
              : ''}{' '}
            items
          </span>
        </div>
      </div>

      <div className="cmcc-queue-search-wrap">
        <Search size={16} className="cmcc-queue-search-icon" />
        <input
          type="text"
          placeholder="Search by title or author…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="cmcc-queue-search-input"
        />
      </div>

      {queue.loading && <SkeletonTable rows={5} columns={6} />}

      {queue.error && (
        <div className="cmcc-queue-error-banner">
          <XCircle size={16} />
          {queue.error}
        </div>
      )}

      {confirmAction && (
        <ConfirmationModal
          open={!!confirmAction}
          title={`Confirm ${confirmAction.action}`}
          message={`Are you sure you want to ${confirmAction.action} this item?`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={() => {
            queue.handleAction(confirmAction.action, confirmAction.itemId)
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {!queue.loading && !queue.error && (
        <>
          <QueueTable
            items={paginatedItems}
            onItemAction={(action, itemId) =>
              handleModerateWithConfirm(action, itemId)
            }
            onBulkAction={queue.handleBulkAction}
            onEvaluate={queue.handleEvaluate}
            aiEvalResults={queue.aiEvalResults}
            aiEvalLoading={queue.aiEvalLoading}
            theme={theme}
            onReadItem={(item) => addToast(`Item: ${item.title || item.id}`)}
            onSearch={setSearchQuery}
            onFilterChange={(newFilters) => {
              if (newFilters.search !== undefined)
                setSearchQuery(newFilters.search)
            }}
            onSort={(_field, _direction) => {}}
            sortField="date"
            sortDirection="desc"
            totalCount={queue.items.length}
            page={safePage}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={setPerPage}
            filters={{
              contentType: 'all',
              status: 'all',
              dateRange: 'all',
              search: searchQuery,
            }}
          />
          <div className="cmcc-queue-pagination-wrap">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}
    </div>
  )
}
