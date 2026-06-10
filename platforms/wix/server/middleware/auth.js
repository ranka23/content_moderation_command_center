/**
 * API key authentication middleware.
 * Validates the X-API-Key header against configured keys.
 */

const API_KEYS = (process.env.CMCC_API_KEYS || 'test-api-key-12345').split(',')

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key']

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key. Provide X-API-Key header.' })
  }

  if (!API_KEYS.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key.' })
  }

  next()
}

module.exports = { authMiddleware }
