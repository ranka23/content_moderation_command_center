/**
 * ActivityFeed - Real-time feed component showing moderation actions and notes.
 */

import React, { useState, useEffect, useCallback, startTransition } from 'react'
import { Spinner, Badge, Banner, Button } from '@shopify/polaris'

const API_BASE = '/api/cmcc'

/**
 * @param {Object} props
 * @param {number} [props.limit=20] - Number of events to fetch
 * @param {boolean} [props.compact=false] - Compact mode for embedding in tabs
 */
export default function ActivityFeed({ limit = 20, compact = false }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/activity-feed?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch activity feed')
      const data = await res.json()
      setEvents(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    startTransition(() => {
      fetchFeed()
    })
    // Poll every 15 seconds for real-time feel
    const interval = setInterval(fetchFeed, 15000)
    return () => clearInterval(interval)
  }, [fetchFeed])

  function getEventIcon(event) {
    if (event.event_type === 'note') return '📝'
    switch (event.event_action) {
      case 'approve':
        return '✅'
      case 'reject':
        return '❌'
      case 'spam':
        return '🚫'
      case 'defer':
        return '⏸️'
      case 'flag':
        return '🚩'
      default:
        return '🔔'
    }
  }

  function getEventBadge(event) {
    if (event.event_type === 'note') {
      return <Badge status="info">note</Badge>
    }
    const statusMap = {
      approve: 'success',
      reject: 'critical',
      spam: 'critical',
      defer: 'warning',
      flag: 'attention',
    }
    return (
      <Badge status={statusMap[event.event_action] || 'info'}>
        {event.event_action}
      </Badge>
    )
  }

  if (loading && events.length === 0) {
    return (
      <div className="cmcc-feed-loading">
        <Spinner accessibilityLabel="Loading feed" size="small" />
      </div>
    )
  }

  if (error) {
    return (
      <Banner status="critical" title="Feed error">
        <p>{error}</p>
        <Button onClick={fetchFeed}>Retry</Button>
      </Banner>
    )
  }

  if (events.length === 0) {
    return (
      <div className="cmcc-feed-empty">
        <p>No recent activity.</p>
      </div>
    )
  }

  return (
    <div className={`cmcc-activity-feed ${compact ? 'cmcc-feed-compact' : ''}`}>
      <div className="cmcc-feed-header">
        <span className="cmcc-feed-title">Activity Feed</span>
        <Button plain onClick={fetchFeed} loading={loading}>
          ↻
        </Button>
      </div>
      <div className="cmcc-feed-list">
        {events.map((event) => (
          <div
            key={`${event.event_type}-${event.id}`}
            className="cmcc-feed-item"
          >
            <div className="cmcc-feed-item-icon">{getEventIcon(event)}</div>
            <div className="cmcc-feed-item-content">
              <div className="cmcc-feed-item-header">
                <strong className="cmcc-feed-item-actor">
                  {event.actor_id}
                </strong>
                {getEventBadge(event)}
              </div>
              <div className="cmcc-feed-item-details">
                {event.event_type === 'note' ? (
                  <span className="cmcc-feed-note-text">
                    {event.note_text
                      ? event.note_text.substring(0, 120)
                      : 'Added a note'}
                  </span>
                ) : (
                  <span>
                    {event.event_action}d{' '}
                    {event.content_type && (
                      <span className="cmcc-feed-content-type">
                        {event.content_type}
                      </span>
                    )}
                    {event.item_title && (
                      <span className="cmcc-feed-item-title">
                        {' '}
                        &mdash; {event.item_title.substring(0, 60)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="cmcc-feed-item-time">
                {new Date(event.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
