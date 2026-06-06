/**
 * CMCC Test API Stub
 *
 * A minimal Express server that returns mock data for manual front-end testing
 * of the Storyblok, Wix, and Shopify dashboard apps.
 *
 * Usage:
 *   node server.js
 *   # Serves on http://localhost:3000
 *
 * Docker:
 *   docker compose up cmcc-api
 */

const express = require('express')

const app = express()
const PORT = 3000

app.use(express.json())

// ── CORS (allow all origins for local testing) ──────────────────────────
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})

// ── Mock data ───────────────────────────────────────────────────────────

const queueItems = [
  {
    id: 'item-1',
    contentType: 'comment',
    contentSnippet: 'Great article! Thanks for sharing.',
    author: 'Alice Johnson',
    status: 'pending',
    riskScore: 0.12,
    dateGmt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'item-2',
    contentType: 'post',
    contentSnippet: 'Check out this amazing deal at https://spam.example.com',
    author: 'Bob Spammer',
    status: 'pending',
    riskScore: 0.87,
    dateGmt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'item-3',
    contentType: 'review',
    contentSnippet: '\u2b50\u2b50\u2b50\u2b50\u2b50 Would recommend to everyone!',
    author: 'Carol Davis',
    status: 'approved',
    riskScore: 0.05,
    dateGmt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'item-4',
    contentType: 'comment',
    contentSnippet: 'Buy now!!! Limited offer!!! Click here!!!',
    author: 'Dave Marketer',
    status: 'spam',
    riskScore: 0.95,
    dateGmt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'item-5',
    contentType: 'post',
    contentSnippet: 'A thoughtful analysis of modern content moderation techniques...',
    author: 'Eve Writer',
    status: 'pending',
    riskScore: 0.08,
    dateGmt: new Date(Date.now() - 600000).toISOString(),
  },
]

const activityLog = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'approved',
    contentType: 'comment',
    contentId: 'item-3',
    performedBy: 'Moderator Admin',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'marked_as_spam',
    contentType: 'comment',
    contentId: 'item-4',
    performedBy: 'Auto-moderation',
  },
]

let settings = {
  autoModerate: false,
  spamThreshold: 0.8,
  notifyOnFlag: true,
  maxQueueSize: 1000,
  backendUrl: 'http://localhost:3000',
  pollInterval: 30,
}

// ── Routes ──────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Queue
app.get('/api/queue', (_req, res) => {
  res.json({ items: queueItems, total: queueItems.length, page: 1, per_page: 20 })
})

app.get('/api/queue/:id', (req, res) => {
  const item = queueItems.find((i) => i.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  res.json(item)
})

app.post('/api/queue/:id/moderate', (req, res) => {
  const item = queueItems.find((i) => i.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const { action } = req.body
  item.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action
  res.json({ success: true, data: item, message: `Item ${action}d successfully` })
})

app.post('/api/queue/bulk', (req, res) => {
  const { ids, action } = req.body
  const succeeded = ids.filter((id) => queueItems.find((i) => i.id === id))
  return res.json({
    data: { succeeded: succeeded.length, failed: ids.length - succeeded.length },
    message: `Bulk ${action} completed: ${succeeded.length} succeeded`,
  })
})

// Analytics
app.get('/api/analytics', (_req, res) => {
  res.json({
    totalModerated: 42,
    spamDetected: 15,
    approved: 25,
    pendingReview: 2,
    spamRatio: 0.357,
    contentBreakdown: [
      { type: 'comment', count: 28, percentage: 66.7 },
      { type: 'post', count: 10, percentage: 23.8 },
      { type: 'review', count: 4, percentage: 9.5 },
    ],
    heatmap: {
      data: Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 4)),
      ),
      maxCount: 3,
    },
    activitySummary: {
      total: 156,
      periodDays: 30,
    },
  })
})

// Activity log
app.get('/api/activity-log', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = activityLog.slice(start, start + perPage)
  res.json({ items, total: activityLog.length, page, per_page: perPage })
})

app.get('/api/activity', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = activityLog.slice(start, start + perPage)
  res.json({ items, total: activityLog.length, page, per_page: perPage })
})

// Settings
app.get('/api/settings', (_req, res) => {
  res.json(settings)
})

app.put('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body }
  res.json({ data: settings, message: 'Settings saved' })
})

// Events (used by Storyblok)
app.get('/api/events', (_req, res) => {
  res.json(queueItems)
})

// ── Start ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CMCC Test API Stub running at http://localhost:${PORT}`)
  console.log('Endpoints:')
  console.log('  GET  /api/health')
  console.log('  GET  /api/queue')
  console.log('  POST /api/queue/:id/moderate')
  console.log('  POST /api/queue/bulk')
  console.log('  GET  /api/analytics')
  console.log('  GET  /api/activity')
  console.log('  GET  /api/activity-log')
  console.log('  GET  /api/settings')
  console.log('  PUT  /api/settings')
  console.log('  GET  /api/events')
})
