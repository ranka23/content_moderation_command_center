/**
 * Settings routes - settings CRUD, export, and import.
 */

const express = require('express')
const router = express.Router()
const settingsService = require('../services/settings-service')

module.exports = function (services) {
  const { db } = services

  // GET /api/cmcc/settings - Get all settings
  router.get('/', (req, res) => {
    const settings = settingsService.getSettings(db)
    res.json({ success: true, data: settings })
  })

  // PUT /api/cmcc/settings - Update settings
  router.put('/', (req, res) => {
    const settings = settingsService.updateSettings(db, req.body)
    res.json({ success: true, data: settings })
  })

  // POST /api/cmcc/settings/export - Export settings
  router.post('/export', (req, res) => {
    const exported = settingsService.exportSettings(db)
    res.json({ success: true, data: exported })
  })

  // POST /api/cmcc/settings/import - Import settings
  router.post('/import', (req, res, next) => {
    try {
      const settings = settingsService.importSettings(db, req.body)
      res.json({ success: true, data: settings })
    } catch (err) {
      next(err)
    }
  })

  return router
}
