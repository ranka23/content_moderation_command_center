/**
 * Storyblok API fetch helper for CMCC.
 *
 * Configured via `configureApi({ endpoint, headers })` — typically called from
 * App.jsx when settings are loaded or the component mounts. After that, use
 * `apiFetch(path, options)` to make requests to the CMCC backend.
 *
 * @example
 *   import { configureApi, apiFetch } from '../lib/api'
 *   configureApi({ endpoint: 'http://localhost:3000', headers: { Authorization: 'Bearer xyz' } })
 *   const data = await apiFetch('reports/moderation-activity')
 */

let _endpoint = ''
let _headers = {}

export function configureApi({ endpoint, headers }) {
  _endpoint = endpoint || _endpoint
  _headers = headers || _headers
}

export async function apiFetch(path, options = {}) {
  const url = _endpoint
    ? `${_endpoint.replace(/\/+$/, '')}/api/${path.replace(/^\/+/, '')}`
    : path

  const headers = {
    'Content-Type': 'application/json',
    ..._headers,
    ...options.headers,
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.message || `API request failed: ${res.status}`)
  }

  // Some endpoints return CSV text, others return JSON
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/csv')) {
    return res.text()
  }

  return res.json()
}

export default apiFetch
