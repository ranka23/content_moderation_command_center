import { useState, useCallback } from 'react'

export function useActivityLog({ apiEndpoint, apiHeaders }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLog = useCallback(async () => {
    if (!apiEndpoint) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiEndpoint}/api/activity`, {
        headers: apiHeaders(),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data.entries || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CMCC] Activity log fetch failed:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, apiHeaders])

  return { items, loading, fetchLog }
}
