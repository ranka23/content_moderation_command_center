/**
 * Content Hooks routes
 */
const express = require('express')

// Default content hooks for Storyblok
const DEFAULT_HOOKS = [
  { name: 'storyblok-content', contentType: 'story', description: 'Auto-import Storyblok stories into moderation queue', enabled: true },
  { name: 'storyblok-comment', contentType: 'comment', description: 'Auto-import Storyblok comments into moderation queue', enabled: true },
]

function createHooksRouter(db, services = {}) {
  const router = express.Router()

  // Ensure default hooks exist
  function ensureDefaultHooks() {
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO content_hooks (name, content_type, description, enabled)
      VALUES (?, ?, ?, ?)
    `)
    for (const hook of DEFAULT_HOOKS) {
      insertStmt.run(hook.name, hook.contentType, hook.description, hook.enabled ? 1 : 0)
    }
  }
  ensureDefaultHooks()

  // ── GET /hooks — List content hooks ─────────────────────────────────
  router.get('/', (req, res) => {
    let hooks = db.prepare('SELECT * FROM content_hooks').all()

    // If no hooks in DB yet, return defaults
    if (hooks.length === 0) {
      hooks = DEFAULT_HOOKS
    }

    // Convert enabled to boolean
    hooks = hooks.map((h) => ({
      ...h,
      enabled: !!h.enabled,
    }))

    // Also get from ContentHookService if available
    if (services.contentHookService) {
      const serviceHooks = services.contentHookService.getHooks()
      for (const sh of serviceHooks) {
        const existing = hooks.find((h) => h.name === sh.name)
        if (!existing) {
          hooks.push({ name: sh.name, content_type: sh.contentType, description: sh.description, enabled: sh.enabled })
        }
      }
    }

    res.json({ hooks })
  })

  // ── POST /hooks/:name/toggle — Enable/disable a hook ────────────────
  router.post('/:name/toggle', (req, res) => {
    const { name } = req.params
    const { enabled } = req.body

    const existing = db.prepare('SELECT * FROM content_hooks WHERE name = ?').get(name)
    if (!existing) {
      return res.status(404).json({ error: `Hook "${name}" not found` })
    }

    const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : (existing.enabled ? 0 : 1)
    db.prepare('UPDATE content_hooks SET enabled = ? WHERE name = ?').run(newEnabled, name)

    // Also update ContentHookService if available
    if (services.contentHookService) {
      if (newEnabled) {
        services.contentHookService.enableHook(name)
      } else {
        services.contentHookService.disableHook(name)
      }
    }

    res.json({
      success: true,
      hook: {
        ...existing,
        enabled: !!newEnabled,
      },
    })
  })

  return router
}

module.exports = { createHooksRouter }
