import { useState, useCallback } from 'react'
import { processAnalytics, getEmptyAnalytics } from '@cmcc/core'

export function useAnalytics({ apiEndpoint, apiHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    if (!apiEndpoint) {
      setData(getEmptyAnalytics())
      return
    }
    setLoading(true)
    try {
      const [eventsRes, queueRes] = await Promise.all([
        fetch(`${apiEndpoint}/api/events`, { headers: apiHeaders() }),
        fetch(`${apiEndpoint}/api/queue`, { headers: apiHeaders() }),
      ])
      if (!eventsRes.ok || !queueRes.ok)
        throw new Error('Analytics fetch failed')
      const events = await eventsRes.json()
      const queue = await queueRes.json()
      const eventsList = Array.isArray(events) ? events : events.events || []
      const queueList = Array.isArray(queue) ? queue : queue.items || []
      const processed = processAnalytics(eventsList, queueList)
      setData(processed)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CMCC] Analytics fetch failed:', err)
      setData(getEmptyAnalytics())
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, apiHeaders])

  return { data, loading, fetchAnalytics }
}
