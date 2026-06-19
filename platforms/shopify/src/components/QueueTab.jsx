/**
 * QueueTab - Queue tab with inline moderation, quick filters, saved filters,
 * and item detail panel integration.
 */

import React, { useState } from 'react'
import {
  Card,
  DataTable,
  Button,
  Select,
  TextField,
  Badge,
  Checkbox,
  EmptyState,
  Popover,
  Tag,
} from '@shopify/polaris'
import ItemDetailPanel from './ItemDetailPanel'
import { AiEvaluationResult, SkeletonTable } from '@cmcc/ui'

/**
 * @param {Object} props
 * @param {Array} props.queueItems - Full list of queue items
 * @param {Function} props.handleModerate - Moderate action handler
 * @param {Object} props.queueFilters - Current filter values
 * @param {Function} props.setQueueFilters - Filter setter
 * @param {Array} props.contentTypeOptions - Available content types
 * @param {Array} props.statusOptions - Available status options
 * @param {Array} props.savedFilters - Saved filters
 * @param {Function} props.saveFilter - Save current filter with a name
 * @param {Function} props.deleteSavedFilter - Delete a saved filter by ID
 * @param {Object} props.aiConfig - AI moderation configuration
 * @param {string|null} props.aiEvaluatingId - Currently evaluating item ID
 * @param {Object|null} props.aiEvaluationResult - AI evaluation result
 * @param {string|null} props.aiEvaluationError - AI evaluation error
 * @param {Function} props.onAiEvaluate - AI evaluate handler
 * @param {string} props.moderatorId - Current moderator ID
 * @param {string} props.moderatorName - Current moderator display name
 */
export default function QueueTab({
  queueItems,
  handleModerate,
  handleBulkAction,
  queueFilters,
  setQueueFilters,
  contentTypeOptions,
  statusOptions,
  savedFilters,
  saveFilter,
  deleteSavedFilter,
  aiConfig,
  aiEvaluatingId,
  aiEvaluationResult,
  aiEvaluationError,
  onAiEvaluate,
  moderatorId,
  moderatorName,
  isLoading,
}) {
  const [selectedDetailItem, setSelectedDetailItem] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [evaluatedItemId, setEvaluatedItemId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 25
  const [filterNameInput, setFilterNameInput] = useState('')
  const [filterPopoverActive, setFilterPopoverActive] = useState(false)

  // Track which item was evaluated so we can re-evaluate
  const handleAiEval = (itemId) => {
    setEvaluatedItemId(itemId)
    onAiEvaluate(itemId)
  }

  // ── Filtered items ──────────────────────────────────
  const filteredItems = queueItems.filter((item) => {
    if (queueFilters.status !== 'all' && item.status !== queueFilters.status)
      return false
    if (
      queueFilters.contentType !== 'all' &&
      item.contentType !== queueFilters.contentType
    )
      return false
    if (queueFilters.riskMin !== '') {
      const minRisk = parseFloat(queueFilters.riskMin)
      if (
        !isNaN(minRisk) &&
        (item.riskScore === null || item.riskScore < minRisk)
      )
        return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const title = (item.title || '').toLowerCase()
      const excerpt = (item.excerpt || item.contentSnippet || '').toLowerCase()
      const author = (item.author_name || item.author || '').toLowerCase()
      if (!title.includes(q) && !excerpt.includes(q) && !author.includes(q))
        return false
    }
    return true
  })

  const hasActiveFilters =
    Object.values(queueFilters).some((v) => v !== 'all' && v !== '') ||
    searchQuery.trim() !== ''
  const items =
    filteredItems.length > 0 || hasActiveFilters ? filteredItems : queueItems

  // ── Pagination ────────────────────────────────────────
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, totalItems)
  const paginatedItems = items.slice(startIndex, endIndex)

  // Reset to page 1 when filters or search change
  // Using a shared handler pattern instead of cascading setState in effect
  const handleSearchChange = (v) => {
    setSearchQuery(v)
    setPage(1)
  }
  const handleFilterChange = (updater) => {
    setQueueFilters(updater)
    setPage(1)
  }

  // ── Filter bar ──────────────────────────────────────
  const filterBar = (
    <div className="cmcc-queue-filters">
      <div className="cmcc-queue-filters-row">
        <div className="cmcc-filter-select">
          <Select
            label="Status"
            value={queueFilters.status}
            onChange={(v) =>
              handleFilterChange((prev) => ({ ...prev, status: v }))
            }
            options={statusOptions}
          />
        </div>
        <div className="cmcc-filter-select">
          <Select
            label="Content type"
            value={queueFilters.contentType}
            onChange={(v) =>
              handleFilterChange((prev) => ({ ...prev, contentType: v }))
            }
            options={contentTypeOptions}
          />
        </div>
        <div className="cmcc-filter-select">
          <TextField
            label="Min risk score"
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={queueFilters.riskMin}
            onChange={(v) =>
              handleFilterChange((prev) => ({ ...prev, riskMin: v }))
            }
            autoComplete="off"
          />
        </div>
        <div className="cmcc-filter-select">
          <TextField
            label="Search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by title, content, or author..."
            autoComplete="off"
            clearButton
            onClearButtonClick={() => handleSearchChange('')}
          />
        </div>
        <div className="cmcc-filter-actions">
          <Popover
            active={filterPopoverActive}
            activator={
              <Button
                disclosure="down"
                onClick={() => setFilterPopoverActive(!filterPopoverActive)}
              >
                Save filter
              </Button>
            }
            onClose={() => setFilterPopoverActive(false)}
          >
            <div className="cmcc-save-filter-popover">
              <TextField
                label="Filter name"
                value={filterNameInput}
                onChange={setFilterNameInput}
                autoComplete="off"
                placeholder="e.g. High risk spam"
              />
              <div className="cmcc-save-filter-actions">
                <Button
                  primary
                  onClick={() => {
                    saveFilter(filterNameInput.trim(), {
                      status: queueFilters.status,
                      contentType: queueFilters.contentType,
                      riskMin: queueFilters.riskMin || '',
                    })
                    setFilterNameInput('')
                    setFilterPopoverActive(false)
                  }}
                  disabled={!filterNameInput.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </Popover>
          {(queueFilters.status !== 'all' ||
            queueFilters.contentType !== 'all' ||
            queueFilters.riskMin !== '') && (
            <Button
              onClick={() => {
                handleFilterChange({
                  status: 'all',
                  contentType: 'all',
                  riskMin: '',
                })
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Saved filter tags */}
      {savedFilters.length > 0 && (
        <div className="cmcc-saved-filters">
          <span className="cmcc-saved-filters-label">Saved filters:</span>
          {savedFilters.map((f) => (
            <Tag
              key={f.id}
              onClick={() => setQueueFilters(f.filters)}
              onRemove={() => deleteSavedFilter(f.id)}
            >
              {f.name}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )

  // ── Loading state ────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        {filterBar}
        <Card>
          <SkeletonTable rows={5} columns={7} />
        </Card>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        {filterBar}
        <Card>
          <EmptyState
            heading="No items in queue"
            action={{ content: 'Refresh' }}
          >
            <p>All content has been moderated. Check back later.</p>
          </EmptyState>
        </Card>
      </>
    )
  }

  // ── Bulk selection ────────────────────────────────────
  const allDisplayedSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id))
  const someSelected = selectedIds.length > 0 && !allDisplayedSelected

  function handleSelectAll() {
    if (allDisplayedSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((item) => item.id))
    }
  }

  function handleSelectItem(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  async function handleBulkActionClick(action) {
    await handleBulkAction(action, selectedIds)
    setSelectedIds([])
  }

  // ── Table rows ──────────────────────────────────────
  const rows = paginatedItems.map((item) => [
    <Checkbox
      key={`select-${item.id}`}
      label={item.id}
      labelHidden
      checked={selectedIds.includes(item.id)}
      onChange={() => handleSelectItem(item.id)}
    />,
    item.id,
    item.contentType,
    item.contentSnippet
      ? item.contentSnippet.substring(0, 60)
      : item.excerpt
        ? item.excerpt.substring(0, 60)
        : '-',
    item.author_name || item.author || '-',
    <Badge
      key={`status-${item.id}`}
      status={
        item.status === 'pending'
          ? 'warning'
          : item.status === 'approved'
            ? 'success'
            : 'critical'
      }
    >
      {item.status}
    </Badge>,
    item.riskScore !== null && item.riskScore !== undefined
      ? `${(item.riskScore * 100).toFixed(0)}%`
      : item.spam_score !== null && item.spam_score !== undefined
        ? `${(item.spam_score * 100).toFixed(0)}%`
        : '-',
    item.assigned_to || '—',
    <div key={`actions-${item.id}`} className="cmcc-actions">
      <Button size="slim" onClick={() => handleModerate(item.id, 'approve')}>
        Approve
      </Button>
      <Button
        size="slim"
        destructive
        onClick={() => handleModerate(item.id, 'reject')}
      >
        Reject
      </Button>
      <Button size="slim" onClick={() => handleModerate(item.id, 'spam')}>
        Spam
      </Button>
      <Button size="slim" plain onClick={() => setSelectedDetailItem(item)}>
        Details
      </Button>
      <Button
        size="slim"
        plain
        loading={aiEvaluatingId === item.id}
        disabled={aiConfig.engine === 'none'}
        onClick={() => handleAiEval(item.id)}
      >
        AI Eval
      </Button>
    </div>,
  ])

  return (
    <>
      {filterBar}
      <Card>
        <div className="cmcc-tab-header">
          <h2>Moderation Queue</h2>
        </div>
        {selectedIds.length > 0 && (
          <div className="cmcc-bulk-action-bar">
            <span className="cmcc-bulk-action-count">
              {selectedIds.length} selected
            </span>
            <div className="cmcc-bulk-action-buttons">
              <Button onClick={() => handleBulkActionClick('approve')}>
                Approve Selected
              </Button>
              <Button
                destructive
                onClick={() => handleBulkActionClick('reject')}
              >
                Reject Selected
              </Button>
              <Button onClick={() => handleBulkActionClick('spam')}>
                Mark as Spam
              </Button>
            </div>
          </div>
        )}
        <DataTable
          columnContentTypes={[
            'text',
            'text',
            'text',
            'text',
            'text',
            'text',
            'numeric',
            'text',
            'text',
          ]}
          headings={[
            <div
              key="select-all-heading"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Checkbox
                label="Select all"
                checked={allDisplayedSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
              />
            </div>,
            'ID',
            'Type',
            'Content',
            'Author',
            'Status',
            'Risk',
            'Assigned To',
            'Actions',
          ]}
          rows={rows}
        />

        {/* ── Pagination ───────────────────────────────── */}
        {totalItems > perPage && (
          <div className="cmcc-pagination">
            <span className="cmcc-pagination-info">
              Showing {startIndex + 1}&ndash;{endIndex} of {totalItems} items
            </span>
            <div className="cmcc-pagination-buttons">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* AI Evaluation Result */}
      {(aiEvaluationResult || aiEvaluationError || aiEvaluatingId) && (
        <Card>
          <Card.Section>
            <AiEvaluationResult
              result={aiEvaluationResult}
              isLoading={
                !!aiEvaluatingId && !aiEvaluationResult && !aiEvaluationError
              }
              error={aiEvaluationError}
              onReEvaluate={
                !evaluatedItemId || aiEvaluatingId
                  ? undefined
                  : () => handleAiEval(evaluatedItemId)
              }
            />
          </Card.Section>
        </Card>
      )}

      {/* Detail panel slide-out */}
      {selectedDetailItem && (
        <ItemDetailPanel
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          moderatorId={moderatorId}
          moderatorName={moderatorName}
        />
      )}
    </>
  )
}
