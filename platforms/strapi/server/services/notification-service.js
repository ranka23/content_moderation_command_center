'use strict'

const { EmailService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi notification service wrapping @cmcc/server-core EmailService.
 * Handles sending email notifications for moderation events and
 * persists notification logs to the database.
 */
module.exports = ({ strapi }) => {
  let emailService = null

  /**
   * Lazily initialize the email service with settings from the database.
   */
  async function ensureService() {
    if (emailService) return emailService

    try {
      const settings = strapi.plugin(PLUGIN_ID).config('default') || {}
      const smtpConfig = {
        host: settings.smtpHost || 'localhost',
        port: settings.smtpPort || 25,
        secure: settings.smtpSecure || false,
        auth: {
          user: settings.smtpUser || '',
          pass: settings.smtpPass || '',
        },
        fromAddress: settings.fromAddress || 'cmcc@localhost',
      }

      emailService = new EmailService(smtpConfig, settings.notificationRecipients || [])
    } catch {
      // If SMTP config is not available, create a minimal service
      emailService = new EmailService(
        { host: 'localhost', port: 25, secure: false, auth: { user: '', pass: '' }, fromAddress: 'cmcc@localhost' },
        [],
      )
    }

    return emailService
  }

  return {
    /**
     * Send a notification email and log it to the database.
     */
    async sendNotification(type, data, recipients) {
      const service = await ensureService()
      const result = await service.sendNotification(type, data, recipients)

      // Log the notification
      await strapi.entityService.create(`plugin::${PLUGIN_ID}.notification-log`, {
        data: {
          type,
          recipients: recipients || [],
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId || '',
          error: result.error || '',
        },
      })

      return result
    },

    /**
     * Send a digest email.
     */
    async sendDigest(recipients, digestData) {
      const service = await ensureService()
      const result = await service.sendDigest(recipients, digestData)

      await strapi.entityService.create(`plugin::${PLUGIN_ID}.notification-log`, {
        data: {
          type: 'digest',
          recipients: recipients || [],
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId || '',
          error: result.error || '',
        },
      })

      return result
    },

    /**
     * Get notification settings from the database.
     * Falls back to defaults if none exist.
     */
    async getSettings() {
      const entries = await strapi.entityService.findMany(
        `plugin::${PLUGIN_ID}.notification-log`,
        { start: 0, limit: 1 },
      )

      if (entries && entries.length > 0) {
        const s = entries[0]
        return {
          smtpHost: s.smtpHost || 'localhost',
          smtpPort: s.smtpPort || 25,
          smtpSecure: s.smtpSecure || false,
          notifyOnApprove: s.notifyOnApprove !== false,
          notifyOnReject: s.notifyOnReject !== false,
          notifyOnSpam: s.notifyOnSpam !== false,
          recipients: s.recipients || [],
        }
      }

      return {
        smtpHost: 'localhost',
        smtpPort: 25,
        smtpSecure: false,
        notifyOnApprove: true,
        notifyOnReject: true,
        notifyOnSpam: true,
        recipients: [],
      }
    },

    /**
     * Update notification settings.
     * Note: Settings are stored in the first notification-log entry (singleton pattern).
     * In production, a dedicated settings content-type would be preferred.
     */
    async updateSettings(settings) {
      const entries = await strapi.entityService.findMany(
        `plugin::${PLUGIN_ID}.notification-log`,
        { start: 0, limit: 1 },
      )

      if (entries && entries.length > 0) {
        await strapi.entityService.update(
          `plugin::${PLUGIN_ID}.notification-log`,
          entries[0].id,
          { data: settings },
        )
      }

      return { success: true }
    },
  }
}
