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
 * Authentication is handled by Wix's built-in session.
 * The app reads Wix site context to determine the instance ID
 * and backend API endpoint.
 */

const WIX_APP_CONTAINER_ID = 'cmcc-wix-app-root'

function getWixContext() {
  // In a real Wix app, Wix provides site-level context via
  // the Wix SDK. We read instance configuration from the
  // Wix dashboard embedded parameters.
  try {
    // Wix embeds a JSON config in the iframe URL fragment
    const hashParams = new URLSearchParams(
      window.location.hash.replace('#', '?'),
    )
    const instance = hashParams.get('instance') || ''
    const token = hashParams.get('token') || ''
    const siteOwnerId = hashParams.get('siteOwnerId') || ''
    return { instance, token, siteOwnerId }
  } catch {
    return { instance: '', token: '', siteOwnerId: '' }
  }
}

function getBackendUrl() {
  // The backend API URL is configurable via Wix app storage
  // or can be set as a Wix app parameter.
  // Default to a sensible fallback for development.
  try {
    const stored = window.localStorage.getItem('cmcc_backend_url')
    if (stored) return stored
  } catch {
    // localStorage may not be available in all embed contexts
  }
  // In production, this would come from Wix secrets or app settings
  return process.env.CMCC_API_URL || 'http://localhost:3000/api'
}

function init() {
  const wixContext = getWixContext()
  const backendUrl = getBackendUrl()

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
