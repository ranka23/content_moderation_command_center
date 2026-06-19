'use strict'

const PLUGIN_ID = 'cmcc'

// Lazy-loaded references to @cmcc/core functions
let createAiAdapter
let getDefaultAiConfig
let processAnalytics
let getEmptyAnalytics
let ReputationService
let generateUserReputationSummary
let generateContentTypeBreakdown
let generateModeratorPerformance
let AssignmentManager
let ConflictDetector

try {
  const cmccCore = require('@cmcc/core')
  createAiAdapter = cmccCore.createAiAdapter
  getDefaultAiConfig = cmccCore.getDefaultAiConfig
  processAnalytics = cmccCore.processAnalytics
  getEmptyAnalytics = cmccCore.getEmptyAnalytics
  ReputationService = cmccCore.ReputationService
  generateUserReputationSummary = cmccCore.generateUserReputationSummary
  generateContentTypeBreakdown = cmccCore.generateContentTypeBreakdown
  generateModeratorPerformance = cmccCore.generateModeratorPerformance
  AssignmentManager = cmccCore.AssignmentManager
  ConflictDetector = cmccCore.ConflictDetector
} catch {
  // @cmcc/core not available — features will skip gracefully
}

/** In-memory stores shared across service modules */
const notesStore = {}
const assignmentStore = {}
const activityFeedEvents = []
let feedEventIdCounter = 1
let noteIdCounter = 1

function getNextFeedEventId() {
  return ++feedEventIdCounter
}
function getNextNoteId() {
  return ++noteIdCounter
}

module.exports = {
  PLUGIN_ID,
  createAiAdapter,
  getDefaultAiConfig,
  processAnalytics,
  getEmptyAnalytics,
  ReputationService,
  generateUserReputationSummary,
  generateContentTypeBreakdown,
  generateModeratorPerformance,
  AssignmentManager,
  ConflictDetector,
  notesStore,
  assignmentStore,
  activityFeedEvents,
  feedEventIdCounter,
  noteIdCounter,
  getNextFeedEventId,
  getNextNoteId,
}
