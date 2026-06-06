'use strict'

const register = require('./register')
const bootstrap = require('./bootstrap')
const destroy = require('./destroy')
const config = require('./config')
const contentTypes = require('./content-types')
const controllers = require('./controllers/cmcc-controller')
const services = require('./services/cmcc-service')
const routes = require('./routes')

module.exports = {
  register,
  bootstrap,
  destroy,
  config,
  contentTypes,
  controllers,
  services,
  routes,
}
