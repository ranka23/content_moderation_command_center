/**
 * API fetch helper for the CMCC WordPress plugin.
 *
 * Automatically attaches the WP REST nonce and JSON content-type header.
 * On a 403 with `rest_cookie_invalid_nonce`, attempts a nonce refresh via
 * the WordPress heartbeat API and reloads the page.
 *
 * @param {string} path   - REST API path relative to the CMCC namespace.
 * @param {object} [options] - Additional fetch options (method, body, headers, etc.).
 * @returns {Promise<object>} Parsed JSON response.
 * @throws {object} Error object with `message` and optional `code`.
 */
export async function apiFetch(path, options = {}) {
  const url = (window.cmccData?.restUrl || '/wp-json/cmcc/v1/') + path
  const headers = {
    'X-WP-Nonce': window.cmccData?.nonce || '',
    'Content-Type': 'application/json',
    ...options.headers,
  }
  return fetch(url, { ...options, headers }).then((res) => {
    // B5 Fix: Refresh nonce if we get a 403 with rest_cookie_invalid_nonce
    if (res.status === 403) {
      return res.json().then((err) => {
        if (err?.code === 'rest_cookie_invalid_nonce') {
          // Attempt nonce refresh via heartbeat API
          if (window.wp?.heartbeat?.connectNow) {
            window.wp.heartbeat.connectNow()
          }
          // Fetch a fresh nonce from the REST API
          fetch(
            window.cmccData?.restUrl
              ? window.cmccData.restUrl.replace('cmcc/v1/', '') +
                  'wp/v2/users/me'
              : '/wp-json/wp/v2/users/me',
            {
              headers: {
                'X-WP-Nonce': '',
                'Content-Type': 'application/json',
              },
            },
          )
            .then((r) => {
              const newNonce = r.headers.get('X-WP-Nonce') || ''
              if (newNonce) {
                window.cmccData = { ...window.cmccData, nonce: newNonce }
              }
              return r.json()
            })
            .then(() => {
              // Retry the original request with the new nonce
              window.location.reload()
            })
            .catch(() => {})
        }
        return Promise.reject(err)
      })
    }
    if (!res.ok) {
      return res.json().then((err) => Promise.reject(err))
    }
    return res.json()
  })
}
