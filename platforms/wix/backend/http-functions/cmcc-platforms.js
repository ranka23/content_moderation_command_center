/**
 * CMCC Platforms — Wix HTTP Functions
 *
 * REST API endpoints for platform status and sync.
 * Mounted at: /api/cmcc/platforms/*
 */

import { getSettings } from '../cmcc/data'

const PLATFORMS = [
  { name: 'Wix', icon: '🎪', status: 'active', connected: true },
  { name: 'Storyblok', icon: '🖼️', status: 'available', connected: false },
  { name: 'WordPress', icon: '🌐', status: 'available', connected: false },
  { name: 'Shopify', icon: '🛍️', status: 'available', connected: false },
  { name: 'Strapi', icon: '🟣', status: 'available', connected: false },
]

/**
 * GET /api/cmcc/platforms/status
 * Returns platform connection status.
 */
export async function get_status(_request) {
  return ok({
    platform: 'wix',
    connected: true,
    version: '1.0.0',
    platforms: PLATFORMS,
    services: {
      firewall: true,
      email: false,
      webhooks: true,
      retention: true,
      undo: true,
      reports: true,
      sync: true,
    },
  })
}

/**
 * POST /api/cmcc/platforms/sync-settings
 * Sync settings to other platforms.
 */
export async function post_sync_settings(request) {
  const { targetPlatforms } = request.body || {}

  try {
    const settings = await getSettings()
    return ok({
      success: true,
      platform: 'wix',
      syncedSettings: settings,
      targetPlatforms: targetPlatforms || [],
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/unified-queue
 * Returns aggregated queue across platforms.
 */
export async function get_unified_queue(request) {
  const page = parseInt(request.query.page, 10) || 0
  const pageSize = Math.min(100, parseInt(request.query.pageSize, 10) || 20)

  try {
    const { getQueueItems } = await import('../cmcc/data')
    const result = await getQueueItems({ page, pageSize })
    const platforms = [
      ...new Set(result.items.map((i) => i.platform).filter(Boolean)),
    ]

    return ok({
      items: result.items,
      platforms,
      pagination: {
        total: result.total,
        page,
        pageSize,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    return fail(err.message)
  }
}

function ok(body) {
  return { headers: { 'Content-Type': 'application/json' }, body }
}

function fail(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 500,
  }
}
