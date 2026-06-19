import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from '@cmcc/ui'
import App from './App'
import './App.css'

const container = document.getElementById('cmcc-app')

if (container) {
  const root = ReactDOM.createRoot(container)
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
