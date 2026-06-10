/**
 * CMCC Wix Server — Express.js entry point.
 *
 * Companion server for the CMCC Wix moderation app.
 * Provides REST API for queue management, analytics, settings,
 * reputation, collaboration, and cross-platform sync.
 *
 * Usage:
 *   node server/index.js
 *   # or via package.json: npm start
 */

require('dotenv').config()

const { createApp } = require('./app')
const { getDb } = require('./db')

const PORT = parseInt(process.env.PORT, 10) || 3003

// Initialize database (file-based for production, memory for dev)
const dbPath = process.env.DB_PATH
const db = getDb(dbPath)

// Create and start the Express application
const app = createApp(db)

app.listen(PORT, () => {
  console.log(`[CMCC Wix Server] Running on port ${PORT}`)
  console.log(`[CMCC Wix Server] API base: http://localhost:${PORT}/api/cmcc`)
  console.log(`[CMCC Wix Server] Database: ${dbPath || ':memory:'}`)
  console.log(`[CMCC Wix Server] CORS origin: ${process.env.CORS_ORIGIN || '*'}`)
})

module.exports = app
