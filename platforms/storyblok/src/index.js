import { ErrorBoundary } from '@cmcc/ui'
import { StoryblokApp } from '@storyblok/app-sdk'
import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App'
import './styles.css'

/**
 * Initialize the CMCC Storyblok app.
 *
 * Connects to the Storyblok SDK for auth and space context,
 * then mounts the React moderation dashboard into the iframe.
 */
async function init() {
  const container = document.getElementById('cmcc-app')

  if (!container) {
    // eslint-disable-next-line no-console
    console.error('[CMCC] Mount container #cmcc-app not found in the DOM')
    return
  }

  // Show a loading state while the SDK initializes
  container.innerHTML =
    '<div class="cmcc-storyblok-app cmcc-loading">' +
    '  <div class="cmcc-loading-spinner"></div>' +
    '  <p>Loading CMCC Moderation Dashboard...</p>' +
    '</div>'

  try {
    // Initialize the Storyblok App SDK
    const sdk = new StoryblokApp({
      // The SDK auto-detects the parent iframe context
    })

    // Authenticate and get space / user context
    const context = await sdk.getContext()

    // eslint-disable-next-line no-console
    console.log(
      '[CMCC] Storyblok SDK initialized for space:',
      context.space?.id,
    )

    // Mount the React application
    const root = createRoot(container)
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App
            sdk={sdk}
            space={context.space}
            user={context.user}
            accessToken={context.accessToken}
          />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[CMCC] Failed to initialize Storyblok SDK:', error)

    container.innerHTML =
      '<div class="cmcc-storyblok-app cmcc-error">' +
      '  <h2>CMCC Moderation Dashboard</h2>' +
      '  <p>Failed to connect to Storyblok. Please ensure this app ' +
      'is properly configured and you have the necessary permissions.</p>' +
      '  <button onclick="window.location.reload()">Retry</button>' +
      '</div>'
  }
}

// Wait for the DOM to be ready before booting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
