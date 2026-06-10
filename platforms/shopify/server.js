/**
 * CMCC Shopify App Server
 *
 * Serves the built Shopify app and handles OAuth, session management,
 * API proxying, and the CMCC backend (database, routes, services).
 *
 * Required environment variables (see .env.example):
 *   SHOPIFY_API_KEY      – Shopify app API key
 *   SHOPIFY_API_SECRET   – Shopify app API secret
 *   SHOPIFY_APP_URL      – Public HTTPS URL of this server
 *   SCOPES               – Comma-separated OAuth scopes
 */

require('dotenv').config()

const crypto = require('crypto')
const express = require('express')
const path = require('path')
const http = require('http')
const { WebSocketServer } = require('ws')

const PORT = process.env.PORT || 3001
const API_KEY = process.env.SHOPIFY_API_KEY
const SCOPES =
  process.env.SCOPES ||
  'read_products,write_products,read_customers,read_content,write_content'
const APP_URL = process.env.SHOPIFY_APP_URL || `http://localhost:${PORT}`

// ── CMCC Backend ───────────────────────────────────────────────────────────
const { createApp } = require('./server')

// Create the CMCC backend application
const cmccApp = createApp()

// ── Session Store (placeholder) ────────────────────────────────────────────
// Replace with a persistent store (Redis, DB) for production.
const sessions = new Map()

function getSession(shop) {
  return sessions.get(shop)
}

function setSession(shop, data) {
  sessions.set(shop, data)
}

// ── Express App ────────────────────────────────────────────────────────────

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── CORS ───────────────────────────────────────────────────────────────────
// Shopify admin embeds the app in an iframe; allow credentialed requests
// from Shopify's domains.

app.use((_req, res, next) => {
  res.set('X-Frame-Options', 'ALLOWALL')
  res.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;",
  )
  next()
})

// ── Static Assets ──────────────────────────────────────────────────────────
// Serve the webpack-built app (dist/app.js, dist/app.css) alongside the
// HTML shell that loads Polaris & React from Shopify's CDN.

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CMCC Content Moderation</title>
  <!-- Polaris styles loaded from Shopify's CDN (not bundled) -->
  <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@latest/build/esm/styles.css" />
  <link rel="stylesheet" href="/app.css" />
</head>
<body>
  <div id="app"></div>
  <!-- React, ReactDOM, Polaris, and App Bridge loaded as externals -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@shopify/polaris@latest/build/esm/index.js"></script>
  <script src="https://unpkg.com/@shopify/app-bridge-react@latest/build/index.js"></script>
  <script src="/app.js"></script>
</body>
</html>`)
})

// ── Shopify OAuth Flow (Placeholder) ───────────────────────────────────────
// Full OAuth implementation should follow Shopify's OAuth docs:
// https://shopify.dev/docs/apps/auth/oauth

app.get('/auth', (req, res) => {
  const shop = req.query.shop
  if (!shop) {
    return res.status(400).send('Missing "shop" query parameter')
  }

  // Step 1: Build the Shopify OAuth authorization URL
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${APP_URL}/auth/callback`

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${API_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`

  // Persist the nonce for verification on callback
  setSession(shop, { state, shop })

  res.redirect(authUrl)
})

app.get('/auth/callback', async (req, res) => {
  const { shop, code, state, host } = req.query

  if (!shop || !code) {
    return res.status(400).send('Missing OAuth parameters')
  }

  // Verify state (anti-CSRF)
  const session = getSession(shop)
  if (!session || session.state !== state) {
    return res.status(403).send('State mismatch – possible CSRF attack')
  }

  // Step 2: Exchange the temporary code for a permanent access token.
  // https://shopify.dev/docs/apps/auth/oauth#step-2-exchange-the-temporary-code-for-a-permanent-access-token
  //
  // const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     client_id: API_KEY,
  //     client_secret: API_SECRET,
  //     code,
  //   }),
  // })
  // const { access_token } = await tokenResponse.json()
  // setSession(shop, { ...session, accessToken: access_token })

  // Placeholder: redirect to the embedded app with host param
  const embeddedAppUrl = `${APP_URL}?shop=${shop}&host=${encodeURIComponent(host || '')}`
  res.redirect(embeddedAppUrl)
})

// ── CMCC Backend API Routes ───────────────────────────────────────────────
// Mount the CMCC backend (routes already include /api/cmcc prefix)
app.use(cmccApp)

// ── Start ──────────────────────────────────────────────────────────────────

const server = http.createServer(app)

// ── WebSocket Server ──────────────────────────────────────────────────────
// Provides real-time activity feed updates to connected clients.
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  console.log('[CMCC WS] Client connected')

  ws.on('close', () => {
    console.log('[CMCC WS] Client disconnected')
  })

  ws.on('error', (err) => {
    console.error('[CMCC WS] Error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`CMCC Shopify App server listening on http://localhost:${PORT}`)
  console.log(
    `Visit http://localhost:${PORT}/auth?shop=your-store.myshopify.com to start OAuth`,
  )
  console.log(`CMCC Backend API at http://localhost:${PORT}/api/cmcc`)
  console.log(`WebSocket server at ws://localhost:${PORT}/ws`)
})
