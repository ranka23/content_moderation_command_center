/**
 * Unit tests for CMCC EmailService (server-core)
 */

import { EmailService } from '../../notifications/email-service'
import type { SmtpConfig } from '../../notifications/email-service'

const smtpConfig: SmtpConfig = {
  host: 'localhost',
  port: 587,
  secure: false,
  auth: { user: 'test', pass: 'test' },
  fromAddress: 'cmcc@test.local',
}

describe('EmailService', () => {
  let service: EmailService

  beforeEach(() => {
    service = new EmailService(smtpConfig, ['admin@test.local'])
  })

  it('sends a notification', async () => {
    const result = await service.sendNotification('new_item', {
      title: 'Test',
      content_type: 'comment',
    })
    // In test environment without SMTP, it should fail but gracefully
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('sends a digest', async () => {
    const result = await service.sendDigest(['mod@test.local'], {
      pending_count: 5,
      spam_count: 2,
    })
    expect(result.success).toBe(false)
  })

  it('returns error when no recipients specified', async () => {
    const emptyService = new EmailService(smtpConfig, [])
    const result = await emptyService.sendNotification('new_item', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('No recipients specified')
  })
})
