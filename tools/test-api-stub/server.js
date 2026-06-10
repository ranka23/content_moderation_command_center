/**
 * CMCC Test API Stub — 500+ Dummy Dataset
 *
 * A minimal Express server that returns rich mock data for manual front-end
 * testing of the Storyblok, Wix, and Shopify dashboard apps.
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
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  )
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})

// Handle CORS preflight OPTIONS requests (browsers send these before
// cross-origin requests with non-simple headers like Content-Type: application/json)
app.options('*', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  )
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-WP-Nonce',
  )
  res.header('Access-Control-Max-Age', '86400')
  res.sendStatus(200)
})

// ══════════════════════════════════════════════════════════════════════════
// DATA GENERATORS
// ══════════════════════════════════════════════════════════════════════════

const CONTENT_TYPES = [
  'comment',
  'post',
  'review',
  'woocommerce_review',
  'forum_topic',
  'user_profile',
  'media',
  'page',
  'product',
]
const _STATUSES = [
  'pending',
  'approved',
  'rejected',
  'spam',
  'flagged',
  'deferred',
]
const ACTIONS = [
  'approved',
  'rejected',
  'marked_as_spam',
  'flagged',
  'deferred',
  'auto_moderated',
]
const MODERATORS = [
  { id: 'mod-1', name: 'Admin' },
  { id: 'mod-2', name: 'Jane Moderator' },
  { id: 'mod-3', name: 'Bob Reviewer' },
  { id: 'mod-4', name: 'Alice Admin' },
  { id: 'auto', name: 'Auto-moderation' },
]

const FIRST_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
  'Ivy',
  'Jack',
  'Karen',
  'Leo',
  'Mona',
  'Nate',
  'Olive',
  'Pete',
  'Quinn',
  'Rosa',
  'Sam',
  'Tina',
  'Uma',
  'Vince',
  'Wendy',
  'Xander',
  'Yara',
  'Zack',
  'Aisha',
  'Ben',
  'Clara',
  'Dan',
  'Ella',
  'Finn',
]
const LAST_NAMES = [
  'Johnson',
  'Smith',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
]
const SPAMMER_NAMES = [
  'SpammerX',
  'QuickCash',
  'DealMaster',
  'ClickHere',
  'WinBigNow',
  'FreeMoney',
  'ViagraOffers',
  'CasinoPro',
  'CryptoKing',
  'LoanShark',
  'PrizeWinner',
  'ActNow',
  'LimitedOffer',
  'SecretProfits',
  'MiracleCure',
]

const TITLE_TEMPLATES = {
  comment: [
    'Great article! Thanks for sharing.',
    'I completely disagree with this post.',
    'This is exactly what I was looking for.',
    'Can you provide more details about this?',
    'I have been saying this for years!',
    'Nice write-up, very informative.',
    'Not sure I agree with your conclusions.',
    'Thanks for the helpful information.',
    'This changed my perspective on things.',
    'Could you elaborate on point #3?',
  ],
  spam_comment: [
    'Check out this amazing deal at {url}',
    'Buy now!!! Limited offer!!! Click {url}',
    "You won't believe this one weird trick! {url}",
    'Make $5000/day working from home! {url}',
    "Congratulations! You've won a prize! Claim at {url}",
    'This crypto will 100x in 2024! Invest at {url}',
    'Lose 30 pounds in 30 days! {url}',
    'Your computer has a virus! Fix it at {url}',
    'Exclusive deal just for you! {url}',
    'Meet singles in your area tonight! {url}',
  ],
  post: [
    'How to improve your productivity in 2024',
    'The ultimate guide to content moderation',
    '10 tips for better customer engagement',
    'Why we need stronger spam filters',
    'The future of AI in content management',
    'Best practices for community management',
    'Understanding user behavior analytics',
    'A complete guide to WordPress security',
    'How to scale your moderation team',
    'The impact of social media on online discourse',
  ],
  review: [
    '⭐⭐⭐⭐⭐ Amazing product, highly recommend!',
    '⭐⭐⭐ Good but could be better',
    '⭐⭐ Disappointed with the quality',
    "⭐⭐⭐⭐⭐ Best purchase I've made this year!",
    '⭐⭐⭐⭐ Solid product, great value',
    '⭐ Terrible experience, would not recommend',
    '⭐⭐⭐⭐⭐ Five stars! Exceeded expectations',
    "⭐⭐⭐ It's okay, does what it says",
    '⭐⭐⭐⭐ Very happy with my purchase',
    '⭐⭐⭐⭐⭐ Absolutely love this!',
  ],
  forum_topic: [
    'Help needed with plugin configuration',
    'Best practices for database optimization',
    'How do you handle spam in your community?',
    'New feature request: bulk moderation',
    'Looking for beta testers',
    'Tips for new moderators',
    'Integration with third-party tools',
    'Performance issues with large queues',
    'Security concerns with user submissions',
    'Weekly community discussion thread',
  ],
}

const URLS = [
  'https://spam.example.com/deal',
  'https://scam.example.com/win',
  'https://cheap-deals.example.org/buy',
  'https://miracle.example.net/cure',
  'https://crypto-bonus.example.co/invest',
  'https://free-money.example.io/claim',
  'https://weight-loss.example.com/secret',
  'https://casino-bonus.example.org/free',
  'https://virus-scan.example.net/alert',
  'https://phishing-login.example.com/verify',
]

const EXCERPT_TEMPLATES = {
  good: [
    'I really enjoyed reading this article and learned a lot from it. The author did a great job explaining complex topics in simple terms.',
    'This is a thoughtful analysis of the current state of content moderation. I appreciate the balanced perspective presented here.',
    'Thanks for sharing these insights! I have been dealing with similar issues on my own site and this gave me some new ideas to try.',
    'A comprehensive guide that covers everything you need to know. Well structured and easy to follow.',
    'I have been following this topic for years and this is one of the best explanations I have seen. Keep up the great work!',
  ],
  spam: [
    "Visit {url} for amazing deals! Limited time offer! Act now!!! You won't believe these prices!! Click here!!!",
    'Congratulations!!! You have been selected as our lucky winner!!! Claim your FREE prize now at {url}!!! Hurry!!!',
    'Make money fast!!! Work from home and earn ${amount}/day!!! No experience needed!!! Sign up at {url} now!!!',
    'Your computer may be infected!!! Click {url} to run a free scan!!! Protect your personal information!!!',
    'Lose weight fast with our miracle formula!!! Doctors hate this one simple trick!!! Order now at {url}!!!',
  ],
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysBack) {
  const now = Date.now()
  const past = now - daysBack * 24 * 60 * 60 * 1000
  return new Date(past + Math.random() * (now - past)).toISOString()
}

function randomAuthor() {
  if (Math.random() < 0.15) {
    // 15% chance of being a spammer
    const name = randomItem(SPAMMER_NAMES)
    return { id: `spammer-${randomInt(1, 100)}`, name }
  }
  const first = randomItem(FIRST_NAMES)
  const last = randomItem(LAST_NAMES)
  const num = randomInt(101, 9999)
  return { id: `user-${num}`, name: `${first} ${last}` }
}

function generateTitle(contentType, isSpam) {
  if (isSpam && contentType === 'comment') {
    const template = randomItem(TITLE_TEMPLATES.spam_comment)
    return template.replace('{url}', randomItem(URLS))
  }
  const templates = TITLE_TEMPLATES[contentType] || TITLE_TEMPLATES.comment
  return randomItem(templates)
}

function generateExcerpt(isSpam) {
  if (isSpam && Math.random() < 0.7) {
    const template = randomItem(EXCERPT_TEMPLATES.spam)
    return template
      .replace('{url}', randomItem(URLS))
      .replace('{amount}', String(randomInt(1000, 10000)))
  }
  return randomItem(EXCERPT_TEMPLATES.good)
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE 500+ QUEUE ITEMS
// ══════════════════════════════════════════════════════════════════════════

const queueItems = []
const authorsCache = new Map()

for (let i = 1; i <= 525; i++) {
  const contentType = randomItem(CONTENT_TYPES)
  const isSpamItem = Math.random() < 0.25 // ~25% spam/flagged
  const statusRoll = Math.random()
  let status
  if (isSpamItem) {
    status =
      statusRoll < 0.5 ? 'spam' : statusRoll < 0.8 ? 'flagged' : 'pending'
  } else {
    status =
      statusRoll < 0.3
        ? 'approved'
        : statusRoll < 0.5
          ? 'rejected'
          : statusRoll < 0.7
            ? 'pending'
            : 'deferred'
  }

  const author = randomAuthor()
  // Cache authors for consistency
  if (!authorsCache.has(author.id)) {
    authorsCache.set(author.id, author.name)
  }

  const riskScore = isSpamItem
    ? randomFloat(0.6, 0.99)
    : randomFloat(0.01, 0.45)

  const daysBack = randomInt(0, 45)
  const dateStr = randomDate(daysBack)

  queueItems.push({
    id: `item-${i}`,
    item_id: `item-${i}`,
    contentType: contentType,
    content_type: contentType,
    contentSnippet: generateExcerpt(isSpamItem),
    author: author.name,
    author_id: author.id,
    authorId: author.id,
    status: status,
    riskScore: riskScore,
    spam_score: riskScore,
    spamScore: riskScore,
    dateGmt: dateStr,
    date_gmt: dateStr,
    title: generateTitle(contentType, isSpamItem),
    excerpt: generateExcerpt(isSpamItem),
    originalId: `orig-${i}`,
    typeIcon: '',
    statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
    statusColor:
      status === 'spam'
        ? 'red'
        : status === 'flagged'
          ? 'yellow'
          : status === 'approved'
            ? 'green'
            : status === 'rejected'
              ? 'gray'
              : 'blue',
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE 500+ ACTIVITY LOG ENTRIES
// ══════════════════════════════════════════════════════════════════════════

const activityLog = []
for (let i = 1; i <= 520; i++) {
  const item = queueItems[i % queueItems.length]
  const moderator = randomItem(MODERATORS)
  const action = randomItem(ACTIONS)
  const dateStr = randomDate(30)

  activityLog.push({
    id: `log-${i}`,
    timestamp: dateStr,
    action: action,
    action_label: action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    contentType: item.contentType,
    content_type: item.content_type,
    contentId: item.id,
    item_id: item.id,
    item_title: item.title,
    performedBy: moderator.name,
    moderator_id: moderator.id,
    moderator_name: moderator.name,
    previous_status: 'pending',
    new_status:
      action === 'approved'
        ? 'approved'
        : action === 'rejected'
          ? 'rejected'
          : action === 'marked_as_spam'
            ? 'spam'
            : action === 'flagged'
              ? 'flagged'
              : action === 'deferred'
                ? 'deferred'
                : 'auto_moderated',
    notes:
      action === 'approved'
        ? 'Looks good.'
        : action === 'rejected'
          ? 'Violates guidelines.'
          : action === 'marked_as_spam'
            ? 'Spam detected.'
            : '',
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE USER REPUTATION DATA
// ══════════════════════════════════════════════════════════════════════════

const userReputation = []
const uniqueAuthors = new Map()
queueItems.forEach((item) => {
  if (!uniqueAuthors.has(item.author_id)) {
    uniqueAuthors.set(item.author_id, item.author)
  }
})
let repIdx = 1
for (const [authorId, authorName] of uniqueAuthors) {
  const totalSubmissions = randomInt(1, 150)
  const approvedCount = randomInt(0, totalSubmissions)
  const spamCount = randomInt(0, totalSubmissions - approvedCount)
  const flaggedCount = randomInt(
    0,
    Math.max(0, totalSubmissions - approvedCount - spamCount),
  )
  const rejectedCount =
    totalSubmissions - approvedCount - spamCount - flaggedCount
  const approvalRate =
    totalSubmissions > 0
      ? Math.round((approvedCount / totalSubmissions) * 100) / 100
      : 0
  const flags = randomInt(0, Math.min(5, flaggedCount))

  userReputation.push({
    id: `rep-${repIdx++}`,
    author_id: authorId,
    author_name: authorName,
    total_submissions: totalSubmissions,
    approved_count: approvedCount,
    spam_count: spamCount,
    flagged_count: flaggedCount,
    rejected_count: rejectedCount,
    approval_rate: approvalRate,
    trust_score: Math.round(approvalRate * 100),
    flags: flags,
    last_active: randomDate(14),
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE MODERATOR PERFORMANCE DATA
// ══════════════════════════════════════════════════════════════════════════

const moderatorPerformance = MODERATORS.map((mod) => {
  const totalActions = randomInt(20, 500)
  const approveCount = randomInt(5, totalActions)
  const rejectCount = randomInt(2, totalActions - approveCount)
  const spamCount = randomInt(
    1,
    Math.max(1, totalActions - approveCount - rejectCount),
  )
  const flagCount = Math.max(
    0,
    totalActions - approveCount - rejectCount - spamCount,
  )
  return {
    id: `perf-${mod.id}`,
    moderator_id: mod.id,
    moderator_name: mod.name,
    total_actions: totalActions,
    approve_count: approveCount,
    reject_count: rejectCount,
    spam_count: spamCount,
    flag_count: flagCount,
    avg_response_time_minutes: randomInt(1, 120),
    accuracy_rate: randomFloat(0.85, 1.0),
    last_active: randomDate(3),
  }
})

// ══════════════════════════════════════════════════════════════════════════
// GENERATE ACTIVITY FEED ENTRIES
// ══════════════════════════════════════════════════════════════════════════

const activityFeed = []
const feedMessages = [
  'processed {count} queue items',
  'approved {count} comments',
  'flagged {count} items for review',
  'marked {count} items as spam',
  'rejected {count} submissions',
  'updated spam filter rules',
  'reviewed {count} flagged items',
  'completed bulk moderation of {count} items',
  'assigned {count} items to team members',
  'exported moderation report',
  'adjusted spam threshold',
  'resolved {count} escalated items',
  'added notes to {count} items',
  'cleaned up {count} spam items from queue',
  'responded to {count} moderation disputes',
]
for (let i = 1; i <= 200; i++) {
  const moderator = randomItem(MODERATORS)
  const count = randomInt(1, 50)
  const msg = randomItem(feedMessages).replace('{count}', count)
  activityFeed.push({
    id: `feed-${i}`,
    moderator_id: moderator.id,
    moderator_name: moderator.name,
    message: msg,
    timestamp: randomDate(14),
    type: randomItem(['moderation', 'settings', 'bulk_action', 'system']),
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE ITEM NOTES
// ══════════════════════════════════════════════════════════════════════════

const itemNotes = []
const noteTemplates = [
  'This user has been flagged before. Review carefully.',
  'Looks like legitimate content. Approving.',
  'Contains suspicious links. Investigate further.',
  'User has good history. Quick approval.',
  'Potential duplicate content. Check before approving.',
  'High-quality submission. Fast-track approval.',
  'Reported by multiple users. Needs review.',
  'Content matches known spam pattern #12.',
  'New user — first submission. Monitor closely.',
  'Auto-moderation suggestion: Flag for review.',
]
const noteAuthors = [
  'Admin',
  'Jane Moderator',
  'Bob Reviewer',
  'Auto-moderation',
]
for (let i = 0; i < 120; i++) {
  const item = queueItems[i % queueItems.length]
  itemNotes.push({
    id: `note-${i + 1}`,
    item_id: item.id,
    content: randomItem(noteTemplates),
    author: randomItem(noteAuthors),
    created_at: randomDate(7),
    is_internal: Math.random() < 0.3,
  })
}

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS DATA
// ══════════════════════════════════════════════════════════════════════════

const pendingCount = queueItems.filter((i) => i.status === 'pending').length
const spamCount = queueItems.filter((i) => i.status === 'spam').length
const flaggedCount = queueItems.filter((i) => i.status === 'flagged').length
const approvedCount = queueItems.filter((i) => i.status === 'approved').length
const rejectedCount = queueItems.filter((i) => i.status === 'rejected').length
const deferredCount = queueItems.filter((i) => i.status === 'deferred').length
const totalModerated = approvedCount + rejectedCount + spamCount + deferredCount

// Content type breakdown
const contentTypeBreakdown = {}
queueItems.forEach((item) => {
  if (!contentTypeBreakdown[item.contentType]) {
    contentTypeBreakdown[item.contentType] = 0
  }
  contentTypeBreakdown[item.contentType]++
})
const ctBreakdown = Object.entries(contentTypeBreakdown).map(
  ([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / queueItems.length) * 1000) / 10,
  }),
)

let settings = {
  autoModerate: false,
  spamThreshold: 0.8,
  notifyOnFlag: true,
  maxQueueSize: 1000,
  backendUrl: 'http://localhost:3000',
  pollInterval: 30,
  maxLinks: 5,
  minSubmitTime: 30,
  blockedKeywords: 'viagra,casino,free money,click here,limited offer,act now',
  blockVPN: false,
  enableDuplicateDetection: true,
  duplicateLookbackDays: 7,
  notifyOnSpam: true,
  notifyOnAnomaly: false,
  notifyOnThreshold: true,
  notifyEmail: 'admin@example.com',
  aiModel: 'basic',
  aiSensitivity: 0.7,
  enableAutoLearn: true,
  autoLearnThreshold: 0.95,
  enableUserReputation: true,
  reputationThreshold: 0.3,
  enableRoleBasedAccess: false,
  autoApproveTrustedUsers: true,
  trustedUserThreshold: 90,
  enableContentTypeRules: true,
  restrictedContentTypes: [],
  logRetentionDays: 90,
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    total_queue_items: queueItems.length,
    total_activity_logs: activityLog.length,
  })
})

// ── Queue ──────────────────────────────────────────────────────────────

app.get('/api/queue', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const status = req.query.status || ''
  const contentType = req.query.content_type || req.query.contentType || ''
  const search = req.query.search || ''
  const sortField = req.query.sort_field || req.query.sortField || 'dateGmt'
  const sortDir = req.query.sort_direction || req.query.sortDirection || 'DESC'

  let filtered = [...queueItems]

  if (status) {
    filtered = filtered.filter((i) => i.status === status)
  }
  if (contentType) {
    filtered = filtered.filter(
      (i) => i.content_type === contentType || i.contentType === contentType,
    )
  }
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.excerpt.toLowerCase().includes(s) ||
        i.author.toLowerCase().includes(s),
    )
  }

  // Simple sort
  filtered.sort((a, b) => {
    const aVal = a[sortField] || ''
    const bVal = b[sortField] || ''
    const cmp =
      typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
    return sortDir === 'DESC' ? -cmp : cmp
  })

  const total = filtered.length
  const start = (page - 1) * perPage
  const items = filtered.slice(start, start + perPage)

  res.json({
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  })
})

// ── Queue Stats (MUST be before :id route) ────────────────────────────

app.get('/api/queue/stats', (_req, res) => {
  res.json({
    pending: pendingCount,
    spam: spamCount,
    flagged: flaggedCount,
    approved: approvedCount,
    rejected: rejectedCount,
    deferred: deferredCount,
    total: queueItems.length,
  })
})

app.get('/api/queue/:id', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })
  res.json(item)
})

app.post('/api/queue/:id/moderate', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const { action } = req.body
  const statusMap = {
    approve: 'approved',
    reject: 'rejected',
    spam: 'spam',
    flag: 'flagged',
    defer: 'deferred',
    unspam: 'pending',
  }
  item.status = statusMap[action] || action
  item.statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1)
  res.json({
    success: true,
    data: item,
    message: `Item ${action}d successfully`,
  })
})

app.post('/api/queue/:id/action', (req, res) => {
  // Alias for /moderate (used by some platforms)
  return app._router.handle(req, res)
})

app.post('/api/queue/bulk', (req, res) => {
  const { ids, action } = req.body
  const statusMap = {
    approve: 'approved',
    reject: 'rejected',
    spam: 'spam',
    flag: 'flagged',
    defer: 'deferred',
  }
  let succeeded = 0
  ids.forEach((id) => {
    const item = queueItems.find((i) => i.id === id || i.item_id === id)
    if (item) {
      item.status = statusMap[action] || action
      item.statusLabel =
        item.status.charAt(0).toUpperCase() + item.status.slice(1)
      succeeded++
    }
  })
  res.json({
    data: { succeeded, failed: ids.length - succeeded },
    message: `Bulk ${action} completed: ${succeeded} succeeded`,
  })
})

// ── Item History ───────────────────────────────────────────────────────

app.get('/api/queue/:id/history', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const history = activityLog
    .filter((l) => l.item_id === item.id || l.contentId === item.id)
    .slice(0, 20)
  res.json({ items: history, total: history.length })
})

// ── Item Notes ─────────────────────────────────────────────────────────

app.get('/api/queue/:id/notes', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const notes = itemNotes.filter((n) => n.item_id === item.id)
  res.json({ items: notes, total: notes.length })
})

app.post('/api/queue/:id/note', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const { content, is_internal } = req.body
  const note = {
    id: `note-${itemNotes.length + 1}`,
    item_id: item.id,
    content: content || '',
    author: 'Admin',
    created_at: new Date().toISOString(),
    is_internal: !!is_internal,
  }
  itemNotes.push(note)
  res.json({ success: true, data: note, message: 'Note added' })
})

// ── Assignment ─────────────────────────────────────────────────────────

app.post('/api/queue/:id/assign', (req, res) => {
  const item = queueItems.find(
    (i) => i.id === req.params.id || i.item_id === req.params.id,
  )
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const { assignee_id, due_date } = req.body
  item.assignee_id = assignee_id || 'mod-1'
  item.due_date = due_date || null
  res.json({ success: true, data: item, message: 'Item assigned' })
})

// ── Analytics ──────────────────────────────────────────────────────────

app.get('/api/analytics', (_req, res) => {
  // Generate heatmap data based on actual queue items
  const heatmapData = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => randomInt(0, 8)),
  )
  const maxHeat = Math.max(...heatmapData.flat(), 1)

  // Moderation volume (last 30 days)
  const moderationVolume = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000)
      .toISOString()
      .split('T')[0],
    approved: randomInt(2, 20),
    rejected: randomInt(1, 10),
    spam: randomInt(1, 15),
    flagged: randomInt(0, 8),
  }))

  // Spam content types
  const spamContentTypes = ctBreakdown
    .filter((ct) => ct.count > 0)
    .map((ct) => ({
      type: ct.type,
      spamCount: Math.round(ct.count * (0.1 + Math.random() * 0.3)),
      totalCount: ct.count,
      spamRatio: randomFloat(0.05, 0.4),
    }))

  const spamRatio =
    totalModerated > 0
      ? Math.round((spamCount / queueItems.length) * 1000) / 10
      : 0

  res.json({
    totalModerated,
    spamDetected: spamCount,
    approved: approvedCount,
    rejected: rejectedCount,
    pendingReview: pendingCount,
    spamRatio: spamRatio / 100,
    contentBreakdown: ctBreakdown,
    contentTypeBreakdown: ctBreakdown,
    moderatorPerformance,
    anomalyAlerts: [
      {
        type: 'volume_spike',
        severity: 'low',
        message: 'Queue volume increased 25% in the last hour',
        timestamp: randomDate(1),
      },
      {
        type: 'spam_ratio',
        severity: 'medium',
        message: `Spam ratio at ${spamRatio}% — above normal threshold`,
        timestamp: randomDate(3),
      },
      {
        type: 'new_user_surge',
        severity: 'low',
        message: 'Unusual number of new user registrations detected',
        timestamp: randomDate(5),
      },
      {
        type: 'duplicate_content',
        severity: 'high',
        message: 'Duplicate content pattern detected across 15 items',
        timestamp: randomDate(2),
      },
      {
        type: 'link_spike',
        severity: 'medium',
        message: 'Suspicious link shortener usage increased 40%',
        timestamp: randomDate(1),
      },
    ],
    userReputation: userReputation.slice(0, 50),
    activitySummary: {
      total: activityLog.length,
      periodDays: 30,
    },
    heatmap: {
      data: heatmapData,
      maxCount: maxHeat,
    },
    statusDistribution: [
      { status: 'pending', count: pendingCount },
      { status: 'approved', count: approvedCount },
      { status: 'rejected', count: rejectedCount },
      { status: 'spam', count: spamCount },
      { status: 'flagged', count: flaggedCount },
      { status: 'deferred', count: deferredCount },
    ],
    moderationVolume,
    spamContentTypes,
  })
})

// ── Activity Log ───────────────────────────────────────────────────────

app.get('/api/activity-log', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = activityLog.slice(start, start + perPage)
  res.json({
    items,
    total: activityLog.length,
    page,
    per_page: perPage,
    total_pages: Math.ceil(activityLog.length / perPage),
  })
})

app.get('/api/activity', (req, res) => {
  // Same as activity-log, used by some platforms
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const action = req.query.action || ''
  const contentType = req.query.content_type || req.query.contentType || ''
  const search = req.query.search || ''

  let filtered = [...activityLog]
  if (action) filtered = filtered.filter((l) => l.action === action)
  if (contentType)
    filtered = filtered.filter(
      (l) => l.contentType === contentType || l.content_type === contentType,
    )
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(
      (l) =>
        (l.item_title && l.item_title.toLowerCase().includes(s)) ||
        (l.moderator_name && l.moderator_name.toLowerCase().includes(s)),
    )
  }

  const start = (page - 1) * perPage
  const items = filtered.slice(start, start + perPage)
  res.json({
    items,
    total: filtered.length,
    page,
    per_page: perPage,
    total_pages: Math.ceil(filtered.length / perPage),
  })
})

// ── Settings ───────────────────────────────────────────────────────────

app.get('/api/settings', (_req, res) => {
  res.json(settings)
})

app.put('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body }
  res.json({ data: settings, message: 'Settings saved' })
})

// ── User Reputation ────────────────────────────────────────────────────

app.get('/api/reputation', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = userReputation.slice(start, start + perPage)
  res.json({ items, total: userReputation.length, page, per_page: perPage })
})

app.get('/api/user-reputation', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = userReputation.slice(start, start + perPage)
  res.json({
    users: items,
    total: userReputation.length,
    page,
    per_page: perPage,
  })
})

// ── Activity Feed ──────────────────────────────────────────────────────

app.get('/api/activity-feed', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 20
  const start = (page - 1) * perPage
  const items = activityFeed.slice(start, start + perPage)
  res.json({ items, total: activityFeed.length, page, per_page: perPage })
})

// ── Moderator Performance ──────────────────────────────────────────────

app.get('/api/moderator-performance', (_req, res) => {
  res.json(moderatorPerformance)
})

// ── Platform Status (multi-platform hub) ───────────────────────────────

app.get('/api/platform-status', (_req, res) => {
  res.json({
    platforms: [
      {
        name: 'WordPress',
        icon: '🔵',
        status: 'connected',
        connected: true,
        itemsCount: randomInt(10, 200),
      },
      {
        name: 'Shopify',
        icon: '🛍️',
        status: 'connected',
        connected: true,
        itemsCount: randomInt(5, 100),
      },
      {
        name: 'Storyblok',
        icon: '📚',
        status: 'connected',
        connected: true,
        itemsCount: randomInt(3, 80),
      },
      {
        name: 'Wix',
        icon: '🌐',
        status: 'connected',
        connected: true,
        itemsCount: randomInt(2, 60),
      },
      {
        name: 'Strapi',
        icon: '🚀',
        status: 'disconnected',
        connected: false,
        itemsCount: 0,
      },
    ],
  })
})

// ── Events (used by Storyblok) ────────────────────────────────────────

app.get('/api/events', (_req, res) => {
  const events = activityLog.map((l) => ({
    id: l.id,
    timestamp: l.timestamp,
    contentType: l.contentType || l.content_type,
    action: l.action,
    itemId: l.item_id || l.contentId,
    userId: l.moderator_id,
    moderatorId: l.moderator_id,
  }))
  res.json(events)
})

app.get('/api/events/heatmap', (_req, res) => {
  const heatmapData = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => randomInt(0, 6)),
  )
  res.json({ data: heatmapData, maxCount: Math.max(...heatmapData.flat(), 1) })
})

// ── Export ─────────────────────────────────────────────────────────────

app.post('/api/queue/export', (_req, res) => {
  const csv = [
    'ID,Content Type,Status,Spam Score,Author,Date,Title',
    ...queueItems.map(
      (i) =>
        `"${i.id}","${i.contentType}","${i.status}",${i.spamScore},"${i.author}","${i.dateGmt}","${i.title.replace(/"/g, '""')}"`,
    ),
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="cmcc-queue-export.csv"',
  )
  res.send(csv)
})

app.post('/api/analytics/export', (_req, res) => {
  const report = {
    generatedAt: new Date().toISOString(),
    totalItems: queueItems.length,
    statusBreakdown: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      spam: spamCount,
      flagged: flaggedCount,
      deferred: deferredCount,
    },
    contentTypeBreakdown: ctBreakdown,
    topSpammers: userReputation
      .sort((a, b) => b.spam_count - a.spam_count)
      .slice(0, 10),
    moderatorPerformance,
  }
  res.json(report)
})

// ── Login / Auth Stub ──────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (username === 'admin' && password === 'admin') {
    res.json({
      success: true,
      token: 'cmcc-demo-token-abc123',
      user: {
        id: 'mod-1',
        username: 'admin',
        display_name: 'Admin',
        role: 'administrator',
      },
    })
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' })
  }
})

// ── Start ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CMCC Test API Stub running at http://localhost:${PORT}`)
  console.log('')
  console.log(`  📦 Queue Items:     ${queueItems.length}`)
  console.log(`  📋 Activity Logs:   ${activityLog.length}`)
  console.log(`  👤 User Reputation: ${userReputation.length}`)
  console.log(`  📊 Feed Entries:    ${activityFeed.length}`)
  console.log(`  📝 Item Notes:      ${itemNotes.length}`)
  console.log(`  🏆 Moderators:      ${moderatorPerformance.length}`)
  console.log('')
  console.log('Endpoints:')
  console.log('  GET  /api/health')
  console.log('  GET  /api/queue')
  console.log('  GET  /api/queue/stats')
  console.log('  GET  /api/queue/:id')
  console.log('  GET  /api/queue/:id/history')
  console.log('  GET  /api/queue/:id/notes')
  console.log('  POST /api/queue/:id/moderate')
  console.log('  POST /api/queue/:id/note')
  console.log('  POST /api/queue/:id/assign')
  console.log('  POST /api/queue/bulk')
  console.log('  POST /api/queue/export')
  console.log('  GET  /api/analytics')
  console.log('  POST /api/analytics/export')
  console.log('  GET  /api/activity')
  console.log('  GET  /api/activity-log')
  console.log('  GET  /api/settings')
  console.log('  PUT  /api/settings')
  console.log('  GET  /api/reputation')
  console.log('  GET  /api/user-reputation')
  console.log('  GET  /api/activity-feed')
  console.log('  GET  /api/moderator-performance')
  console.log('  GET  /api/platform-status')
  console.log('  GET  /api/events')
  console.log('  GET  /api/events/heatmap')
  console.log('  POST /api/login')
})
