'use strict'

module.exports = {
  'queue-item': {
    schema: {
      collectionName: 'cmcc_queue_items',
      info: {
        singularName: 'queue-item',
        pluralName: 'queue-items',
        displayName: 'Queue Item',
        description: 'CMCC moderation queue items',
      },
      options: {
        draftAndPublish: false,
      },
      pluginOptions: {
        'content-manager': {
          visible: true,
        },
        'content-type-builder': {
          visible: false,
        },
      },
      attributes: {
        itemId: {
          type: 'string',
          required: true,
        },
        contentType: {
          type: 'string',
          required: true,
        },
        status: {
          type: 'enumeration',
          enum: ['pending', 'approved', 'rejected', 'spam', 'deferred'],
          default: 'pending',
          required: true,
        },
        spamScore: {
          type: 'decimal',
          default: 0,
        },
        authorId: {
          type: 'string',
        },
        dateGmt: {
          type: 'datetime',
        },
        title: {
          type: 'string',
          maxLength: 500,
        },
        excerpt: {
          type: 'text',
        },
      },
    },
  },
  'activity-log': {
    schema: {
      collectionName: 'cmcc_activity_logs',
      info: {
        singularName: 'activity-log',
        pluralName: 'activity-logs',
        displayName: 'Activity Log',
        description: 'CMCC moderation activity audit trail',
      },
      options: {
        draftAndPublish: false,
      },
      pluginOptions: {
        'content-manager': {
          visible: true,
        },
        'content-type-builder': {
          visible: false,
        },
      },
      attributes: {
        moderatorId: {
          type: 'string',
          required: true,
        },
        action: {
          type: 'enumeration',
          enum: ['approved', 'rejected', 'marked_spam', 'deferred'],
          required: true,
        },
        contentType: {
          type: 'string',
          required: true,
        },
        itemId: {
          type: 'string',
          required: true,
        },
        previousStatus: {
          type: 'enumeration',
          enum: ['pending', 'approved', 'rejected', 'spam', 'deferred'],
        },
        newStatus: {
          type: 'enumeration',
          enum: ['pending', 'approved', 'rejected', 'spam', 'deferred'],
        },
      },
    },
  },
  settings: {
    schema: {
      collectionName: 'cmcc_settings',
      info: {
        singularName: 'settings',
        pluralName: 'settings',
        displayName: 'CMCC Settings',
        description: 'CMCC plugin settings',
      },
      options: {
        draftAndPublish: false,
      },
      pluginOptions: {
        'content-manager': {
          visible: true,
        },
        'content-type-builder': {
          visible: false,
        },
      },
      attributes: {
        autoModerate: {
          type: 'boolean',
          default: false,
        },
        moderationBehavior: {
          type: 'enumeration',
          enum: ['flag', 'spam', 'discard'],
          default: 'flag',
        },
        maxLinks: {
          type: 'integer',
          default: 5,
        },
        blacklistedKeywords: {
          type: 'json',
        },
        duplicateDetection: {
          type: 'boolean',
          default: true,
        },
        notifyOnSpam: {
          type: 'boolean',
          default: true,
        },
      },
    },
  },
}
