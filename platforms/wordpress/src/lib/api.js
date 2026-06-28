/**
 * API fetch helper for the CMCC WordPress plugin.
 *
 * Automatically attaches the WP REST nonce and JSON content-type header.
 * On a 403 with `rest_cookie_invalid_nonce`, attempts a nonce refresh via
 * the WordPress heartbeat API and retries the original request with the
 * fresh nonce.
 *
 * Uses a mutex pattern to prevent multiple simultaneous nonce refresh
 * requests when several API calls fail with 403 at the same time.
 *
 * @param {string} path   - REST API path relative to the CMCC namespace.
 * @param {object} [options] - Additional fetch options (method, body, headers, etc.).
 * @returns {Promise<object>} Parsed JSON response.
 * @throws {object} Error object with `message` and optional `code`.
 */

// ── Nonce refresh mutex ─────────────────────────────────────────────────
let nonceRefreshPromise = null

/**
 * Refresh the WordPress REST nonce.
 * Uses a mutex so only one refresh call is in-flight at a time.
 *
 * @returns {Promise<string>} The fresh nonce value.
 */
async function refreshNonce() {
  if (nonceRefreshPromise) {
    // Another refresh is already in progress — wait for it
    return nonceRefreshPromise
  }

  nonceRefreshPromise = (async () => {
    // Attempt nonce refresh via heartbeat API
    if (window.wp?.heartbeat?.connectNow) {
      window.wp.heartbeat.connectNow()
    }

    const nonceUrl = window.cmccData?.restUrl
      ? window.cmccData.restUrl.replace('cmcc/v1/', '') + 'wp/v2/users/me'
      : '/wp-json/wp/v2/users/me'

    const nonceRes = await fetch(nonceUrl, {
      headers: {
        'X-WP-Nonce': '',
        'Content-Type': 'application/json',
      },
    })
    const newNonce = nonceRes.headers.get('X-WP-Nonce') || ''
    if (newNonce) {
      window.cmccData = { ...window.cmccData, nonce: newNonce }
    }
    return newNonce || window.cmccData?.nonce || ''
  })()

  try {
    return await nonceRefreshPromise
  } finally {
    nonceRefreshPromise = null
  }
}

export async function apiFetch(path, options = {}) {
  const url = (window.cmccData?.restUrl || '/wp-json/cmcc/v1/') + path
  const headers = {
    'X-WP-Nonce': window.cmccData?.nonce || '',
    'Content-Type': 'application/json',
    ...options.headers,
  }
  return fetch(url, { ...options, headers }).then(async (res) => {
    // B5 Fix: Refresh nonce if we get a 403 with rest_cookie_invalid_nonce
    if (res.status === 403) {
      const err = await res.json()
      if (err?.code === 'rest_cookie_invalid_nonce') {
        try {
          const newNonce = await refreshNonce()
          // Retry the original request with the new nonce
          headers['X-WP-Nonce'] = newNonce || ''
          const retryRes = await fetch(url, { ...options, headers })
          if (!retryRes.ok) {
            const retryErr = await retryRes.json()
            return Promise.reject(retryErr)
          }
          return retryRes.json()
        } catch {
          return Promise.reject(err)
        }
      }
      return Promise.reject(err)
    }
    if (!res.ok) {
      return res.json().then((err) => Promise.reject(err))
    }
    return res.json()
  })
}
