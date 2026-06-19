import React from 'react'
import { render } from 'react-dom'
import { ErrorBoundary } from '@cmcc/ui'
import App from './App'
import './styles.css'

const root = document.getElementById('app')

if (root) {
  render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
    root,
  )
} else {
  // eslint-disable-next-line no-console
  console.error(
    'CMCC Shopify: Root element #app not found. Ensure the app is mounted correctly.',
  )
}
