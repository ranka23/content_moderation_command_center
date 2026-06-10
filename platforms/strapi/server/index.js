'use strict'

const register = require('./register')
const bootstrap = require('./bootstrap')
const destroy = require('./destroy')
const config = require('./config')
const contentTypes = require('./content-types')
const controllers = {
  cmccController: require('./controllers/cmcc-controller'),
}
const services = {
  cmccService: require('./services/cmcc-service'),
  firewallService: require('./services/firewall-service'),
  notificationService: require('./services/notification-service'),
  webhookService: require('./services/webhook-service'),
  contentHookService: require('./services/content-hook-service'),
  undoService: require('./services/undo-service'),
  retentionService: require('./services/retention-service'),
  syncReceiver: require('./services/sync-receiver'),
}
const routes = require('./routes')

module.exports = () => ({
  register,
  bootstrap,
  destroy,
  config,
  contentTypes,
  controllers,
  services,
  routes,
})
