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
          enum: [
            'pending',
            'approved',
            'rejected',
            'spam',
            'deferred',
            'flagged',
          ],
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
        aiEvaluation: {
          type: 'json',
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
          enum: [
            'approved',
            'rejected',
            'marked_spam',
            'deferred',
            'flag',
            'deactivate-users',
          ],
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
          enum: [
            'pending',
            'approved',
            'rejected',
            'spam',
            'deferred',
            'flagged',
          ],
        },
        newStatus: {
          type: 'enumeration',
          enum: [
            'pending',
            'approved',
            'rejected',
            'spam',
            'deferred',
            'flagged',
          ],
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
        aiConfig: {
          type: 'json',
          default: {
            engine: 'none',
            apiKey: '',
            model: '',
            apiEndpoint: '',
            maxContentLength: 5000,
            timeoutMs: 30000,
          },
        },
      },
    },
  },
  'scheduled-report': {
    schema: {
      collectionName: 'cmcc_scheduled_reports',
      info: {
        singularName: 'scheduled-report',
        pluralName: 'scheduled-reports',
        displayName: 'Scheduled Report',
        description: 'CMCC recurring report schedules',
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
        type: {
          type: 'string',
          required: true,
        },
        frequency: {
          type: 'enumeration',
          enum: ['daily', 'weekly', 'monthly'],
          required: true,
        },
        format: {
          type: 'enumeration',
          enum: ['csv', 'json'],
          default: 'csv',
        },
        emails: {
          type: 'json',
        },
        createdBy: {
          type: 'string',
        },
        lastSentAt: {
          type: 'datetime',
        },
        active: {
          type: 'boolean',
          default: true,
        },
      },
    },
  },
  'webhook-config': {
    schema: {
      collectionName: 'cmcc_webhook_configs',
      info: {
        singularName: 'webhook-config',
        pluralName: 'webhook-configs',
        displayName: 'Webhook Config',
        description: 'CMCC webhook endpoint configurations',
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
        url: {
          type: 'string',
          required: true,
        },
        events: {
          type: 'json',
          required: true,
        },
        secret: {
          type: 'string',
        },
        headers: {
          type: 'json',
        },
        active: {
          type: 'boolean',
          default: true,
        },
      },
    },
  },
  'notification-log': {
    schema: {
      collectionName: 'cmcc_notification_logs',
      info: {
        singularName: 'notification-log',
        pluralName: 'notification-logs',
        displayName: 'Notification Log',
        description: 'CMCC sent notification tracking',
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
        type: {
          type: 'string',
          required: true,
        },
        recipients: {
          type: 'json',
        },
        status: {
          type: 'enumeration',
          enum: ['sent', 'failed'],
          default: 'sent',
        },
        messageId: {
          type: 'string',
        },
        error: {
          type: 'text',
        },
      },
    },
  },
}
