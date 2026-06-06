import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

/**
 * CMCC Wix App Entry Point
 *
 * Initializes the CMCC moderation dashboard as a Wix dashboard app.
 * Wix provides React and ReactDOM via their CDN (externals in webpack).
 * The app mounts into the Wix dashboard iframe container.
 *
 * Authentication is handled by Wix's built-in session via iframe hash params.
 * This can be upgraded to use @wix/sdk when SDK-level integration is needed
 * (see README.md for migration notes).
 */

const WIX_APP_CONTAINER_ID = 'cmcc-wix-app-root'

/**
 * Attempts to base64-decode a string.
 * Wix instance IDs are base64-encoded, so a successful decode is a
 * basic sanity check before passing the value downstream.
 *
 * @param {string} str - The base64-encoded string to decode.
 * @returns {string|null} The decoded string, or null if decoding fails.
 */
function tryBase64Decode(str) {
  try {
    const decoded = window.atob(str)
    // atob can succeed on non-base64 input in some environments, but
    // combined with the JSON.parse check below it provides sufficient
    // validation for Wix instance tokens.
    return decoded
  } catch {
    return null
  }
}

/**
 * Validates a Wix instance parameter.
 *
 * Wix instance IDs passed via iframe hash params are base64-encoded
 * JSON blobs containing instance metadata (site ID, app ID, etc.).
 * This function attempts to decode and parse them to confirm validity.
 *
 * @param {string} instance - The instance parameter from the URL hash.
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
function validateWixInstance(instance) {
  if (!instance || typeof instance !== 'string') {
    return { valid: false, error: 'Instance is missing or not a string' }
  }

  const decoded = tryBase64Decode(instance)
  if (!decoded) {
    return { valid: false, error: 'Instance is not valid base64' }
  }

  try {
    const data = JSON.parse(decoded)
    return { valid: true, data }
  } catch {
    return {
      valid: false,
      error: 'Instance decoded but is not valid JSON',
    }
  }
}

/**
 * Validates the Wix token format.
 *
 * Wix authentication tokens are non-empty strings with a minimum
 * length and no whitespace. This is a lightweight sanity check — the
 * backend is responsible for full cryptographic verification.
 *
 * @param {string} token - The token parameter from the URL hash.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or not a string' }
  }
  if (token.length < 10) {
    return { valid: false, error: 'Token appears truncated or malformed' }
  }
  if (/\s/.test(token)) {
    return { valid: false, error: 'Token must not contain whitespace' }
  }
  return { valid: true }
}

/**
 * Parses the Wix context from the iframe URL fragment (hash params).
 *
 * In a Wix dashboard app embedded via iframe, Wix passes site context
 * through URL hash parameters including:
 *   - `instance`    – base64-encoded JSON with instance metadata
 *   - `token`       – authentication / session token for API calls
 *   - `siteOwnerId` – the Wix site owner's identifier (optional)
 *
 * Each parameter is validated where possible, and the result includes
 * both the raw values and validation metadata so callers can decide
 * how to handle degraded states.
 *
 * @returns {{
 *   instance: string,
 *   token: string,
 *   siteOwnerId: string,
 *   isValid: boolean,
 *   errors: string[]
 * }}
 */
function getWixContext() {
  try {
    const hashParams = new URLSearchParams(
      window.location.hash.replace('#', '?'),
    )
    const instance = hashParams.get('instance') || ''
    const token = hashParams.get('token') || ''
    const siteOwnerId = hashParams.get('siteOwnerId') || ''

    const errors = []

    // Validate instance parameter
    const instanceValidation = validateWixInstance(instance)
    if (!instanceValidation.valid) {
      errors.push(`Invalid instance: ${instanceValidation.error}`)
    }

    // Validate token parameter
    const tokenValidation = validateToken(token)
    if (!tokenValidation.valid) {
      errors.push(`Invalid token: ${tokenValidation.error}`)
    }

    // Check for missing required parameters
    if (!instance) {
      errors.push('Missing required parameter: instance')
    }
    if (!token) {
      errors.push('Missing required parameter: token')
    }

    // siteOwnerId is optional; just warn if absent
    if (!siteOwnerId) {
      console.warn(
        '[CMCC] Optional parameter "siteOwnerId" is missing. ' +
          'Some features may be limited.',
      )
    }

    const isValid = errors.length === 0

    if (!isValid) {
      console.warn('[CMCC] Wix context validation failed:', errors)
    }

    return { instance, token, siteOwnerId, isValid, errors }
  } catch (err) {
    console.error('[CMCC] Failed to parse Wix context:', err.message)
    return {
      instance: '',
      token: '',
      siteOwnerId: '',
      isValid: false,
      errors: [`Failed to parse URL hash: ${err.message}`],
    }
  }
}

/**
 * Resolves the CMCC backend API URL.
 *
 * Priority order:
 *   1. localStorage override (set via the Settings UI at runtime)
 *   2. `CMCC_API_URL` environment variable (build-time configuration)
 *   3. Sensible fallback for local development
 *
 * @returns {string} The resolved backend URL.
 */
function getBackendUrl() {
  try {
    const stored = window.localStorage.getItem('cmcc_backend_url')
    if (stored) {
      console.log('[CMCC] Using backend URL from localStorage:', stored)
      return stored
    }
  } catch {
    // localStorage may not be available in all embed contexts
    // (e.g. sandboxed iframes). Silently fall through.
  }

  const envUrl = process.env.CMCC_API_URL
  if (envUrl) {
    console.log('[CMCC] Using backend URL from environment:', envUrl)
    return envUrl
  }

  console.log('[CMCC] Using default backend URL: http://localhost:3000/api')
  return 'http://localhost:3000/api'
}

/**
 * Initializes and mounts the React application.
 *
 * Reads the Wix context from the iframe URL hash, resolves the backend
 * URL, and renders the App component into the designated container.
 */
function init() {
  const wixContext = getWixContext()
  const backendUrl = getBackendUrl()

  console.log('[CMCC] Initializing app', {
    isValid: wixContext.isValid,
    hasToken: !!wixContext.token,
    backendUrl,
  })

  const container = document.getElementById(WIX_APP_CONTAINER_ID)
  if (!container) {
    console.error(
      `[CMCC] Container #${WIX_APP_CONTAINER_ID} not found. ` +
        'Ensure the app is mounted in a Wix dashboard iframe.',
    )
    return
  }

  const root = createRoot(container)
  root.render(<App wixContext={wixContext} backendUrl={backendUrl} />)
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
