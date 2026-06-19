/**
 * CMCC — Strapi Admin Vite Configuration
 *
 * Ensures @cmcc/ui is pre-bundled by Vite so it doesn't cause
 * "504 Outdated Optimize Dep" errors when loaded at runtime.
 */
'use strict'

/** @param {import('vite').InlineConfig} config */
module.exports = (config) => {
  // Ensure optimizeDeps exists
  config.optimizeDeps ??= {}
  config.optimizeDeps.include ??= []

  // Add @cmcc packages to the pre-bundle list so Vite discovers them
  // eagerly instead of lazily (which can cause 504 race conditions).
  const cmccPkgs = [
    '@cmcc/ui',
    '@cmcc/core',
    '@cmcc/server-core',
  ]
  for (const pkg of cmccPkgs) {
    if (!config.optimizeDeps.include.includes(pkg)) {
      config.optimizeDeps.include.push(pkg)
    }
  }

  return config
}
