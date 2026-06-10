import { useState, useCallback } from 'react'

/**
 * Hook for managing the moderation queue in Storyblok.
 * Handles fetching, actions, bulk operations, and AI evaluation.
 */
export function useQueue({ apiEndpoint, apiHeaders, addToast }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiEvalResults, setAiEvalResults] = useState({})
  const [aiEvalLoading, setAiEvalLoading] = useState(null)

  const fetchItems = useCallback(async () => {
    if (!apiEndpoint) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiEndpoint}/api/queue`, {
        headers: apiHeaders(),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CMCC] Queue fetch failed:', err)
      setError('Failed to load queue items.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, apiHeaders])

  const handleAction = useCallback(
    async (itemId, action, moderatorId = 'storyblok-mod') => {
      if (!apiEndpoint) return
      try {
        const res = await fetch(
          `${apiEndpoint}/api/queue/${encodeURIComponent(String(itemId))}/moderate`,
          {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ action, moderatorId }),
          },
        )
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const updated = await res.json()
        setItems((prev) =>
          prev.map((i) =>
            (i.id || i.originalId) === itemId
              ? { ...i, status: updated.status || action }
              : i,
          ),
        )
        addToast(`Item ${action}d successfully`)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CMCC] Action failed:', err)
        addToast(`Failed to ${action} item`, 'error')
      }
    },
    [apiEndpoint, apiHeaders, addToast],
  )

  const handleBulkAction = useCallback(
    async (action, ids) => {
      if (!apiEndpoint || !ids.length) return
      try {
        const res = await fetch(`${apiEndpoint}/api/queue/bulk`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ action, ids, moderatorId: 'storyblok-mod' }),
        })
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        await fetchItems()
        addToast(`Bulk ${action} completed for ${ids.length} items`)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CMCC] Bulk action failed:', err)
        addToast(`Bulk action failed`, 'error')
      }
    },
    [apiEndpoint, apiHeaders, addToast, fetchItems],
  )

  const handleEvaluate = useCallback(
    async (itemId, content) => {
      if (!apiEndpoint) return
      setAiEvalLoading(itemId)
      try {
        const res = await fetch(`${apiEndpoint}/api/ai/evaluate`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ content, itemId }),
        })
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setAiEvalResults((prev) => ({ ...prev, [itemId]: data }))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CMCC] AI eval failed:', err)
        addToast('AI evaluation failed', 'error')
      } finally {
        setAiEvalLoading(null)
      }
    },
    [apiEndpoint, apiHeaders, addToast],
  )

  return {
    items,
    loading,
    error,
    aiEvalResults,
    aiEvalLoading,
    fetchItems,
    handleAction,
    handleBulkAction,
    handleEvaluate,
  }
}
