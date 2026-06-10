/**
 * CMCC Settings — Wix HTTP Functions
 *
 * REST API endpoints for settings management.
 * Mounted at: /api/cmcc/settings/*
 */

import { getSettings, updateSetting } from '../cmcc/data'

/**
 * POST /api/cmcc/settings/export
 * Export all settings as a JSON object.
 */
export async function post_export(_request) {
  try {
    const settings = await getSettings()
    return ok({
      data: settings,
      exportedAt: new Date().toISOString(),
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/settings/import
 * Import settings from a JSON object.
 */
export async function post_import(request) {
  const { settings } = request.body || {}

  if (!settings || typeof settings !== 'object') {
    return badRequest('settings must be a non-empty object')
  }

  try {
    const results = []
    for (const [key, value] of Object.entries(settings)) {
      await updateSetting(key, value)
      results.push({ key, success: true })
    }
    return ok({ success: true, updated: results.length })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/settings
 * Returns all CMCC settings as a key-value object.
 */
export async function get_settings(_request) {
  try {
    const settings = await getSettings()
    return ok(settings)
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/settings
 * Update multiple settings at once.
 * Body: { "key": "value", ... }
 */
export async function post_settings(request) {
  const settings = request.body || {}

  try {
    const results = []
    for (const [key, value] of Object.entries(settings)) {
      await updateSetting(key, value)
      results.push({ key, success: true })
    }
    return ok({ success: true, updated: results.length })
  } catch (err) {
    return fail(err.message)
  }
}

function ok(body) {
  return { headers: { 'Content-Type': 'application/json' }, body }
}

function badRequest(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 400,
  }
}

function fail(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 500,
  }
}
