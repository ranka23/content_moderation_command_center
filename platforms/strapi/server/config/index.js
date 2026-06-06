'use strict'

module.exports = {
  default: {
    autoModerate: false,
    moderationBehavior: 'flag',
    maxLinks: 5,
    blacklistedKeywords: [],
    duplicateDetection: true,
    notifyOnSpam: true,
  },
  validator: (config) => {
    if (typeof config.autoModerate !== 'boolean') {
      throw new Error('autoModerate must be a boolean')
    }
    if (!['flag', 'spam', 'discard'].includes(config.moderationBehavior)) {
      throw new Error('moderationBehavior must be one of: flag, spam, discard')
    }
    if (typeof config.maxLinks !== 'number' || config.maxLinks < 0) {
      throw new Error('maxLinks must be a non-negative number')
    }
    if (!Array.isArray(config.blacklistedKeywords)) {
      throw new Error('blacklistedKeywords must be an array')
    }
    if (typeof config.duplicateDetection !== 'boolean') {
      throw new Error('duplicateDetection must be a boolean')
    }
    if (typeof config.notifyOnSpam !== 'boolean') {
      throw new Error('notifyOnSpam must be a boolean')
    }
  },
}
