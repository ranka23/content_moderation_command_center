import pluginPkg from '../../package.json'
import pluginId from './pluginId'
import App from './pages/App'
import Initializer from './components/Initializer'
import trads from './translations/en.json'

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description

const plugin = {
  pluginId,
  description: pluginDescription,
  icon: null,
  isReady: true,
  isRequired: false,
  mainComponent: App,
  initializer: Initializer,
  trads,
  permissions: {
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
  },
}

export default plugin
