/**
 * Reputation routes - user reputation data endpoints.
 */

const express = require('express')
const router = express.Router()
const reputationService = require('../services/reputation-service')

module.exports = function (services) {
  const { db } = services

  // GET /api/cmcc/reputation/users - Get all user reputations
  router.get('/users', (req, res) => {
    const users = reputationService.getUserReputations(db)
    res.json({ success: true, data: users })
  })

  // GET /api/cmcc/reputation/user/:id - Get single user reputation
  router.get('/user/:id', (req, res, next) => {
    try {
      const user = reputationService.getUserReputation(db, req.params.id)
      res.json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  })

  return router
}
