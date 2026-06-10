/**
 * Reputation service - calculates and retrieves user reputation data.
 */

/**
 * Get reputation data for all users.
 */
function getUserReputations(db) {
  return db.prepare(`
    SELECT
      author_id,
      author_name,
      COUNT(*) as total_items,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_items,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_items,
      SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_items,
      ROUND(
        (CAST(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS REAL) /
          NULLIF(COUNT(*), 0)) * 100
      ) as reputation_score
    FROM queue_items
    WHERE author_id IS NOT NULL
    GROUP BY author_id
    ORDER BY reputation_score DESC
  `).all()
}

/**
 * Get reputation data for a single user.
 */
function getUserReputation(db, authorId) {
  const users = db.prepare(`
    SELECT
      author_id,
      author_name,
      COUNT(*) as total_items,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_items,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_items,
      SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_items,
      ROUND(
        (CAST(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS REAL) /
          NULLIF(COUNT(*), 0)) * 100
      ) as reputation_score
    FROM queue_items
    WHERE author_id = ?
    GROUP BY author_id
  `).all(authorId)

  if (users.length === 0) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  // Get recent items by this user
  const recentItems = db.prepare(`
    SELECT id, item_id, content_type, status, title, created_at
    FROM queue_items
    WHERE author_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(authorId)

  return {
    ...users[0],
    recentItems,
  }
}

module.exports = {
  getUserReputations,
  getUserReputation,
}
