import { useState, useCallback } from 'react'

export interface SavedFilter {
  name: string
  filters: Record<string, unknown>
}

export interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[]
  saveFilter: (name: string, filters: Record<string, unknown>) => void
  deleteSavedFilter: (name: string) => void
}

const STORAGE_PREFIX = 'cmcc-saved-filters-'

function loadFilters(key: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SavedFilter[]
  } catch {
    return []
  }
}

function persistFilters(key: string, filters: SavedFilter[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(filters))
  } catch {
    // localStorage may be full or unavailable; silently ignore
  }
}

/**
 * Hook for managing saved filters for a given page/context.
 * Persists filters in localStorage under `cmcc-saved-filters-<key>`.
 */
export function useSavedFilters(
  storageKey: string,
  _currentFilters: Record<string, unknown>,
): UseSavedFiltersReturn {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() =>
    loadFilters(storageKey),
  )

  const saveFilter = useCallback(
    (name: string, filters: Record<string, unknown>) => {
      setSavedFilters((prev) => {
        const existing = prev.find((f) => f.name === name)
        let updated: SavedFilter[]
        if (existing) {
          updated = prev.map((f) => (f.name === name ? { ...f, filters } : f))
        } else {
          updated = [...prev, { name, filters }]
        }
        persistFilters(storageKey, updated)
        return updated
      })
    },
    [storageKey],
  )

  const deleteSavedFilter = useCallback(
    (name: string) => {
      setSavedFilters((prev) => {
        const updated = prev.filter((f) => f.name !== name)
        persistFilters(storageKey, updated)
        return updated
      })
    },
    [storageKey],
  )

  return { savedFilters, saveFilter, deleteSavedFilter }
}

export default useSavedFilters
