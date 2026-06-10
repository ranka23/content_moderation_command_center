/**
 * EmailService
 *
 * Sends email notifications for moderation events:
 * - New items in the queue
 * - Auto-moderation actions taken
 * - SLA breaches / escalations
 * - Daily/weekly digests
 * - Assignment notifications
 *
 * Platform-agnostic; each platform provides SMTP config.
 *
 * Usage:
 *   const service = new EmailService(smtpConfig)
 *   await service.sendNotification('new_item', data, ['mod@example.com'])
 *   await service.sendDigest(['mod@example.com'], digestData)
 */

import nodemailer from 'nodemailer'

/**
 * SMTP transport configuration.
 */
export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  fromAddress: string
}

/**
 * Result of an email send attempt.
 */
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Builds HTML email bodies for different notification types.
 */
function buildEmailBody(
  type: string,
  data: Record<string, unknown>,
): { subject: string; html: string } {
  switch (type) {
    case 'new_item':
      return {
        subject: `[CMCC] New ${data['content_type'] || 'content'} awaiting moderation: ${data['title'] || 'Untitled'}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2271b1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🛡️ New Content for Moderation</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb;">
              <p><strong>Title:</strong> ${data['title'] || 'Untitled'}</p>
              <p><strong>Type:</strong> ${data['content_type'] || 'Unknown'}</p>
              <p><strong>Status:</strong> ${data['status'] || 'pending'}</p>
              ${data['spam_score'] ? `<p><strong>Spam Score:</strong> ${String(data['spam_score'])}%</p>` : ''}
            </div>
          </div>`,
      }

    case 'auto_moderated':
      return {
        subject: `[CMCC] Auto-moderated: ${data['title'] || 'Content'} marked as ${data['status'] || 'unknown'}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🤖 Auto-Moderation Action Taken</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb;">
              <p><strong>Title:</strong> ${data['title'] || 'Content'}</p>
              <p><strong>Action:</strong> Marked as <strong>${data['status'] || 'unknown'}</strong></p>
              ${data['reason'] ? `<p><strong>Reason:</strong> ${String(data['reason'])}</p>` : ''}
            </div>
          </div>`,
      }

    case 'escalation':
      return {
        subject: `[CMCC] ⚠️ Escalation: ${data['title'] || 'Queue Item'}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🚨 Item Escalated</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb;">
              <p><strong>Item:</strong> ${data['title'] || 'Unknown'}</p>
              <p><strong>Reason:</strong> ${data['reason'] || 'Escalation triggered'}</p>
              <p><strong>Level:</strong> ${data['level'] || 'warning'}</p>
            </div>
          </div>`,
      }

    case 'digest':
      return {
        subject: `[CMCC] Moderation Digest — ${new Date().toISOString().slice(0, 10)}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📊 CMCC Moderation Digest</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; background: #fef3c7; text-align: center;">
                    <strong style="font-size: 24px;">${data['pending_count'] || 0}</strong><br/>Pending
                  </td>
                  <td style="padding: 10px; background: #fce4ec; text-align: center;">
                    <strong style="font-size: 24px;">${data['spam_count'] || 0}</strong><br/>Spam
                  </td>
                  <td style="padding: 10px; background: #e8f5e9; text-align: center;">
                    <strong style="font-size: 24px;">${data['approved_today'] || 0}</strong><br/>Approved Today
                  </td>
                  <td style="padding: 10px; background: #e3f2fd; text-align: center;">
                    <strong style="font-size: 24px;">${data['total_queue'] || 0}</strong><br/>Total Queue
                  </td>
                </tr>
              </table>
            </div>
          </div>`,
      }

    case 'assignment':
      return {
        subject: `[CMCC] Item assigned to you: ${data['title'] || 'Queue Item'}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">👤 Item Assigned to You</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb;">
              <p><strong>Item:</strong> ${data['title'] || 'Unknown'}</p>
              <p><strong>Assigned by:</strong> ${data['assigned_by'] || 'System'}</p>
              ${data['due_date'] ? `<p><strong>Due:</strong> ${String(data['due_date'])}</p>` : ''}
              ${data['priority'] ? `<p><strong>Priority:</strong> ${String(data['priority'])}</p>` : ''}
            </div>
          </div>`,
      }

    default:
      return {
        subject: '[CMCC] Notification',
        html: '<p>CMCC notification</p>',
      }
  }
}

/**
 * Email notification service for CMCC moderation events.
 */
export class EmailService {
  private transporter: nodemailer.Transporter
  private fromAddress: string
  private defaultRecipients: string[]

  /**
   * @param config    SMTP configuration
   * @param defaults  Default recipient email addresses
   */
  constructor(config: SmtpConfig, defaults: string[] = []) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    })
    this.fromAddress = config.fromAddress
    this.defaultRecipients = defaults
  }

  /**
   * Send a notification email for a moderation event.
   *
   * @param type  - Notification type: new_item, auto_moderated, escalation, digest, assignment
   * @param data  - Event-specific data for the email template
   * @param to    - Recipient email addresses (falls back to defaults)
   * @returns EmailResult with success status
   */
  async sendNotification(
    type: string,
    data: Record<string, unknown>,
    to?: string[],
  ): Promise<EmailResult> {
    const recipients = to && to.length > 0 ? to : this.defaultRecipients
    if (!recipients || recipients.length === 0) {
      return { success: false, error: 'No recipients specified' }
    }

    try {
      const { subject, html } = buildEmailBody(type, data)

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipients.join(', '),
        subject,
        html,
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown email error'
      return { success: false, error: message }
    }
  }

  /**
   * Send a moderation digest to specified recipients.
   *
   * @param to        - Recipient email addresses
   * @param digestData - Digest data (pending_count, spam_count, etc.)
   */
  async sendDigest(
    to: string[],
    digestData?: Record<string, unknown>,
  ): Promise<EmailResult> {
    const data = digestData || {
      pending_count: 0,
      spam_count: 0,
      approved_today: 0,
      total_queue: 0,
    }
    return this.sendNotification('digest', data, to)
  }
}
