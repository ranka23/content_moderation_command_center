import React, { useEffect } from 'react'

export default function ActivityLogPage({ activityLog }) {
  useEffect(() => {
    activityLog.fetchLog()
  }, [activityLog])

  const items = activityLog.items

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>
        📜 Activity Log
      </h2>

      {activityLog.loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Loading activity log...</p>
        </div>
      )}

      {!activityLog.loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
          <p>No activity recorded yet.</p>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.slice(0, 50).map((entry, idx) => (
            <div
              key={entry.id || idx}
              style={{
                padding: '12px 16px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>
                  {entry.actorName || entry.moderatorId || 'System'}
                </strong>
                {' — '}
                <span>
                  {entry.description || entry.action || 'Unknown action'}
                </span>
                {entry.title && (
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {' '}
                    on &quot;{entry.title}&quot;
                  </span>
                )}
              </div>
              <span
                style={{
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString()
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
