import pluginPkg from '../../package.json'
import pluginId from './pluginId'
// I18n translations loaded at runtime via registerTrads
const _trads = require('./translations/en.json')

const _pluginDescription = pluginPkg.strapi.description || pluginPkg.description

// ─── Permissions ─────────────────────────────────────────────────
const _permissions = {
  'plugin::cmcc.queue.read': {
    label: { id: 'cmcc.Queue', defaultMessage: 'Queue' },
  },
  'plugin::cmcc.queue.moderate': {
    label: { id: 'cmcc.Moderate', defaultMessage: 'Moderate' },
  },
  'plugin::cmcc.queue.bulk': {
    label: { id: 'cmcc.Bulk', defaultMessage: 'Bulk Moderation' },
  },
  'plugin::cmcc.analytics.read': {
    label: { id: 'cmcc.Analytics', defaultMessage: 'Analytics' },
  },
  'plugin::cmcc.settings.read': {
    label: { id: 'cmcc.Settings.Read', defaultMessage: 'Read Settings' },
  },
  'plugin::cmcc.settings.update': {
    label: {
      id: 'cmcc.Settings.Update',
      defaultMessage: 'Update Settings',
    },
  },
  'plugin::cmcc.activity-log.read': {
    label: {
      id: 'cmcc.ActivityLog',
      defaultMessage: 'Activity Log',
    },
  },
}

// ─── Plugin registration (Strapi 5 API) ───────────────────────────
const plugin = {
  register(app) {
    // Register the plugin config so Strapi knows about it
    app.registerPlugin({
      id: pluginId,
      name: pluginId,
      isReady: true,
      apis: {},
      injectionZones: {},
    })

    // Add sidebar menu link
    app.addMenuLink({
      to: pluginId,
      icon: 'Shield',
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'CMCC',
      },
      permissions: [],
      position: 5,
    })

    // Add plugin route – lazy-load the App component
    app.router.addRoute({
      path: `${pluginId}/*`,
      lazy: async () => {
        const mod = await import('./pages/App')
        const AppComponent = mod.default
        return { Component: AppComponent }
      },
    })
  },

  bootstrap() {
    // Called after all plugins have been registered.
    // No-op for CMCC – everything is set up in register().
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({
            data: prefixTrads(data, pluginId),
            locale,
          }))
          .catch(() => ({
            data: {},
            locale,
          }))
      }),
    )
    return importedTrads
  },
}

/**
 * Prefix translation keys with the plugin ID.
 */
function prefixTrads(data, id) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [`${id}.${key}`, value]),
  )
}

export default plugin
