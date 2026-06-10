/**
 * CMCC Standalone Dev Server
 *
 * Serves all platforms with proper CDN dependencies,
 * no restrictive CSP, and SDK mocks for local testing.
 *
 * Usage: node tools/dev-server.js
 *   (requires API stub on port 3000: make serve-api)
 *
 * Then open:
 *   http://localhost:4000/  → Test hub
 *   http://localhost:4000/storyblok/
 *   http://localhost:4000/wix/
 *   http://localhost:4000/shopify/
 */

const express = require('express')
const path = require('path')
const http = require('http')

const app = express()
const PORT = 4000
const API_PORT = 3000
const API_HOST = process.env.API_HOST || 'localhost'
const ROOT = path.resolve(__dirname, '..')
const DIST = (platform) => path.join(ROOT, 'platforms', platform, 'dist')

// ── Simple proxy middleware ────────────────────────────────────────
// Proxies /api/* → http://localhost:3000/api/* so any platform app
// can reach the API stub from the same origin (avoids CORS issues).
app.use('/api', (req, res) => {
  const apiPath = req.originalUrl
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: apiPath,
    method: req.method,
    headers: { ...req.headers, host: API_HOST + ':' + API_PORT },
  }
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res)
  })
  proxyReq.on('error', () =>
    res.status(502).json({ error: 'API stub unavailable on port ' + API_PORT }),
  )
  if (req.body) proxyReq.write(JSON.stringify(req.body))
  proxyReq.end()
})

// ── Serve built assets from each platform ──────────────────────────
app.use('/storyblok', express.static(DIST('storyblok')))
app.use('/wix', express.static(DIST('wix')))
app.use('/shopify', express.static(DIST('shopify')))

app.use(express.json())

// ── Storyblok standalone HTML ──────────────────────────────────────
app.get('/storyblok/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CMCC Moderation — Storyblok (Standalone)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="/storyblok/styles.css" />
  <style>
    body { margin: 0; font-family: Inter, sans-serif; background: #fff; }
    .cmcc-storyblok-app { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="cmcc-app"></div>

  <!-- Pre-set API endpoint so the app fetches from the API stub -->
  <script>
    try { localStorage.setItem('cmcc-storyblok-settings', JSON.stringify({
      apiEndpoint: 'http://localhost:${API_PORT}',
      apiKey: 'demo-key',
      spamThreshold: 0.8,
      autoApprove: false,
      notifyOnSpike: true,
      notifyOnSpam: true,
      queuePollInterval: 30
    })); } catch(e) {}
    try { localStorage.setItem('cmcc-storyblok-theme', 'light'); } catch(e) {}
  </script>

  <!-- Mock Storyblok SDK properly -->
  <!-- The webpack external maps @storyblok/app-sdk → window.StoryblokSDK -->
  <!-- So import { StoryblokApp } from '@storyblok/app-sdk' looks for window.StoryblokSDK.StoryblokApp -->
  <script>
    window.StoryblokSDK = {
      StoryblokApp: class {
        constructor() { this.ctx = null; }
        async getContext() {
          return {
            space: { id: 1, name: 'Local Test Space', plan: 'free' },
            user: { id: 'mod-1', name: 'Admin', email: 'admin@localhost' },
            accessToken: 'mock-token-abc123',
          };
        }
      }
    };
  </script>
  <script src="/storyblok/index.js"></script>
</body>
</html>`)
})

// ── Wix standalone HTML ────────────────────────────────────────────
app.get('/wix/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CMCC Moderation — Wix (Standalone)</title>
  <link rel="stylesheet" href="/wix/app.css" />
  <style>
    body { margin: 0; background: #fff; }
  </style>
</head>
<body>
  <div id="cmcc-wix-app-root"></div>

  <!-- React 18 from CDN (matches webpack externals: react → React, react-dom → ReactDOM) -->
  <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>

  <!-- Mock Wix context before the app loads -->
  <script>
    // The Wix index.js reads instance/token from the URL hash.
    // instance is a base64-encoded JSON blob.
    var mockInstance = btoa(JSON.stringify({
      siteId: 'local-site-123',
      appId: 'cmcc',
      instanceId: 'inst-abc',
      plan: 'free',
      permissions: ['read', 'write']
    }));
    window.location.hash = 'instance=' + mockInstance +
      '&token=mock-token-abcdef1234567890' +
      '&siteOwnerId=owner-1';

    // Pre-set backend URL in localStorage (matches getBackendUrl() lookup)
    try { localStorage.setItem('cmcc_backend_url', 'http://localhost:${API_PORT}/api'); } catch(e) {}
  </script>

  <script src="/wix/app.js"></script>
</body>
</html>`)
})

// ── Shopify standalone HTML ────────────────────────────────────────
app.get('/shopify/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CMCC Content Moderation — Shopify (Standalone)</title>
  <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@13.9.5/build/esm/styles.css" />
  <link rel="stylesheet" href="/shopify/app.css" />
  <style>
    body { margin: 0; background: #f6f6f7; }
  </style>
</head>
<body>
  <div id="app"></div>

  <!-- LOCAL_DEV build: React, Polaris, and AppBridge are bundled into app.js -->
  <!-- Only Polaris CSS is still loaded from CDN (can't be bundled) -->

  <script src="/shopify/app.js"></script>
</body>
</html>`)
})

// ── Root: Test Hub ─────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CMCC — Local Test Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #f0f2f5; color: #1a1a2e; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    p.sub { color: #6b7280; margin-bottom: 32px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-decoration: none; color: inherit; display: block; transition: box-shadow .15s; }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .card h2 { font-size: 18px; margin-bottom: 4px; }
    .card .url { font-size: 13px; color: #2563eb; font-family: monospace; margin-bottom: 8px; }
    .card p { font-size: 13px; color: #6b7280; }
    .card .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px;
                   font-weight: 600; margin-top: 8px; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;
              font-size: 13px; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    td { color: #4b5563; }
    .ok { color: #16a34a; font-weight: 600; }
    .warn { color: #d97706; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ CMCC Test Hub</h1>
    <p class="sub">All platforms served from <strong>http://localhost:${PORT}</strong>.
    API backend runs on <strong>http://localhost:3000</strong> with 525 items.</p>

    <div class="cards">
      <a class="card" href="/storyblok/">
        <h2>📚 Storyblok</h2>
        <div class="url">/storyblok/</div>
        <p>Standalone with SDK mock</p>
        <span class="badge badge-green">525 items</span>
      </a>
      <a class="card" href="/wix/">
        <h2>🌐 Wix</h2>
        <div class="url">/wix/</div>
        <p>Standalone with context mock</p>
        <span class="badge badge-blue">525 items</span>
      </a>
      <a class="card" href="/shopify/">
        <h2>🛍️ Shopify</h2>
        <div class="url">/shopify/</div>
        <p>Standalone with Polaris + App Bridge</p>
        <span class="badge badge-purple">525 items</span>
      </a>
    </div>

    <table>
      <tr><th>Service</th><th>URL</th><th>Status</th></tr>
      <tr><td>API Stub</td><td>http://localhost:3000</td><td class="ok">✅ 525 items</td></tr>
      <tr><td>Storyblok</td><td>/storyblok/</td><td class="ok">✅ SDK mock</td></tr>
      <tr><td>Wix</td><td>/wix/</td><td class="ok">✅ Context mock</td></tr>
      <tr><td>Shopify</td><td>/shopify/</td><td class="ok">✅ CDN + proxy</td></tr>
    </table>

    <div class="footer">
      <strong>Docker platforms:</strong> WordPress (:8080) and Strapi (:1337).<br>
      Start them with <code>docker compose up -d wordpress strapi</code>.<br>
      API stub: <code>make serve-api</code> (already running if you see this page).<br>
      Source: <code>tools/dev-server.js</code>
    </div>
  </div>
</body>
</html>`)
})

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🛡️  CMCC Dev Server running at http://localhost:${PORT}`)
  console.log(`\n  ┌──────────────────────────────┬──────────────────────────┐`)
  console.log(`  │ Platform                     │ URL                      │`)
  console.log(`  ├──────────────────────────────┼──────────────────────────┤`)
  console.log(`  │ 📚  Storyblok               │ /storyblok/              │`)
  console.log(`  │ 🌐  Wix                     │ /wix/                    │`)
  console.log(`  │ 🛍️  Shopify                 │ /shopify/                │`)
  console.log(`  └──────────────────────────────┴──────────────────────────┘`)
  console.log(`\n  Open http://localhost:${PORT}/ in your browser.`)
  console.log(
    `  Make sure the API stub is running on port 3000: make serve-api\n`,
  )
})
