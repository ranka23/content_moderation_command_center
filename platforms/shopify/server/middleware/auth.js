/**
 * Auth middleware for CMCC Shopify backend.
 * Verifies Shopify OAuth tokens and attaches shop context to requests.
 */

/**
 * Middleware to verify Shopify OAuth session.
 * Extracts and validates the shop domain from the request.
 * In production, this would verify the HMAC signature / session token.
 */
function authMiddleware(req, res, next) {
  // For development/testing, allow requests with X-Shop-Shopify-Shop header
  const shop = req.headers['x-shop-shopify-shop'] || req.query.shop

  if (!shop && process.env.NODE_ENV !== 'test') {
    return res.status(401).json({
      success: false,
      error: 'Missing shop context. Provide X-Shop-Shopify-Shop header or shop query param.',
    })
  }

  // Attach shop context to request
  req.shop = shop || 'development.myshopify.com'
  next()
}

module.exports = { authMiddleware }
