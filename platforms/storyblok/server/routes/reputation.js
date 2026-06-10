/**
 * Reputation routes — user trust levels based on moderation history
 */
const express = require('express')

function createReputationRouter(db) {
  const router = express.Router()

  /**
   * Calculate trust level based on approved vs spam counts.
   */
  function calculateTrustLevel(stats) {
    const { approved, spam, total, avgSpamScore } = stats
    if (total === 0) return 'neutral'

    const approvalRatio = total > 0 ? approved / total : 0
    const spamRatio = total > 0 ? spam / total : 0

    if (approvalRatio >= 0.9 && spamRatio <= 0.05 && avgSpamScore < 20) return 'trusted'
    if (spamRatio >= 0.7 || avgSpamScore >= 80) return 'blocked'
    if (spamRatio >= 0.4 || avgSpamScore >= 50) return 'suspicious'
    if (approvalRatio >= 0.7) return 'good'
    return 'neutral'
  }

  // ── GET /reputation/users ────────────────────────────────────────────
  router.get('/users', (req, res) => {
    const users = db.prepare(`
      SELECT
        author_id,
        author_name,
        author_email,
        COUNT(*) as totalItems,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(spam_score) as avgSpamScore,
        MAX(created_at) as lastActivity
      FROM queue_items
      WHERE author_id IS NOT NULL AND author_id != ''
      GROUP BY author_id
      ORDER BY totalItems DESC
    `).all()

    const usersWithTrust = users.map((u) => {
      const stats = {
        approved: u.approved || 0,
        spam: u.spam || 0,
        rejected: u.rejected || 0,
        flagged: u.flagged || 0,
        pending: u.pending || 0,
        total: u.totalItems,
        avgSpamScore: u.avgSpamScore || 0,
      }
      return {
        ...u,
        trustLevel: calculateTrustLevel(stats),
        avgSpamScore: Math.round(u.avgSpamScore || 0),
      }
    })

    res.json({ users: usersWithTrust })
  })

  // ── GET /reputation/user/:id ─────────────────────────────────────────
  router.get('/user/:id', (req, res) => {
    const { id } = req.params
    const user = db.prepare(`
      SELECT
        author_id,
        author_name,
        author_email,
        COUNT(*) as totalItems,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(spam_score) as avgSpamScore,
        MAX(created_at) as lastActivity
      FROM queue_items
      WHERE author_id = ?
      GROUP BY author_id
    `).get(id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const stats = {
      approved: user.approved || 0,
      spam: user.spam || 0,
      rejected: user.rejected || 0,
      flagged: user.flagged || 0,
      pending: user.pending || 0,
      total: user.totalItems,
      avgSpamScore: user.avgSpamScore || 0,
    }

    // Get recent items from this user
    const recentItems = db.prepare(`
      SELECT item_id, content_type, status, title, spam_score, created_at
      FROM queue_items
      WHERE author_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id)

    res.json({
      user: {
        ...user,
        trustLevel: calculateTrustLevel(stats),
        avgSpamScore: Math.round(user.avgSpamScore || 0),
        recentItems,
      },
    })
  })

  return router
}

module.exports = { createReputationRouter }
