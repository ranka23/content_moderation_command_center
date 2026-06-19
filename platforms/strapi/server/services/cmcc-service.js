'use strict'

const {
  ReputationService,
  AssignmentManager,
  ConflictDetector,
} = require('./cmcc-service-store')
const createCoreModule = require('./cmcc-service-core')
const createAnalyticsModule = require('./cmcc-service-analytics')
const createAdminModule = require('./cmcc-service-admin')
const createOpsModule = require('./cmcc-service-ops')

/**
 * CMCC service — stitches together domain sub-modules.
 * Each sub-module receives the dependencies it needs and returns its methods.
 */
module.exports = ({ strapi }) => {
  const StrapiReputationAdapter = require('./StrapiReputationAdapter')
  const reputationAdapter = new StrapiReputationAdapter(strapi)
  const reputationService = ReputationService
    ? new ReputationService({}, reputationAdapter)
    : null
  const assignmentManager = AssignmentManager ? new AssignmentManager() : null
  const conflictDetector = ConflictDetector ? new ConflictDetector() : null

  const core = createCoreModule({ strapi, assignmentManager, conflictDetector })
  const analytics = createAnalyticsModule({ strapi, reputationService })
  const admin = createAdminModule({ strapi, getQueue: core.getQueue })
  const ops = createOpsModule({ strapi, reputationService })

  return {
    ...core,
    ...analytics,
    ...admin,
    ...ops,
  }
}
