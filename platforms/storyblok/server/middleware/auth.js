/**
 * API Key Authentication Middleware
 *
 * Validates the x-api-key header against the configured API key.
 * If no API key is configured, authentication is skipped.
 */

/**
 * Create authentication middleware.
 * @param {string} apiKey - The expected API key
 * @returns {import('express').RequestHandler}
 */
function createAuthMiddleware(apiKey) {
  return (req, res, next) => {
    // Skip auth for non-API routes
    if (!req.path.startsWith('/api/')) {
      return next()
    }

    const providedKey = req.headers['x-api-key']

    if (!providedKey) {
      return res.status(401).json({
        error: 'Authentication required. Provide an API key via the x-api-key header.',
      })
    }

    if (apiKey && providedKey !== apiKey) {
      return res.status(403).json({
        error: 'Invalid API key.',
      })
    }

    next()
  }
}

module.exports = { createAuthMiddleware }
