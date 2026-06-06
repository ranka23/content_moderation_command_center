import React from 'react'
import { render } from 'react-dom'
import App from './App'
import './styles.css'

const root = document.getElementById('app')

if (root) {
  render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    root,
  )
} else {
  console.error(
    'CMCC Shopify: Root element #app not found. Ensure the app is mounted correctly.',
  )
}
