/**
 * Error handling middleware
 */

/**
 * Global error handler middleware.
 * Catches unhandled errors and returns a consistent JSON response.
 */
function errorHandler(err, req, res, _next) {
  console.error('[CMCC Server Error]', err.stack || err.message || err)

  const statusCode = err.statusCode || 500
  const message =
    err.expose || statusCode < 500
      ? err.message
      : 'An internal server error occurred.'

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

/**
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

module.exports = { errorHandler, notFoundHandler }
