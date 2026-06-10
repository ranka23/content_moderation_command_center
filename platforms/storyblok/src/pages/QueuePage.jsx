import React, { useEffect, useCallback } from 'react'
import { QueueTable } from '@cmcc/ui'

export default function QueuePage({ queue, theme }) {
  const { saveFilter } = React.useMemo(() => ({ saveFilter: () => {} }), [])

  useEffect(() => {
    queue.fetchItems()
  }, [queue])

  const handleSaveFilter = useCallback(() => {
    const name = prompt('Filter name:')
    if (name) saveFilter(name, {})
  }, [saveFilter])

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          📋 Moderation Queue
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSaveFilter}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            💾 Save Filter
          </button>
          <span
            style={{
              padding: '6px 12px',
              background: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            {queue.items.length} items
          </span>
        </div>
      </div>

      {queue.loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          <p>Loading queue...</p>
        </div>
      )}

      {queue.error && (
        <div
          style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '16px',
          }}
        >
          ❌ {queue.error}
        </div>
      )}

      {!queue.loading && !queue.error && (
        <QueueTable
          items={queue.items}
          onItemAction={queue.handleAction}
          onBulkAction={queue.handleBulkAction}
          onEvaluate={queue.handleEvaluate}
          aiEvalResults={queue.aiEvalResults}
          aiEvalLoading={queue.aiEvalLoading}
          theme={theme}
        />
      )}
    </div>
  )
}
