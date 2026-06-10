/**
 * Content hooks routes: list and toggle auto-import hooks.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerHookRoutes(router, db, services) {
  const contentHookService = services.contentHookService

  // Register default hooks from DB on startup
  const dbHooks = db.prepare('SELECT * FROM content_hooks').all()
  for (const hook of dbHooks) {
    contentHookService.registerHook({
      name: hook.name,
      contentType: hook.contentType,
      description: hook.description || '',
      enabled: !!hook.enabled,
    })
  }

  /**
   * GET /api/cmcc/hooks
   * List all registered content hooks.
   */
  router.get('/hooks', (req, res) => {
    const hooks = contentHookService.getHooks()
    res.json(hooks)
  })

  /**
   * POST /api/cmcc/hooks/:name/toggle
   * Enable or disable a content hook.
   */
  router.post('/hooks/:name/toggle', (req, res) => {
    const { name } = req.params
    const { enabled } = req.body

    const hooks = contentHookService.getHooks()
    const hook = hooks.find((h) => h.name === name)

    if (!hook) {
      return res.status(404).json({ error: `Hook "${name}" not found` })
    }

    if (enabled) {
      contentHookService.enableHook(name)
    } else {
      contentHookService.disableHook(name)
    }

    // Persist to DB
    db.prepare(
      'INSERT OR REPLACE INTO content_hooks (name, contentType, description, enabled, createdAt) VALUES (?, ?, ?, ?, ?)',
    ).run(
      name,
      hook.contentType,
      hook.description,
      enabled ? 1 : 0,
      hook.createdAt || new Date().toISOString(),
    )

    res.json({ success: true, name, enabled })
  })
}

module.exports = { registerHookRoutes }
