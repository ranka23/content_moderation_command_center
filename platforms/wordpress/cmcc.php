<?php
/**
 * Plugin Name:       CMCC - Content Moderation Command Center
 * Plugin URI:        https://cmcc.dev
 * Description:       Enterprise content moderation with AI-powered spam detection, queue management, analytics, and multi-platform support.
 * Version:           1.0.0
 * Author:            CMCC Team
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       cmcc
 * Domain Path:       /languages
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Current plugin version.
 */
define( 'CMCC_VERSION', '1.0.0' );

/**
 * Database table name for the moderation queue.
 */
define( 'CMCC_QUEUE_TABLE', 'cmcc_queue' );

/**
 * Database table name for the activity log.
 */
define( 'CMCC_ACTIVITY_LOG_TABLE', 'cmcc_activity_log' );

/**
 * The option name used to store plugin settings.
 */
define( 'CMCC_SETTINGS_OPTION', 'cmcc_settings' );

// --------------------------------------------------------------------------
// Activation / Deactivation
// --------------------------------------------------------------------------

/**
 * Create or upgrade database tables on plugin activation.
 */
function cmcc_activate(): void {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();

    $queue_table = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $log_table   = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $sql_queue = "CREATE TABLE IF NOT EXISTS {$queue_table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        item_id VARCHAR(255) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        spam_score FLOAT DEFAULT 0,
        author_id VARCHAR(255) DEFAULT '',
        date_gmt DATETIME DEFAULT NULL,
        title TEXT,
        excerpt TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_content_type (content_type),
        INDEX idx_item_id (item_id)
    ) {$charset_collate};";

    $sql_log = "CREATE TABLE IF NOT EXISTS {$log_table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        moderator_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_title TEXT,
        previous_status VARCHAR(50) DEFAULT '',
        new_status VARCHAR(50) DEFAULT '',
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_moderator (moderator_id),
        INDEX idx_action (action),
        INDEX idx_timestamp (timestamp)
    ) {$charset_collate};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    dbDelta( $sql_queue );
    dbDelta( $sql_log );

    // Set default settings if none exist.
    if ( false === get_option( CMCC_SETTINGS_OPTION ) ) {
        add_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings(), '', 'yes' );
    }

    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'cmcc_activate' );

/**
 * Cleanup on plugin deactivation.
 */
function cmcc_deactivate(): void {
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'cmcc_deactivate' );

// --------------------------------------------------------------------------
// Default Settings
// --------------------------------------------------------------------------

/**
 * Return the default plugin settings.
 *
 * @return array<string, mixed>
 */
function cmcc_get_default_settings(): array {
    return array(
        'general' => array(
            'auto_moderate'       => false,
            'moderation_behavior' => 'flag',
            'queue_page_size'     => 25,
            'language'            => 'en',
        ),
        'spam_firewall' => array(
            'max_links'                  => 5,
            'blacklisted_keywords'       => '',
            'blacklisted_email_domains'  => '',
            'min_submit_time'            => 3,
            'enable_duplicate_detection' => true,
            'duplicate_lookback_days'    => 7,
            'global_action'              => 'flag',
        ),
        'notifications' => array(
            'email_alerts'     => true,
            'alert_threshold'  => 10,
            'notify_moderators' => true,
        ),
    );
}

// --------------------------------------------------------------------------
// Admin Menu
// --------------------------------------------------------------------------

/**
 * Register the CMCC admin menu pages.
 */
function cmcc_admin_menu(): void {
    $icon = 'data:image/svg+xml;base64,' . base64_encode(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23007cba"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    );

    add_menu_page(
        esc_html__( 'CMCC Moderation', 'cmcc' ),
        esc_html__( 'CMCC', 'cmcc' ),
        'manage_options',
        'cmcc',
        'cmcc_render_app',
        $icon,
        30
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'Moderation Queue', 'cmcc' ),
        esc_html__( 'Queue', 'cmcc' ),
        'manage_options',
        'cmcc',
        'cmcc_render_app'
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'Analytics', 'cmcc' ),
        esc_html__( 'Analytics', 'cmcc' ),
        'manage_options',
        'cmcc-analytics',
        'cmcc_render_app'
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'Settings', 'cmcc' ),
        esc_html__( 'Settings', 'cmcc' ),
        'manage_options',
        'cmcc-settings',
        'cmcc_render_app'
    );
}
add_action( 'admin_menu', 'cmcc_admin_menu' );

/**
 * Render the React application mount point.
 */
function cmcc_render_app(): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'You do not have sufficient permissions.', 'cmcc' ) );
    }

    cmcc_enqueue_app_assets();
    ?>
    <div class="wrap">
        <div id="cmcc-app"></div>
    </div>
    <?php
}

// --------------------------------------------------------------------------
// Enqueue Scripts & Styles
// --------------------------------------------------------------------------

/**
 * Enqueue the CMCC React application assets.
 */
function cmcc_enqueue_app_assets(): void {
    $dist_url  = plugin_dir_url( __FILE__ ) . 'dist/';
    $dist_path = plugin_dir_path( __FILE__ ) . 'dist/';
    $version   = file_exists( $dist_path . 'cmcc-app.js' )
        ? filemtime( $dist_path . 'cmcc-app.js' )
        : CMCC_VERSION;

    wp_enqueue_style(
        'cmcc-app',
        $dist_url . 'cmcc-app.css',
        array( 'wp-components' ),
        $version
    );

    wp_enqueue_script(
        'cmcc-app',
        $dist_url . 'cmcc-app.js',
        array( 'wp-api', 'wp-element', 'wp-i18n', 'wp-components', 'wp-hooks' ),
        $version,
        true
    );

    $current_user = wp_get_current_user();

    wp_localize_script(
        'cmcc-app',
        'cmccData',
        array(
            'restUrl'      => esc_url_raw( rest_url( 'cmcc/v1/' ) ),
            'nonce'        => wp_create_nonce( 'wp_rest' ),
            'userId'       => $current_user->ID,
            'userDisplay'  => $current_user->display_name,
            'adminUrl'     => admin_url(),
            'pluginUrl'    => plugin_dir_url( __FILE__ ),
            'initialTab'   => isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : 'cmcc', // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        )
    );
}

// --------------------------------------------------------------------------
// REST API Endpoints
// --------------------------------------------------------------------------

/**
 * Register REST API routes for CMCC.
 */
function cmcc_register_rest_routes(): void {
    // GET /cmcc/v1/queue
    register_rest_route( 'cmcc/v1', '/queue', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_queue',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'page'          => array( 'type' => 'integer', 'default' => 1 ),
            'per_page'      => array( 'type' => 'integer', 'default' => 25 ),
            'status'        => array( 'type' => 'string', 'default' => '' ),
            'content_type'  => array( 'type' => 'string', 'default' => '' ),
            'search'        => array( 'type' => 'string', 'default' => '' ),
        ),
    ) );

    // POST /cmcc/v1/queue/:id/action
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/action', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_queue_action',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array(
                'required'          => true,
                'validate_callback' => function ( $param ) {
                    return is_string( $param ) && '' !== $param;
                },
            ),
        ),
    ) );

    // POST /cmcc/v1/queue/bulk-action
    register_rest_route( 'cmcc/v1', '/queue/bulk-action', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_bulk_action',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'ids'    => array(
                'required' => true,
                'type'     => 'array',
                'items'    => array( 'type' => 'string' ),
            ),
            'action' => array(
                'required' => true,
                'type'     => 'string',
            ),
        ),
    ) );

    // GET /cmcc/v1/analytics
    register_rest_route( 'cmcc/v1', '/analytics', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_analytics',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/activity-log
    register_rest_route( 'cmcc/v1', '/activity-log', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_activity_log',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'page'     => array( 'type' => 'integer', 'default' => 1 ),
            'per_page' => array( 'type' => 'integer', 'default' => 50 ),
            'action'   => array( 'type' => 'string', 'default' => '' ),
        ),
    ) );

    // GET /cmcc/v1/settings
    register_rest_route( 'cmcc/v1', '/settings', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/settings
    register_rest_route( 'cmcc/v1', '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_update_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );
}
add_action( 'rest_api_init', 'cmcc_register_rest_routes' );

/**
 * Check REST API permissions.
 *
 * @return bool
 */
function cmcc_rest_permission_check(): bool {
    return current_user_can( 'manage_options' );
}

// --------------------------------------------------------------------------
// REST Callbacks – Queue
// --------------------------------------------------------------------------

/**
 * GET /cmcc/v1/queue – return paginated queue items.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_queue( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $page        = max( 1, (int) $request->get_param( 'page' ) );
    $per_page    = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ) );
    $status      = sanitize_text_field( $request->get_param( 'status' ) );
    $content_type = sanitize_text_field( $request->get_param( 'content_type' ) );
    $search      = sanitize_text_field( $request->get_param( 'search' ) );

    $table  = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $where  = array( '1=1' );
    $values = array();

    if ( '' !== $status ) {
        $where[] = 'status = %s';
        $values[] = $status;
    }

    if ( '' !== $content_type ) {
        $where[] = 'content_type = %s';
        $values[] = $content_type;
    }

    if ( '' !== $search ) {
        $where[]   = '(title LIKE %s OR excerpt LIKE %s)';
        $values[] = '%' . $wpdb->esc_like( $search ) . '%';
        $values[] = '%' . $wpdb->esc_like( $search ) . '%';
    }

    $where_clause = implode( ' AND ', $where );
    $offset       = ( $page - 1 ) * $per_page;

    $count_sql = $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE {$where_clause}", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $values
    );
    $total_items = (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    $data_sql = $wpdb->prepare(
        "SELECT * FROM {$table} WHERE {$where_clause} ORDER BY created_at DESC LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        array_merge( $values, array( $per_page, $offset ) )
    );
    $items = $wpdb->get_results( $data_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    return new WP_REST_Response( array(
        'items'      => $items,
        'total'      => $total_items,
        'page'       => $page,
        'per_page'   => $per_page,
        'total_pages' => (int) ceil( $total_items / $per_page ),
    ), 200 );
}

/**
 * POST /cmcc/v1/queue/:id/action – moderate a single queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_queue_action( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id = $request->get_param( 'id' );
    $action  = sanitize_text_field( $request->get_param( 'action' ) );
    $notes   = sanitize_textarea_field( $request->get_param( 'notes' ) );

    $allowed_actions = array( 'approve', 'reject', 'spam', 'defer' );
    if ( ! in_array( $action, $allowed_actions, true ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid action.', 'cmcc' ),
        ), 400 );
    }

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;

    $item = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$table} WHERE item_id = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $item_id
    ) );

    if ( ! $item ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Queue item not found.', 'cmcc' ),
        ), 404 );
    }

    $previous_status = $item->status;

    $status_map = array(
        'approve' => 'approved',
        'reject'  => 'rejected',
        'spam'    => 'spam',
        'defer'   => 'deferred',
    );

    $new_status = $status_map[ $action ] ?? 'pending';

    $updated = $wpdb->update(
        $table,
        array( 'status' => $new_status ),
        array( 'item_id' => $item_id ),
        array( '%s' ),
        array( '%s' )
    );

    if ( false === $updated ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Failed to update queue item.', 'cmcc' ),
        ), 500 );
    }

    cmcc_log_activity( array(
        'moderator_id'    => get_current_user_id(),
        'action'          => $action,
        'content_type'    => $item->content_type,
        'item_id'         => $item_id,
        'item_title'      => $item->title,
        'previous_status' => $previous_status,
        'new_status'      => $new_status,
        'notes'           => $notes,
    ) );

    return new WP_REST_Response( array(
        'success' => true,
        'message' => esc_html__( 'Action applied successfully.', 'cmcc' ),
    ), 200 );
}

/**
 * POST /cmcc/v1/queue/bulk-action – perform a bulk action on queue items.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_bulk_action( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $ids    = $request->get_param( 'ids' );
    $action = sanitize_text_field( $request->get_param( 'action' ) );

    if ( ! is_array( $ids ) || empty( $ids ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'No items selected.', 'cmcc' ),
        ), 400 );
    }

    $allowed_bulk_actions = array( 'approve-all', 'move-to-trash', 'mark-as-spam', 'deactivate-users', 'export-csv' );
    if ( ! in_array( $action, $allowed_bulk_actions, true ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid bulk action.', 'cmcc' ),
        ), 400 );
    }

    $table       = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $placeholders = implode( ', ', array_fill( 0, count( $ids ), '%s' ) );

    $status_map = array(
        'approve-all'  => 'approved',
        'move-to-trash' => 'rejected',
        'mark-as-spam'  => 'spam',
        'deactivate-users' => 'deactivated',
    );

    if ( isset( $status_map[ $action ] ) ) {
        $new_status = $status_map[ $action ];
        $sql = $wpdb->prepare(
            "UPDATE {$table} SET status = %s WHERE item_id IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            array_merge( array( $new_status ), $ids )
        );
        $wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    }

    if ( 'export-csv' === $action ) {
        $sql = $wpdb->prepare(
            "SELECT * FROM {$table} WHERE item_id IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            $ids
        );
        $items = $wpdb->get_results( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return new WP_REST_Response( array(
            'success' => true,
            'data'    => $items,
            'format'  => 'csv',
        ), 200 );
    }

    return new WP_REST_Response( array(
        'success' => true,
        'message' => esc_html__( 'Bulk action applied successfully.', 'cmcc' ),
    ), 200 );
}

// --------------------------------------------------------------------------
// REST Callbacks – Analytics
// --------------------------------------------------------------------------

/**
 * GET /cmcc/v1/analytics – return analytics data.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_analytics( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $queue_table = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $log_table   = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    // Queue stats by status.
    $status_counts = $wpdb->get_results(
        "SELECT status, COUNT(*) as count FROM {$queue_table} GROUP BY status", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        OBJECT_K
    );

    $queue_stats = array(
        'pending' => isset( $status_counts['pending'] ) ? (int) $status_counts['pending']->count : 0,
        'spam'    => isset( $status_counts['spam'] ) ? (int) $status_counts['spam']->count : 0,
        'flagged'  => isset( $status_counts['flagged'] ) ? (int) $status_counts['flagged']->count : 0,
        'approved' => isset( $status_counts['approved'] ) ? (int) $status_counts['approved']->count : 0,
        'rejected' => isset( $status_counts['rejected'] ) ? (int) $status_counts['rejected']->count : 0,
        'total'    => 0,
    );
    $queue_stats['total'] = array_sum( $queue_stats );

    // Content type breakdown.
    $content_type_data = $wpdb->get_results(
        "SELECT content_type, COUNT(*) as count FROM {$queue_table} GROUP BY content_type ORDER BY count DESC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );
    $content_breakdown = array();
    foreach ( $content_type_data as $row ) {
        $content_breakdown[] = array(
            'content_type' => $row->content_type,
            'count'        => (int) $row->count,
            'percentage'   => $queue_stats['total'] > 0
                ? round( ( (int) $row->count / $queue_stats['total'] ) * 100, 1 )
                : 0,
        );
    }

    // Spam ratio.
    $spam_count  = isset( $status_counts['spam'] ) ? (int) $status_counts['spam']->count : 0;
    $total_count = $queue_stats['total'];
    $spam_ratio  = $total_count > 0 ? $spam_count / $total_count : 0;

    // Recent activity stats (last 30 days).
    $thirty_days_ago = gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
    $activity_counts = $wpdb->get_row( $wpdb->prepare(
        "SELECT
            COUNT(*) as total_actions,
            SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as approvals,
            SUM(CASE WHEN action = 'reject' THEN 1 ELSE 0 END) as rejections,
            SUM(CASE WHEN action = 'spam' THEN 1 ELSE 0 END) as spam_actions
        FROM {$log_table} WHERE timestamp >= %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $thirty_days_ago
    ) );

    return new WP_REST_Response( array(
        'queue_stats'          => $queue_stats,
        'content_type_breakdown' => $content_breakdown,
        'spam_ratio'           => array(
            'spam_count'  => $spam_count,
            'total_count' => $total_count,
            'ratio'       => round( $spam_ratio, 4 ),
            'percentage'  => round( $spam_ratio * 100, 1 ),
        ),
        'activity_summary'     => array(
            'total_actions' => (int) ( $activity_counts->total_actions ?? 0 ),
            'approvals'     => (int) ( $activity_counts->approvals ?? 0 ),
            'rejections'    => (int) ( $activity_counts->rejections ?? 0 ),
            'spam_actions'  => (int) ( $activity_counts->spam_actions ?? 0 ),
        ),
    ), 200 );
}

// --------------------------------------------------------------------------
// REST Callbacks – Activity Log
// --------------------------------------------------------------------------

/**
 * GET /cmcc/v1/activity-log – return activity log entries.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_activity_log( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $page     = max( 1, (int) $request->get_param( 'page' ) );
    $per_page = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ) );
    $action   = sanitize_text_field( $request->get_param( 'action' ) );

    $table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;
    $where  = array( '1=1' );
    $values = array();

    if ( '' !== $action ) {
        $where[]  = 'action = %s';
        $values[] = $action;
    }

    $where_clause = implode( ' AND ', $where );
    $offset       = ( $page - 1 ) * $per_page;

    $count_sql = $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE {$where_clause}", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $values
    );
    $total_items = (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    $data_sql = $wpdb->prepare(
        "SELECT * FROM {$table} WHERE {$where_clause} ORDER BY timestamp DESC LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        array_merge( $values, array( $per_page, $offset ) )
    );
    $items = $wpdb->get_results( $data_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    return new WP_REST_Response( array(
        'items'       => $items,
        'total'       => $total_items,
        'page'        => $page,
        'per_page'    => $per_page,
        'total_pages' => (int) ceil( $total_items / $per_page ),
    ), 200 );
}

// --------------------------------------------------------------------------
// REST Callbacks – Settings
// --------------------------------------------------------------------------

/**
 * GET /cmcc/v1/settings – return plugin settings.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_settings( WP_REST_Request $request ): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    return new WP_REST_Response( $settings, 200 );
}

/**
 * POST /cmcc/v1/settings – update plugin settings.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_update_settings( WP_REST_Request $request ): WP_REST_Response {
    $body     = $request->get_json_params();
    $existing = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );

    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid request body.', 'cmcc' ),
        ), 400 );
    }

    $sanitized = cmcc_sanitize_settings( $body, $existing );
    update_option( CMCC_SETTINGS_OPTION, $sanitized );

    return new WP_REST_Response( array(
        'success' => true,
        'message' => esc_html__( 'Settings saved.', 'cmcc' ),
        'data'    => $sanitized,
    ), 200 );
}

/**
 * Sanitize and merge incoming settings with existing defaults.
 *
 * @param array<string, mixed> $input    The submitted settings.
 * @param array<string, mixed> $existing The existing settings.
 * @return array<string, mixed>
 */
function cmcc_sanitize_settings( array $input, array $existing ): array {
    $merged = $existing;

    foreach ( $input as $section => $fields ) {
        if ( ! isset( $merged[ $section ] ) || ! is_array( $fields ) ) {
            continue;
        }
        foreach ( $fields as $key => $value ) {
            if ( is_bool( $merged[ $section ][ $key ] ) ) {
                $merged[ $section ][ $key ] = (bool) $value;
            } elseif ( is_int( $merged[ $section ][ $key ] ) ) {
                $merged[ $section ][ $key ] = (int) $value;
            } elseif ( is_float( $merged[ $section ][ $key ] ) ) {
                $merged[ $section ][ $key ] = (float) $value;
            } else {
                $merged[ $section ][ $key ] = sanitize_text_field( $value );
            }
        }
    }

    return $merged;
}

// --------------------------------------------------------------------------
// Helper Functions
// --------------------------------------------------------------------------

/**
 * Log a moderation activity.
 *
 * @param array<string, mixed> $data {
 *     Activity log data.
 *
 *     @type int|string $moderator_id    The moderator user ID.
 *     @type string     $action          The action taken.
 *     @type string     $content_type    The type of content.
 *     @type string     $item_id         The item ID.
 *     @type string     $item_title      The item title.
 *     @type string     $previous_status The previous status.
 *     @type string     $new_status      The new status.
 *     @type string     $notes           Optional notes.
 * }
 * @return void
 */
function cmcc_log_activity( array $data ): void {
    global $wpdb;

    $table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $wpdb->insert( $table, array(
        'moderator_id'    => $data['moderator_id'],
        'action'          => $data['action'],
        'content_type'    => $data['content_type'],
        'item_id'         => $data['item_id'],
        'item_title'      => $data['item_title'] ?? '',
        'previous_status' => $data['previous_status'] ?? '',
        'new_status'      => $data['new_status'] ?? '',
        'notes'           => $data['notes'] ?? '',
        'timestamp'       => current_time( 'mysql', true ),
    ), array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ) );
}

/**
 * Retrieve a queue item by its ID.
 *
 * @param string $item_id The queue item ID.
 * @return object|null The queue item row, or null if not found.
 */
function cmcc_get_queue_item( string $item_id ): ?object {
    global $wpdb;

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;

    return $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$table} WHERE item_id = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $item_id
    ) );
}

/**
 * Insert or update a queue item.
 *
 * @param array<string, mixed> $data Queue item data.
 * @return int|false The number of rows affected, or false on error.
 */
function cmcc_upsert_queue_item( array $data ) {
    global $wpdb;

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;

    return $wpdb->replace( $table, array(
        'item_id'      => $data['item_id'],
        'content_type' => $data['content_type'],
        'status'       => $data['status'] ?? 'pending',
        'spam_score'   => $data['spam_score'] ?? 0,
        'author_id'    => $data['author_id'] ?? '',
        'date_gmt'     => $data['date_gmt'] ?? current_time( 'mysql', true ),
        'title'        => $data['title'] ?? '',
        'excerpt'      => $data['excerpt'] ?? '',
        'created_at'   => current_time( 'mysql', true ),
    ), array( '%s', '%s', '%s', '%f', '%s', '%s', '%s', '%s', '%s' ) );
}

/**
 * Delete queue items by status.
 *
 * @param string $status The status to delete.
 * @return int|false The number of rows deleted, or false on error.
 */
function cmcc_clear_queue_by_status( string $status ) {
    global $wpdb;

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;

    return $wpdb->delete( $table, array( 'status' => $status ), array( '%s' ) );
}

/**
 * Get queue statistics.
 *
 * @return array<string, int>
 */
function cmcc_get_queue_stats(): array {
    global $wpdb;

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $stats = $wpdb->get_results(
        "SELECT status, COUNT(*) as count FROM {$table} GROUP BY status", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        OBJECT_K
    );

    return array(
        'pending'  => isset( $stats['pending'] ) ? (int) $stats['pending']->count : 0,
        'spam'     => isset( $stats['spam'] ) ? (int) $stats['spam']->count : 0,
        'flagged'  => isset( $stats['flagged'] ) ? (int) $stats['flagged']->count : 0,
        'approved' => isset( $stats['approved'] ) ? (int) $stats['approved']->count : 0,
        'rejected' => isset( $stats['rejected'] ) ? (int) $stats['rejected']->count : 0,
    );
}
