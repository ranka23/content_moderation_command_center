<?php
/**
 * CMCC Reports & Compliance Module
 *
 * Provides report generation for moderation activity, compliance audit trails,
 * moderator performance analytics, and scheduled report delivery.
 *
 * Corresponds to Section 10.4 of the Design Analysis:
 * - Moderation Reports (CSV export)
 * - Compliance Audit Trail
 * - Moderator Performance Analytics
 * - Scheduled Reports
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'cmcc_rest_reports_moderation_activity' ) ) :

/**
 * POST /cmcc/v1/reports/moderation-activity – Generate moderation activity report.
 *
 * Returns CSV-formatted data of moderation actions within a date range.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_moderation_activity( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );
    $format         = $request->get_param( 'format' );

    $start_date = $start_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) )
        : gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
    $end_date   = $end_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) )
        : gmdate( 'Y-m-d H:i:s' );

    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        ORDER BY l.timestamp DESC",
        $start_date,
        $end_date
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $headers = array( 'Date', 'Moderator', 'Action', 'Content Type', 'Item', 'Previous Status', 'New Status', 'Notes' );
    $csv_lines   = array();
    $csv_lines[] = implode( ',', $headers );

    foreach ( $results as $row ) {
        $csv_lines[] = implode( ',', array(
            $row->timestamp,
            cmcc_csv_escape( $row->moderator_name ? 'User #' . $row->moderator_id : '' ),
            $row->action,
            $row->content_type,
            cmcc_csv_escape( $row->item_title ?: $row->item_id ),
            $row->previous_status,
            $row->new_status,
            cmcc_csv_escape( $row->notes ?: '' ),
        ) );
    }

    return new WP_REST_Response( array(
        'success'  => true,
        'format'   => $format,
        'filename' => 'cmcc-moderation-activity-' . gmdate( 'Y-m-d' ) . '.csv',
        'headers'  => $headers,
        'data'     => $csv_lines,
    ), 200 );
}

endif; // cmcc_rest_reports_moderation_activity

if ( ! function_exists( 'cmcc_rest_reports_compliance_audit' ) ) :

/**
 * POST /cmcc/v1/reports/compliance-audit – Export full compliance audit log.
 *
 * Provides a complete audit trail including IP addresses, timestamps,
 * moderator identities, and all state changes.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_compliance_audit( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );

    $start_date = $start_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) )
        : gmdate( 'Y-m-d H:i:s', strtotime( '-90 days' ) );
    $end_date   = $end_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) )
        : gmdate( 'Y-m-d H:i:s' );

    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name, u.user_email as moderator_email
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        ORDER BY l.timestamp DESC",
        $start_date,
        $end_date
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $headers = array(
        'ID', 'Timestamp', 'Moderator ID', 'Moderator Name', 'Moderator Email',
        'Action', 'Content Type', 'Item ID', 'Item Title',
        'Previous Status', 'New Status', 'Notes',
    );
    $csv_lines   = array();
    $csv_lines[] = implode( ',', $headers );

    foreach ( $results as $row ) {
        $csv_lines[] = implode( ',', array(
            $row->id,
            $row->timestamp,
            $row->moderator_id,
            cmcc_csv_escape( $row->moderator_name ?: 'Unknown' ),
            $row->moderator_email ?: '',
            $row->action,
            $row->content_type,
            $row->item_id,
            cmcc_csv_escape( str_replace( ',', ';', $row->item_title ?: '' ) ),
            $row->previous_status,
            $row->new_status,
            cmcc_csv_escape( $row->notes ?: '' ),
        ) );
    }

    return new WP_REST_Response( array(
        'success'    => true,
        'filename'   => 'cmcc-compliance-audit-' . gmdate( 'Y-m-d' ) . '.csv',
        'headers'    => $headers,
        'data'       => $csv_lines,
        'total_rows' => count( $results ),
    ), 200 );
}

endif; // cmcc_rest_reports_compliance_audit

if ( ! function_exists( 'cmcc_rest_reports_moderator_performance' ) ) :

/**
 * GET /cmcc/v1/reports/moderator-performance – Get moderator performance analytics.
 *
 * Returns per-moderator metrics: action counts, approval rates, response times.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_moderator_performance( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );

    $start_date = $start_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) )
        : gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
    $end_date   = $end_date_raw
        ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) )
        : gmdate( 'Y-m-d H:i:s' );

    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT
            l.moderator_id,
            u.display_name as moderator_name,
            COUNT(*) as total_actions,
            SUM(CASE WHEN l.action = 'approve' THEN 1 ELSE 0 END) as approvals,
            SUM(CASE WHEN l.action = 'reject' THEN 1 ELSE 0 END) as rejections,
            SUM(CASE WHEN l.action = 'spam' THEN 1 ELSE 0 END) as spam_actions,
            SUM(CASE WHEN l.action = 'defer' THEN 1 ELSE 0 END) as defer_actions,
            SUM(CASE WHEN l.action = 'flag' THEN 1 ELSE 0 END) as flag_actions,
            SUM(CASE WHEN l.action = 'deactivate-users' THEN 1 ELSE 0 END) as deactivate_actions,
            MAX(l.timestamp) as last_action
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        GROUP BY l.moderator_id
        ORDER BY total_actions DESC",
        $start_date,
        $end_date
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $performance = array();
    foreach ( $results as $row ) {
        $total = (int) $row->total_actions;
        $performance[] = array(
            'moderator_id'     => $row->moderator_id,
            'moderator_name'   => $row->moderator_name ?: 'User #' . $row->moderator_id,
            'total_actions'    => $total,
            'approvals'        => (int) $row->approvals,
            'rejections'       => (int) $row->rejections,
            'spam_actions'     => (int) $row->spam_actions,
            'defer_actions'    => (int) $row->defer_actions,
            'flag_actions'     => (int) $row->flag_actions,
            'deactivate_actions' => (int) $row->deactivate_actions,
            'approval_rate'    => $total > 0 ? round( ( (int) $row->approvals / $total ) * 100, 1 ) : 0,
            'rejection_rate'   => $total > 0 ? round( ( (int) $row->rejections / $total ) * 100, 1 ) : 0,
            'spam_rate'        => $total > 0 ? round( ( (int) $row->spam_actions / $total ) * 100, 1 ) : 0,
            'last_action'      => $row->last_action,
        );
    }

    return new WP_REST_Response( array(
        'success'     => true,
        'performance' => $performance,
    ), 200 );
}

endif; // cmcc_rest_reports_moderator_performance

if ( ! function_exists( 'cmcc_rest_reports_scheduled' ) ) :

/**
 * POST /cmcc/v1/reports/scheduled – Schedule a recurring report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_scheduled( WP_REST_Request $request ): WP_REST_Response {
    $type      = sanitize_text_field( $request->get_param( 'type' ) );
    $frequency = sanitize_text_field( $request->get_param( 'frequency' ) );
    $format    = sanitize_text_field( $request->get_param( 'format' ) );
    $emails    = $request->get_param( 'emails' );

    $allowed_types      = array( 'moderation_activity', 'compliance_audit', 'moderator_performance' );
    $allowed_frequencies = array( 'daily', 'weekly', 'monthly' );

    if ( ! in_array( $type, $allowed_types, true ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid report type. Allowed: moderation_activity, compliance_audit, moderator_performance.', 'cmcc' ),
        ), 400 );
    }

    if ( ! in_array( $frequency, $allowed_frequencies, true ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid frequency. Allowed: daily, weekly, monthly.', 'cmcc' ),
        ), 400 );
    }

    $scheduled = get_option( 'cmcc_scheduled_reports', array() );

    $report = array(
        'id'        => uniqid( 'report_' ),
        'type'      => $type,
        'frequency' => $frequency,
        'format'    => in_array( $format, array( 'csv', 'json' ), true ) ? $format : 'csv',
        'emails'    => is_array( $emails ) ? array_map( 'sanitize_email', $emails ) : array(),
        'created'   => current_time( 'mysql' ),
        'next_run'  => current_time( 'mysql' ),
        'enabled'   => true,
    );

    $scheduled[] = $report;
    update_option( 'cmcc_scheduled_reports', $scheduled );

    // Schedule the cron event if not already scheduled.
    if ( ! wp_next_scheduled( 'cmcc_daily_report_cron' ) ) {
        wp_schedule_event( time(), 'daily', 'cmcc_daily_report_cron' );
    }

    return new WP_REST_Response( array(
        'success' => true,
        'report'  => $report,
        'message' => sprintf(
            /* translators: 1: report type, 2: frequency */
            esc_html__( 'Report scheduled: %1$s %2$s', 'cmcc' ),
            $type,
            $frequency
        ),
    ), 200 );
}

endif; // cmcc_rest_reports_scheduled

if ( ! function_exists( 'cmcc_rest_get_scheduled_reports' ) ) :

/**
 * GET /cmcc/v1/reports/scheduled – List all scheduled reports.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_scheduled_reports(): WP_REST_Response {
    $scheduled = get_option( 'cmcc_scheduled_reports', array() );
    if ( ! is_array( $scheduled ) ) {
        $scheduled = array();
    }

    return new WP_REST_Response( array(
        'success' => true,
        'reports' => $scheduled,
    ), 200 );
}

endif; // cmcc_rest_get_scheduled_reports

if ( ! function_exists( 'cmcc_rest_delete_scheduled_report' ) ) :

/**
 * DELETE /cmcc/v1/reports/scheduled – Delete a scheduled report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_delete_scheduled_report( WP_REST_Request $request ): WP_REST_Response {
    $id = sanitize_text_field( $request->get_param( 'id' ) );

    $scheduled = get_option( 'cmcc_scheduled_reports', array() );
    if ( ! is_array( $scheduled ) ) {
        $scheduled = array();
    }

    $found = false;
    foreach ( $scheduled as $key => $report ) {
        if ( isset( $report['id'] ) && $report['id'] === $id ) {
            unset( $scheduled[ $key ] );
            $found = true;
            break;
        }
    }

    if ( ! $found ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Scheduled report not found.', 'cmcc' ),
        ), 404 );
    }

    update_option( 'cmcc_scheduled_reports', array_values( $scheduled ) );

    return new WP_REST_Response( array(
        'success' => true,
        'message' => esc_html__( 'Scheduled report deleted.', 'cmcc' ),
    ), 200 );
}

endif; // cmcc_rest_delete_scheduled_report

if ( ! function_exists( 'cmcc_send_scheduled_reports' ) ) :

/**
 * Cron handler for sending scheduled reports.
 *
 * Attached to the 'cmcc_daily_report_cron' action. Evaluates each
 * scheduled report's frequency and sends it if conditions are met.
 */
function cmcc_send_scheduled_reports(): void {
    $scheduled = get_option( 'cmcc_scheduled_reports', array() );
    if ( ! is_array( $scheduled ) || empty( $scheduled ) ) {
        return;
    }

    $today        = current_time( 'Y-m-d' );
    $day_of_week  = (int) current_time( 'w' );
    $day_of_month = (int) current_time( 'j' );

    foreach ( $scheduled as $report ) {
        if ( empty( $report['enabled'] ) ) {
            continue;
        }

        $should_send = false;
        switch ( $report['frequency'] ) {
            case 'daily':
                $should_send = true;
                break;
            case 'weekly':
                $should_send = ( 1 === $day_of_week ); // Monday
                break;
            case 'monthly':
                $should_send = ( 1 === $day_of_month );
                break;
        }

        if ( ! $should_send || empty( $report['emails'] ) ) {
            continue;
        }

        $report_type_label = ucwords( str_replace( '_', ' ', $report['type'] ) );
        $subject = sprintf(
            /* translators: 1: report type label, 2: date */
            esc_html__( '[CMCC] Scheduled Report: %1$s — %2$s', 'cmcc' ),
            $report_type_label,
            $today
        );

        $message = sprintf(
            /* translators: 1: report type */
            esc_html__( 'Your scheduled %s report is generated. Please find the report data in your CMCC dashboard.', 'cmcc' ),
            $report['type']
        );

        wp_mail(
            $report['emails'],
            $subject,
            $message,
            array( 'Content-Type: text/plain; charset=UTF-8' )
        );

        // Update next_run
        $report['next_run'] = current_time( 'mysql' );
    }
}

endif; // cmcc_send_scheduled_reports
