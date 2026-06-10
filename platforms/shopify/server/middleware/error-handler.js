/**
 * Global error handler middleware for CMCC Shopify backend.
 * Provides consistent error responses across all routes.
 */

function errorHandler(err, req, res, _next) {
  console.error(`[CMCC Error] ${err.message}`)

  const statusCode = err.statusCode || 500
  const message = err.statusCode ? err.message : 'Internal server error'

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

module.exports = { errorHandler }
