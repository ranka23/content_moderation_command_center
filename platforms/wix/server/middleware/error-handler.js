/**
 * Centralized error handling middleware.
 */
function errorHandler(err, req, res, _next) {
  if (err) {
    console.error('[CMCC Server Error]', err.message || err)
  }

  const statusCode = (err && err.statusCode) || 500
  const exposeMessage = err && err.expose
  const message =
    exposeMessage || statusCode < 500
      ? (err && err.message) || 'Unknown error'
      : 'Internal server error'

  res.status(statusCode).json({ error: message })
}

module.exports = { errorHandler }
