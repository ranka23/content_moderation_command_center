<?php
/**
 * CMCC Email Notifications System
 *
 * Provides email notification capabilities for moderation events:
 * - New items in the queue
 * - Automated moderation actions taken
 * - SLA breaches and escalations
 * - Daily/weekly moderation digests
 * - Assignment notifications
 *
 * Corresponds to Section 9: Email Notifications
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Send an email notification for a moderation event.
 *
 * @param string $type    Notification type (new_item, auto_moderated, escalation, digest, assignment).
 * @param array  $data    Notification data.
 * @param array  $to      Array of recipient email addresses.
 * @return bool Whether the email was sent successfully.
 */
function cmcc_send_notification( string $type, array $data, array $to = array() ): bool {
    $settings = get_option( CMCC_SETTINGS_OPTION, array() );
    $notify_settings = isset( $settings['notifications'] ) ? $settings['notifications'] : array();

    // Check if notifications are enabled
    if ( empty( $notify_settings['email_alerts'] ) ) {
        return false;
    }

    if ( empty( $to ) ) {
        $to = cmcc_get_moderator_emails();
    }

    if ( empty( $to ) ) {
        return false;
    }

    $subject = '';
    $message = '';

    switch ( $type ) {
        case 'new_item':
            $subject = sprintf(
                '[CMCC] New %s awaiting moderation: %s',
                isset( $data['content_type'] ) ? $data['content_type'] : 'content',
                isset( $data['title'] ) ? $data['title'] : 'Untitled'
            );
            $message = cmcc_build_new_item_email( $data );
            break;

        case 'auto_moderated':
            $subject = sprintf(
                '[CMCC] Auto-moderated: %s marked as %s',
                isset( $data['title'] ) ? $data['title'] : 'Content',
                isset( $data['status'] ) ? $data['status'] : 'unknown'
            );
            $message = cmcc_build_auto_moderated_email( $data );
            break;

        case 'escalation':
            $subject = sprintf(
                '[CMCC] ⚠️ Escalation: %s',
                isset( $data['title'] ) ? $data['title'] : 'Queue Item'
            );
            $message = cmcc_build_escalation_email( $data );
            break;

        case 'digest':
            $subject = sprintf(
                '[CMCC] Moderation Digest — %s',
                current_time( 'Y-m-d' )
            );
            $message = cmcc_build_digest_email( $data );
            break;

        case 'assignment':
            $subject = sprintf(
                '[CMCC] Item assigned to you: %s',
                isset( $data['title'] ) ? $data['title'] : 'Queue Item'
            );
            $message = cmcc_build_assignment_email( $data );
            break;

        default:
            return false;
    }

    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . get_bloginfo( 'name' ) . ' <' . get_bloginfo( 'admin_email' ) . '>',
    );

    return wp_mail( $to, $subject, $message, $headers );
}

/**
 * Get email addresses of all moderators.
 *
 * @return array List of moderator email addresses.
 */
function cmcc_get_moderator_emails(): array {
    $settings = get_option( CMCC_SETTINGS_OPTION, array() );
    $mod_roles = isset( $settings['moderator_management']['moderator_roles'] )
        ? $settings['moderator_management']['moderator_roles']
        : array( 'administrator' );

    $emails = array();
    foreach ( $mod_roles as $role ) {
        $users = get_users( array( 'role__in' => array( $role ) ) );
        foreach ( $users as $user ) {
            $emails[] = $user->user_email;
        }
    }

    return array_unique( $emails );
}

/**
 * Send a webhook notification.
 *
 * @param string $type Webhook type (new_items, approvals, spam).
 * @param array  $data Payload data.
 */
function cmcc_send_webhook( string $type, array $data ): void {
    $settings = get_option( CMCC_SETTINGS_OPTION, array() );
    $webhooks = isset( $settings['api_webhooks'] ) ? $settings['api_webhooks'] : array();

    $url_map = array(
        'new_items'  => 'webhook_new_items',
        'approvals'  => 'webhook_approvals',
        'spam'       => 'webhook_spam',
    );

    $option_key = isset( $url_map[ $type ] ) ? $url_map[ $type ] : '';
    if ( '' === $option_key || empty( $webhooks[ $option_key ] ) ) {
        return;
    }

    $url = $webhooks[ $option_key ];

    // Validate URL before sending
    if ( ! wp_http_validate_url( $url ) ) {
        error_log( 'CMCC Webhook: Invalid URL configured for type "' . $type . '": ' . $url );
        return;
    }

    $payload = array_merge( $data, array(
        'type'      => $type,
        'site_url'  => get_site_url(),
        'timestamp' => current_time( 'mysql' ),
    ) );

    wp_remote_post( $url, array(
        'body'    => wp_json_encode( $payload ),
        'headers' => array( 'Content-Type' => 'application/json' ),
        'timeout' => 10,
        'blocking' => false,
    ) );
}

/**
 * Send moderation digest to moderators.
 *
 * @param array $data Digest data (counts, summary).
 */
function cmcc_send_digest( array $data = array() ): void {
    if ( empty( $data ) ) {
        global $wpdb;
        $table = CMCC_QUEUE_TABLE;
        $log_table = CMCC_ACTIVITY_LOG_TABLE;

        $data = array(
            'pending_count'  => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status = 'pending'" ),
            'spam_count'     => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status = 'spam'" ),
            'approved_today' => (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM {$log_table} WHERE action = 'approve' AND DATE(timestamp) = %s",
                current_time( 'Y-m-d' )
            ) ),
            'total_queue'    => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ),
        );
    }

    cmcc_send_notification( 'digest', $data, cmcc_get_moderator_emails() );
}

/**
 * Build HTML email for new item notification.
 */
function cmcc_build_new_item_email( array $data ): string {
    $blog_name = get_bloginfo( 'name' );
    $admin_url = admin_url( 'admin.php?page=cmcc' );

    ob_start();
    ?>
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2271b1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🛡️ New Content for Moderation</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Title:</strong> <?php echo esc_html( $data['title'] ?? 'Untitled' ); ?></p>
            <p><strong>Type:</strong> <?php echo esc_html( $data['content_type'] ?? 'Unknown' ); ?></p>
            <p><strong>Status:</strong> <?php echo esc_html( $data['status'] ?? 'pending' ); ?></p>
            <?php if ( isset( $data['spam_score'] ) ) : ?>
                <p><strong>Spam Score:</strong> <?php echo intval( $data['spam_score'] ); ?>%</p>
            <?php endif; ?>
            <p style="margin-top: 20px;">
                <a href="<?php echo esc_url( $admin_url ); ?>"
                   style="display: inline-block; padding: 10px 20px; background: #2271b1; color: white; text-decoration: none; border-radius: 4px;">
                    Open Moderation Queue
                </a>
            </p>
        </div>
        <div style="padding: 15px 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
            <p>This notification was sent by CMCC on <?php echo esc_html( $blog_name ); ?>.</p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Build HTML email for auto-moderated content.
 */
function cmcc_build_auto_moderated_email( array $data ): string {
    $admin_url = admin_url( 'admin.php?page=cmcc' );

    ob_start();
    ?>
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🤖 Auto-Moderation Action Taken</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Title:</strong> <?php echo esc_html( $data['title'] ?? 'Content' ); ?></p>
            <p><strong>Action:</strong> Marked as <strong><?php echo esc_html( $data['status'] ?? 'unknown' ); ?></strong></p>
            <?php if ( isset( $data['reason'] ) ) : ?>
                <p><strong>Reason:</strong> <?php echo esc_html( $data['reason'] ); ?></p>
            <?php endif; ?>
            <p style="margin-top: 20px;">
                <a href="<?php echo esc_url( $admin_url ); ?>"
                   style="display: inline-block; padding: 10px 20px; background: #2271b1; color: white; text-decoration: none; border-radius: 4px;">
                    Review in Queue
                </a>
            </p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Build HTML email for escalation notification.
 */
function cmcc_build_escalation_email( array $data ): string {
    $admin_url = admin_url( 'admin.php?page=cmcc' );

    ob_start();
    ?>
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🚨 Item Escalated</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Item:</strong> <?php echo esc_html( $data['title'] ?? 'Unknown' ); ?></p>
            <p><strong>Reason:</strong> <?php echo esc_html( $data['reason'] ?? 'Escalation triggered' ); ?></p>
            <p><strong>Level:</strong> <?php echo esc_html( $data['level'] ?? 'warning' ); ?></p>
            <p style="margin-top: 20px;">
                <a href="<?php echo esc_url( $admin_url ); ?>"
                   style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 4px;">
                    View Item
                </a>
            </p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Build HTML email for assignment notification.
 */
function cmcc_build_assignment_email( array $data ): string {
    $admin_url = admin_url( 'admin.php?page=cmcc' );

    ob_start();
    ?>
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">👤 Item Assigned to You</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Item:</strong> <?php echo esc_html( $data['title'] ?? 'Unknown' ); ?></p>
            <p><strong>Assigned by:</strong> <?php echo esc_html( $data['assigned_by'] ?? 'System' ); ?></p>
            <?php if ( isset( $data['due_date'] ) ) : ?>
                <p><strong>Due:</strong> <?php echo esc_html( $data['due_date'] ); ?></p>
            <?php endif; ?>
            <?php if ( isset( $data['priority'] ) ) : ?>
                <p><strong>Priority:</strong> <?php echo esc_html( $data['priority'] ); ?></p>
            <?php endif; ?>
            <p style="margin-top: 20px;">
                <a href="<?php echo esc_url( $admin_url ); ?>"
                   style="display: inline-block; padding: 10px 20px; background: #7c3aed; color: white; text-decoration: none; border-radius: 4px;">
                    View Assignment
                </a>
            </p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Build HTML email for moderation digest.
 */
function cmcc_build_digest_email( array $data ): string {
    $blog_name = get_bloginfo( 'name' );
    $admin_url = admin_url( 'admin.php?page=cmcc-analytics' );

    ob_start();
    ?>
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">📊 CMCC Moderation Digest</h2>
            <p style="margin: 5px 0 0;"><?php echo esc_html( $blog_name ); ?> — <?php echo esc_html( current_time( 'Y-m-d' ) ); ?></p>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; background: #fef3c7; text-align: center; border-radius: 4px;">
                        <strong style="font-size: 24px;"><?php echo intval( $data['pending_count'] ?? 0 ); ?></strong>
                        <br><span style="font-size: 12px;">Pending</span>
                    </td>
                    <td style="padding: 10px; background: #fce4ec; text-align: center; border-radius: 4px;">
                        <strong style="font-size: 24px;"><?php echo intval( $data['spam_count'] ?? 0 ); ?></strong>
                        <br><span style="font-size: 12px;">Spam</span>
                    </td>
                    <td style="padding: 10px; background: #e8f5e9; text-align: center; border-radius: 4px;">
                        <strong style="font-size: 24px;"><?php echo intval( $data['approved_today'] ?? 0 ); ?></strong>
                        <br><span style="font-size: 12px;">Approved Today</span>
                    </td>
                    <td style="padding: 10px; background: #e3f2fd; text-align: center; border-radius: 4px;">
                        <strong style="font-size: 24px;"><?php echo intval( $data['total_queue'] ?? 0 ); ?></strong>
                        <br><span style="font-size: 12px;">Total Queue</span>
                    </td>
                </tr>
            </table>
            <p style="margin-top: 20px;">
                <a href="<?php echo esc_url( $admin_url ); ?>"
                   style="display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 4px;">
                    View Full Analytics
                </a>
            </p>
        </div>
        <div style="padding: 15px 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
            <p>This is an automated digest from CMCC. Configure notification settings in the CMCC admin panel.</p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
