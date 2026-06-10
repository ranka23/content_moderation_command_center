/**
 * Hooks routes - content hook management endpoints.
 */

const express = require('express')
const router = express.Router()

module.exports = function (services) {
  const { contentHookService } = services

  // GET /api/cmcc/hooks - List all content hooks
  router.get('/', (req, res) => {
    const hooks = contentHookService.getHooks()
    res.json({ success: true, data: hooks })
  })

  // POST /api/cmcc/hooks/:name/toggle - Toggle a content hook
  router.post('/:name/toggle', (req, res) => {
    const { name } = req.params
    const hooks = contentHookService.getHooks()
    const hook = hooks.find((h) => h.name === name)

    if (!hook) {
      return res.status(404).json({ success: false, error: `Hook "${name}" not found` })
    }

    if (hook.enabled) {
      contentHookService.disableHook(name)
    } else {
      contentHookService.enableHook(name)
    }

    const updated = contentHookService.getHooks().find((h) => h.name === name)
    res.json({ success: true, data: updated })
  })

  return router
}
