<?php
/**
 * CMCC — Content Moderation Command Center
 *
 * @package   CMCC
 * @author    Your Name
 * @license   GPL-2.0+
 * @link      https://example.com
 *
 * @wordpress-plugin
 * Plugin Name: CMCC — Content Moderation Command Center
 * Plugin URI:  https://example.com/cmcc
 * Description: A comprehensive content moderation plugin for WordPress with queue management, analytics, collaboration, and multi-platform support.
 * Version:     1.0.0
 * Author:      Your Name
 * Author URI:  https://example.com
 * Text Domain: cmcc
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
    die;
}

// ─── Constants ─────────────────────────────────────────────────────────────

define( 'CMCC_VERSION', '1.0.1' );
define( 'CMCC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CMCC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CMCC_MINIMUM_WP_VERSION', '5.8' );

global $wpdb;
define( 'CMCC_QUEUE_TABLE', $wpdb->prefix . 'cmcc_queue' );
define( 'CMCC_ACTIVITY_LOG_TABLE', $wpdb->prefix . 'cmcc_activity_log' );
define( 'CMCC_USER_META_TABLE', $wpdb->prefix . 'cmcc_user_meta' );
define( 'CMCC_SETTINGS_OPTION', 'cmcc_settings' );

// ─── Activation / Deactivation ─────────────────────────────────────────────

/**
 * Plugin activation hook.
 * Creates the required database tables.
 */
function cmcc_activate(): void {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();
    $queue_table     = CMCC_QUEUE_TABLE;
    $log_table       = CMCC_ACTIVITY_LOG_TABLE;
    $meta_table      = CMCC_USER_META_TABLE;

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $queue_sql = "CREATE TABLE IF NOT EXISTS {$queue_table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        item_id VARCHAR(255) NOT NULL,
        content_type VARCHAR(100) NOT NULL DEFAULT 'post',
        author_id VARCHAR(255) DEFAULT '',
        title TEXT DEFAULT NULL,
        excerpt TEXT DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        spam_score DECIMAL(5,2) DEFAULT 0.00,
        date_gmt DATETIME DEFAULT NULL,
        source_platform VARCHAR(50) DEFAULT 'wordpress',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_item_id (item_id),
        INDEX idx_status (status),
        INDEX idx_content_type (content_type),
        INDEX idx_author_id (author_id),
        INDEX idx_date_gmt (date_gmt)
    ) {$charset_collate};";

    $log_sql = "CREATE TABLE IF NOT EXISTS {$log_table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        moderator_id BIGINT UNSIGNED DEFAULT 0,
        action VARCHAR(100) NOT NULL DEFAULT '',
        content_type VARCHAR(100) DEFAULT '',
        item_id VARCHAR(255) DEFAULT '',
        item_title TEXT DEFAULT NULL,
        previous_status VARCHAR(50) DEFAULT NULL,
        new_status VARCHAR(50) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        source_platform VARCHAR(50) DEFAULT 'wordpress',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_moderator (moderator_id),
        INDEX idx_item_id (item_id),
        INDEX idx_timestamp (timestamp)
    ) {$charset_collate};";

    $meta_sql = "CREATE TABLE IF NOT EXISTS {$meta_table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        meta_key VARCHAR(255) NOT NULL,
        meta_value LONGTEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_meta_key (meta_key)
    ) {$charset_collate};";

    dbDelta( $queue_sql );
    dbDelta( $log_sql );
    dbDelta( $meta_sql );

    // Ensure the default settings are present
    if ( false === get_option( CMCC_SETTINGS_OPTION ) ) {
        add_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    }
}

/**
 * Plugin deactivation hook.
 * Flushes rewrite rules and performs cleanup.
 */
function cmcc_deactivate(): void {
    flush_rewrite_rules();
}

register_activation_hook( __FILE__, 'cmcc_activate' );
register_deactivation_hook( __FILE__, 'cmcc_deactivate' );

// ─── Bootstrap ─────────────────────────────────────────────────────────────

/**
 * Initialize the plugin by loading required files and setting up hooks.
 */
function cmcc_init(): void {
    // Load PHP libs
    $lib_dir = CMCC_PLUGIN_DIR . 'src/lib/';
    foreach ( array( 'reports', 'user-reputation', 'content-hooks', 'firewall-engine', 'notifications', 'collaboration', 'multi-platform' ) as $lib ) {
        $file = $lib_dir . $lib . '.php';
        if ( file_exists( $file ) ) {
            require_once $file;
        }
    }
}

add_action( 'plugins_loaded', 'cmcc_init' );

// ─── Enqueue Admin Assets ──────────────────────────────────────────────────

/**
 * Enqueue the compiled React app (JS + CSS) on CMCC admin pages.
 */
function cmcc_enqueue_admin_assets( string $hook_suffix ): void {
    // Only load on CMCC admin pages
    if ( strpos( $hook_suffix, 'cmcc' ) === false ) {
        return;
    }

    $js_url  = CMCC_PLUGIN_URL . 'dist/cmcc-app.js';
    $css_url = CMCC_PLUGIN_URL . 'dist/cmcc-app.css';
    $js_path  = CMCC_PLUGIN_DIR . 'dist/cmcc-app.js';
    $css_path = CMCC_PLUGIN_DIR . 'dist/cmcc-app.css';

    if ( ! file_exists( $js_path ) || ! file_exists( $css_path ) ) {
        return;
    }

    $version = CMCC_VERSION;

    wp_enqueue_script(
        'cmcc-admin',
        $js_url,
        array( 'wp-element', 'wp-api-fetch' ),
        $version,
        true
    );

    wp_enqueue_style(
        'cmcc-admin',
        $css_url,
        array( 'wp-components' ),
        $version,
    );

    // Localize script with REST URL, nonce, user data, and initial tab.
    wp_localize_script( 'cmcc-admin', 'cmccData', array(
        'restUrl'     => rest_url( 'cmcc/v1/' ),
        'nonce'       => wp_create_nonce( 'wp_rest' ),
        'userId'      => get_current_user_id(),
        'userDisplay' => wp_get_current_user()->display_name,
        'initialTab'  => sanitize_title( $_GET['page'] ?? 'cmcc' ),
        'adminUrl'    => admin_url(),
    ) );
}

add_action( 'admin_enqueue_scripts', 'cmcc_enqueue_admin_assets' );

// ─── Admin Menu ────────────────────────────────────────────────────────────

/**
 * Register the CMCC admin menu and submenu pages.
 */
function cmcc_admin_menu(): void {
    add_menu_page(
        'CMCC — Content Moderation',
        'CMCC',
        'manage_options',
        'cmcc',
        'cmcc_render_admin_page',
        'dashicons-shield',
        30
    );

    $submenus = array(
        'cmcc'              => 'Queue',
        'cmcc-analytics'    => 'Analytics',
        'cmcc-activity'     => 'Activity Log',
        'cmcc-reports'      => 'Reports',
        'cmcc-settings'     => 'Settings',
    );

    foreach ( $submenus as $slug => $label ) {
        add_submenu_page(
            'cmcc',
            $label,
            $label,
            'manage_options',
            $slug,
            'cmcc_render_admin_page'
        );
    }
}

add_action( 'admin_menu', 'cmcc_admin_menu' );

/**
 * Render the CMCC React app container.
 */
function cmcc_render_admin_page(): void {
    ?>
    <div id="cmcc-app"></div>
    <?php
}

// ─── REST API Route Registration ──────────────────────────────────────────

/**
 * Register all REST API routes for CMCC.
 */
function cmcc_register_rest_routes(): void {
    // GET /cmcc/v1/queue
    register_rest_route( 'cmcc/v1', '/queue', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_queue',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'page'           => array( 'default' => 1 ),
            'per_page'       => array( 'default' => 25 ),
            'status'         => array( 'default' => '' ),
            'content_type'   => array( 'default' => '' ),
            'search'         => array( 'default' => '' ),
            'sort_field'     => array( 'default' => 'date_gmt' ),
            'sort_direction' => array( 'default' => 'desc' ),
        ),
    ) );

    // POST /cmcc/v1/queue/:id/action
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/action', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_queue_action',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true ),
        ),
    ) );

    // POST /cmcc/v1/queue/bulk-action
    register_rest_route( 'cmcc/v1', '/queue/bulk-action', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_bulk_action',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'ids'    => array( 'required' => true ),
            'action' => array( 'required' => true ),
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
            'page'     => array( 'default' => 1 ),
            'per_page' => array( 'default' => 25 ),
            'action'   => array( 'default' => '' ),
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

    // GET /cmcc/v1/queue/:id/history
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/history', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_item_history',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true ),
        ),
    ) );

    // GET /cmcc/v1/users/reputation
    register_rest_route( 'cmcc/v1', '/users/reputation', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_user_reputation',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/reputation-raw – Get raw reputation data with pagination
    register_rest_route( 'cmcc/v1', '/reputation-raw', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_reputation_raw',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'page'     => array( 'default' => 1 ),
            'per_page' => array( 'default' => 25 ),
        ),
    ) );

    // POST /cmcc/v1/settings/export
    register_rest_route( 'cmcc/v1', '/settings/export', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_export_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/settings/import
    register_rest_route( 'cmcc/v1', '/settings/import', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_import_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/queue/:id/note – Add a note to a queue item
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/note', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_add_note',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true ),
        ),
    ) );

    // GET /cmcc/v1/queue/:id/notes – Get notes for a queue item
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/notes', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_notes',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true ),
        ),
    ) );

    // POST /cmcc/v1/queue/:id/assign – Assign item to a moderator
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/assign', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_assign_item',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true ),
        ),
    ) );

    // GET /cmcc/v1/activity-feed – Get recent moderation activity feed
    register_rest_route( 'cmcc/v1', '/activity-feed', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_activity_feed',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/raw-events – Get raw moderation events for client-side analytics
    register_rest_route( 'cmcc/v1', '/raw-events', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_raw_events',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'start_date' => array( 'default' => '' ),
            'end_date'   => array( 'default' => '' ),
        ),
    ) );

    // POST /cmcc/v1/reports/moderation-activity – Generate moderation activity report
    register_rest_route( 'cmcc/v1', '/reports/moderation-activity', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_moderation_activity',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/reports/compliance-audit – Export compliance audit log
    register_rest_route( 'cmcc/v1', '/reports/compliance-audit', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_compliance_audit',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/reports/scheduled – Schedule a report
    register_rest_route( 'cmcc/v1', '/reports/scheduled', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_scheduled',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/users/deactivate – Deactivate users
    register_rest_route( 'cmcc/v1', '/users/deactivate', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_deactivate_users',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/queue/:id/ai-evaluate – AI evaluation
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/ai-evaluate', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_ai_evaluate',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/settings/export – Export settings
    register_rest_route( 'cmcc/v1', '/settings/export', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_export_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );
}

add_action( 'rest_api_init', 'cmcc_register_rest_routes' );

// ─── Permission Check ─────────────────────────────────────────────────────

/**
 * Check if the current user has permission to access CMCC REST endpoints.
 *
 * @return bool|WP_Error True if permitted, WP_Error otherwise.
 */
function cmcc_rest_permission_check() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return new WP_Error(
            'rest_forbidden',
            __( 'You do not have permission to access this resource.', 'cmcc' ),
            array( 'status' => 403 )
        );
    }
    return true;
}

// ─── REST Callbacks ────────────────────────────────────────────────────────

if ( ! function_exists( 'cmcc_rest_get_queue' ) ) {

/**
 * GET /cmcc/v1/queue – Return paginated queue items.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_queue( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;
    $page        = max( 1, (int) $request->get_param( 'page' ) );
    $per_page    = max( 1, min( 100, (int) $request->get_param( 'per_page' ) ) );
    $status      = sanitize_text_field( $request->get_param( 'status' ) );
    $content_type = sanitize_text_field( $request->get_param( 'content_type' ) );
    $search      = sanitize_text_field( $request->get_param( 'search' ) );
    $sort_field  = sanitize_text_field( $request->get_param( 'sort_field' ) );
    $sort_dir    = strtoupper( sanitize_text_field( $request->get_param( 'sort_direction' ) ) );
    $date_range  = sanitize_text_field( $request->get_param( 'date_range' ) );
    $offset      = ( $page - 1 ) * $per_page;

    // Whitelist sort columns
    $allowed_sort = array( 'date_gmt', 'spam_score', 'status', 'content_type', 'author_id', 'title' );
    if ( ! in_array( $sort_field, $allowed_sort, true ) ) {
        $sort_field = 'date_gmt';
    }
    if ( ! in_array( $sort_dir, array( 'ASC', 'DESC' ), true ) ) {
        $sort_dir = 'DESC';
    }

    $where  = array( '1=1' );
    $params = array();

    if ( ! empty( $status ) && 'all' !== $status ) {
        $where[]  = 'status = %s';
        $params[] = $status;
    }

    if ( ! empty( $content_type ) && 'all' !== $content_type ) {
        $where[]  = 'content_type = %s';
        $params[] = $content_type;
    }

    if ( ! empty( $search ) ) {
        $where[]  = '(title LIKE %s OR excerpt LIKE %s OR author_id LIKE %s OR item_id LIKE %s)';
        $like     = '%' . $wpdb->esc_like( $search ) . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    // Handle date range filtering (B9 fix)
    if ( ! empty( $date_range ) && 'all' !== $date_range ) {
        switch ( $date_range ) {
            case 'last-hour':
                $where[]  = 'date_gmt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
                break;
            case 'today':
                $where[]  = 'DATE(date_gmt) = CURDATE()';
                break;
            case 'this-week':
                $where[]  = 'YEARWEEK(date_gmt, 1) = YEARWEEK(CURDATE(), 1)';
                break;
        }
    }

    $where_clause = implode( ' AND ', $where );

    // Count
    $count_sql = "SELECT COUNT(*) FROM {$queue_table} WHERE {$where_clause}";
    $total     = (int) $wpdb->get_var(
        $params ? $wpdb->prepare( $count_sql, $params ) : $count_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    );

    // Fetch
    $sql = "SELECT * FROM {$queue_table} WHERE {$where_clause} ORDER BY {$sort_field} {$sort_dir} LIMIT %d OFFSET %d";
    $params[] = $per_page;
    $params[] = $offset;

    $items = $wpdb->get_results(
        $wpdb->prepare( $sql, $params ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    );

    return new WP_REST_Response( array(
        'items' => $items,
        'total' => $total,
        'page'  => $page,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_queue_action' ) ) {

/**
 * POST /cmcc/v1/queue/:id/action – Apply an action to a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_queue_action( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id = $request->get_param( 'id' );
    $body    = json_decode( $request->get_body(), true );
    $action  = sanitize_text_field( $body['action'] ?? '' );
    $queue_table = CMCC_QUEUE_TABLE;
    $log_table   = CMCC_ACTIVITY_LOG_TABLE;

    if ( empty( $action ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Action is required.',
        ), 400 );
    }

    // Map action to new status
    $status_map = array(
        'approve' => 'approved',
        'reject'  => 'rejected',
        'spam'    => 'spam',
        'flag'    => 'flagged',
        'defer'   => 'deferred',
    );

    $new_status = $status_map[ $action ] ?? '';

    if ( empty( $new_status ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Invalid action.',
        ), 400 );
    }

    // Get current status for the log
    $current = $wpdb->get_row( $wpdb->prepare(
        "SELECT status, content_type, title FROM {$queue_table} WHERE item_id = %s",
        $item_id
    ) );

    $previous_status = $current->status ?? '';

    // Update the item status
    $updated = $wpdb->update(
        $queue_table,
        array( 'status' => $new_status ),
        array( 'item_id' => $item_id ),
        array( '%s' ),
        array( '%s' )
    );

    if ( false === $updated ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Failed to update item status.',
        ), 500 );
    }

    // Log the activity
    $wpdb->insert(
        $log_table,
        array(
            'moderator_id'    => get_current_user_id(),
            'action'          => $action,
            'content_type'    => $current->content_type ?? '',
            'item_id'         => $item_id,
            'item_title'      => $current->title ?? '',
            'previous_status' => $previous_status,
            'new_status'      => $new_status,
        ),
        array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
    );

    // Map action to display message
    $message_map = array(
        'approve' => 'Item approved successfully.',
        'reject'  => 'Item rejected successfully.',
        'spam'    => 'Item marked as spam.',
        'flag'    => 'Item flagged.',
        'defer'   => 'Item deferred.',
    );
    $message = $message_map[ $action ] ?? "Item {$action}d.";

    return new WP_REST_Response( array(
        'success' => true,
        'message' => $message,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_bulk_action' ) ) {

/**
 * POST /cmcc/v1/queue/bulk-action – Apply an action to multiple queue items.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_bulk_action( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $body   = json_decode( $request->get_body(), true );
    $ids    = $body['ids'] ?? array();
    $action = sanitize_text_field( $body['action'] ?? '' );

    if ( empty( $ids ) || ! is_array( $ids ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'No items selected.',
        ), 400 );
    }

    // If export CSV, handle separately
    if ( 'export-csv' === $action ) {
        cmcc_handle_export_csv( $ids );
    }

    $status_map = array(
        'approve' => 'approved',
        'reject'  => 'rejected',
        'spam'    => 'spam',
        'flag'    => 'flagged',
        'defer'   => 'deferred',
    );

    $new_status = $status_map[ $action ] ?? '';
    if ( empty( $new_status ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Invalid bulk action.',
        ), 400 );
    }

    $queue_table = CMCC_QUEUE_TABLE;
    $log_table   = CMCC_ACTIVITY_LOG_TABLE;

    foreach ( $ids as $item_id ) {
        $current = $wpdb->get_row( $wpdb->prepare(
            "SELECT status, content_type, title FROM {$queue_table} WHERE item_id = %s",
            $item_id
        ) );

        $wpdb->update(
            $queue_table,
            array( 'status' => $new_status ),
            array( 'item_id' => $item_id ),
            array( '%s' ),
            array( '%s' )
        );

        $wpdb->insert(
            $log_table,
            array(
                'moderator_id'    => get_current_user_id(),
                'action'          => $action,
                'content_type'    => $current->content_type ?? '',
                'item_id'         => $item_id,
                'item_title'      => $current->title ?? '',
                'previous_status' => $current->status ?? '',
                'new_status'      => $new_status,
            ),
            array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
        );
    }

    return new WP_REST_Response( array(
        'success' => true,
        'message' => 'Bulk action applied.',
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_analytics' ) ) {

/**
 * GET /cmcc/v1/analytics – Return analytics data.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_analytics( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;
    $log_table   = CMCC_ACTIVITY_LOG_TABLE;

    // Queue stats
    $stats = $wpdb->get_results(
        "SELECT status, COUNT(*) as count FROM {$queue_table} GROUP BY status"
    );

    $queue_stats = array(
        'pending' => 0,
        'spam'    => 0,
        'flagged' => 0,
        'approved' => 0,
        'rejected' => 0,
        'deferred' => 0,
        'total'   => 0,
    );

    foreach ( $stats as $row ) {
        if ( isset( $queue_stats[ $row->status ] ) ) {
            $queue_stats[ $row->status ] = (int) $row->count;
        }
        $queue_stats['total'] += (int) $row->count;
    }

    // Activity heatmap (last 7 days)
    $heatmap_data = array();
    for ( $d = 6; $d >= 0; $d-- ) {
        $day = gmdate( 'Y-m-d', strtotime( "-{$d} days" ) );
        $row_counts = array();
        for ( $h = 0; $h < 24; $h++ ) {
            $count = $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM {$log_table} WHERE DATE(timestamp) = %s AND HOUR(timestamp) = %d",
                $day,
                $h
            ) );
            $row_counts[] = (int) $count;
        }
        $heatmap_data[] = $row_counts;
    }

    // Content type breakdown
    $ctb = $wpdb->get_results(
        "SELECT content_type, COUNT(*) as count FROM {$queue_table} GROUP BY content_type ORDER BY count DESC"
    );

    // Moderation volume over time (last 30 days)
    $volume = $wpdb->get_results(
        "SELECT DATE(timestamp) as date, action, COUNT(*) as count
         FROM {$log_table}
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(timestamp), action
         ORDER BY date ASC"
    );

    // Spam content types
    $spam_types = $wpdb->get_results(
        "SELECT content_type, COUNT(*) as count
         FROM {$queue_table}
         WHERE status = 'spam'
         GROUP BY content_type
         ORDER BY count DESC
         LIMIT 5"
    );

    // Status distribution
    $status_dist = $wpdb->get_results(
        "SELECT status, COUNT(*) as count FROM {$queue_table} GROUP BY status"
    );

    return new WP_REST_Response( array(
        'queue_stats'         => $queue_stats,
        'activity_heatmap'    => array( 'data' => $heatmap_data, 'maxCount' => 0 ),
        'content_type_breakdown' => $ctb,
        'spam_ratio'          => array(
            'spamCount'  => $queue_stats['spam'],
            'totalCount' => $queue_stats['total'],
            'ratio'      => $queue_stats['total'] > 0 ? round( $queue_stats['spam'] / $queue_stats['total'], 2 ) : 0,
            'percentage' => $queue_stats['total'] > 0 ? round( ( $queue_stats['spam'] / $queue_stats['total'] ) * 100, 1 ) : 0,
        ),
        'spam_content_types'  => $spam_types,
        'status_distribution' => $status_dist,
        'moderation_volume'   => $volume,
        'moderator_performance' => array(),
        'anomaly_alerts'      => array(),
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_activity_log' ) ) {

/**
 * GET /cmcc/v1/activity-log – Return paginated activity log.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_activity_log( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $log_table = CMCC_ACTIVITY_LOG_TABLE;
    $page      = max( 1, (int) $request->get_param( 'page' ) );
    $per_page  = max( 1, min( 100, (int) $request->get_param( 'per_page' ) ) );
    $action    = sanitize_text_field( $request->get_param( 'action' ) );
    $offset    = ( $page - 1 ) * $per_page;

    $where  = array( '1=1' );
    $params = array();

    if ( ! empty( $action ) ) {
        $where[]  = 'action = %s';
        $params[] = $action;
    }

    $where_clause = implode( ' AND ', $where );

    $count_sql = "SELECT COUNT(*) FROM {$log_table} WHERE {$where_clause}";
    $total     = (int) $wpdb->get_var(
        $params ? $wpdb->prepare( $count_sql, $params ) : $count_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    );

    $sql = "SELECT l.*, u.display_name as moderator_name FROM {$log_table} l LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID WHERE {$where_clause} ORDER BY l.timestamp DESC LIMIT %d OFFSET %d";
    $params[] = $per_page;
    $params[] = $offset;

    $items = $wpdb->get_results(
        $wpdb->prepare( $sql, $params ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    );

    return new WP_REST_Response( array(
        'items' => $items,
        'total' => $total,
        'page'  => $page,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_settings' ) ) {

/**
 * GET /cmcc/v1/settings – Return all CMCC settings.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_settings(): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    return new WP_REST_Response( $settings, 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_update_settings' ) ) {

/**
 * POST /cmcc/v1/settings – Update CMCC settings.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_update_settings( WP_REST_Request $request ): WP_REST_Response {
    $body     = json_decode( $request->get_body(), true );
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );

    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Invalid settings data.',
        ), 400 );
    }

    // Merge settings (allow partial updates)
    foreach ( $body as $section => $values ) {
        if ( is_array( $values ) ) {
            foreach ( $values as $key => $value ) {
                $settings[ $section ][ $key ] = $value;
            }
        } else {
            $settings[ $section ] = $values;
        }
    }

    update_option( CMCC_SETTINGS_OPTION, $settings );

    return new WP_REST_Response( array(
        'success' => true,
        'data'    => $settings,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_item_history' ) ) {

/**
 * GET /cmcc/v1/queue/:id/history – Get item activity history.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_item_history( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id   = $request->get_param( 'id' );
    $log_table = CMCC_ACTIVITY_LOG_TABLE;

    $items = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name FROM {$log_table} l LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID WHERE l.item_id = %s ORDER BY l.timestamp DESC LIMIT 50", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $item_id
    ) );

    return new WP_REST_Response( array( 'items' => $items ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_user_reputation' ) ) {

/**
 * GET /cmcc/v1/users/reputation – get user reputation data.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_user_reputation(): WP_REST_Response {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;

    $users = $wpdb->get_results(
        "SELECT author_id, COUNT(*) as total_items,
        SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        MAX(spam_score) as max_spam_score,
        AVG(spam_score) as avg_spam_score
        FROM {$queue_table}
        WHERE author_id != ''
        GROUP BY author_id
        ORDER BY total_items DESC
        LIMIT 100" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );

    $result = array();
    foreach ( $users as $user ) {
        $spam_ratio = $user->total_items > 0 ? round( $user->spam_count / $user->total_items, 2 ) : 0;

        if ( $spam_ratio > 0.5 ) {
            $trust_level = 'Blocked';
        } elseif ( $spam_ratio > 0.2 ) {
            $trust_level = 'Suspicious';
        } elseif ( $spam_ratio > 0.05 ) {
            $trust_level = 'New';
        } else {
            $trust_level = 'Trusted';
        }

        $result[] = array(
            'author_id'      => $user->author_id,
            'total_items'    => (int) $user->total_items,
            'spam_count'     => (int) $user->spam_count,
            'approved_count' => (int) $user->approved_count,
            'max_spam_score' => round( (float) $user->max_spam_score, 2 ),
            'avg_spam_score' => round( (float) $user->avg_spam_score, 2 ),
            'spam_ratio'     => $spam_ratio,
            'trust_level'    => $trust_level,
        );
    }

    return new WP_REST_Response( array( 'users' => $result ), 200 );
}

} // End function_exists guard for cmcc_rest_get_user_reputation

if ( ! function_exists( 'cmcc_rest_get_reputation_raw' ) ) {

/**
 * GET /cmcc/v1/reputation-raw – return raw reputation data with pagination.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_reputation_raw( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;
    $page        = max( 1, (int) $request->get_param( 'page' ) );
    $per_page    = max( 1, min( 100, (int) $request->get_param( 'per_page' ) ) );
    $offset      = ( $page - 1 ) * $per_page;

    // Count total unique authors
    $count_sql  = "SELECT COUNT(DISTINCT author_id) FROM {$queue_table} WHERE author_id != ''";
    $total_items = (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Fetch paginated raw data grouped by author_id
    $users = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT
                author_id,
                COUNT(*) as total_items,
                SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_count,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                MAX(date_gmt) as last_seen
            FROM {$queue_table}
            WHERE author_id != ''
            GROUP BY author_id
            ORDER BY total_items DESC
            LIMIT %d OFFSET %d",
            $per_page,
            $offset
        )
    ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $result = array();
    foreach ( $users as $user ) {
        $result[] = array(
            'authorId'      => $user->author_id,
            'totalItems'    => (int) $user->total_items,
            'spamCount'     => (int) $user->spam_count,
            'approvedCount' => (int) $user->approved_count,
            'flaggedCount'  => (int) $user->flagged_count,
            'rejectedCount' => (int) $user->rejected_count,
            'lastSeen'      => $user->last_seen,
        );
    }

    return new WP_REST_Response( array(
        'data'        => $result,
        'total'       => $total_items,
        'page'        => $page,
        'per_page'    => $per_page,
        'total_pages' => (int) ceil( $total_items / $per_page ),
    ), 200 );
}

} // End function_exists guard for cmcc_rest_get_reputation_raw

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
 */
function cmcc_log_activity( array $data ): void {
    global $wpdb;

    $log_table = CMCC_ACTIVITY_LOG_TABLE;

    $wpdb->insert(
        $log_table,
        array(
            'moderator_id'    => $data['moderator_id'] ?? get_current_user_id(),
            'action'          => $data['action'] ?? '',
            'content_type'    => $data['content_type'] ?? '',
            'item_id'         => $data['item_id'] ?? '',
            'item_title'      => $data['item_title'] ?? '',
            'previous_status' => $data['previous_status'] ?? '',
            'new_status'      => $data['new_status'] ?? '',
            'notes'           => $data['notes'] ?? '',
        ),
        array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
    );
}

/**
 * Handle CSV export for bulk action.
 *
 * @param array $ids The item IDs to export.
 * @return WP_REST_Response
 */
function cmcc_handle_export_csv( array $ids ): void {
    global $wpdb;
    $queue_table = CMCC_QUEUE_TABLE;

    if ( empty( $ids ) ) {
        wp_die( 'No items to export.' );
    }

    // Build placeholders for IDs
    $placeholders = implode( ',', array_fill( 0, count( $ids ), '%s' ) );
    $items = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$queue_table} WHERE item_id IN ({$placeholders})",
            $ids
        )
    );

    // Set CSV headers
    header( 'Content-Type: text/csv; charset=utf-8' );
    header( 'Content-Disposition: attachment; filename="cmcc-export-' . gmdate( 'Y-m-d' ) . '.csv"' );
    header( 'Pragma: no-cache' );
    header( 'Expires: 0' );

    $output = fopen( 'php://output', 'w' );

    // UTF-8 BOM for Excel compatibility
    fwrite( $output, "\xEF\xBB\xBF" );

    // Header row
    fputcsv( $output, array( 'Item ID', 'Content Type', 'Author ID', 'Title', 'Status', 'Spam Score', 'Date' ) );

    foreach ( $items as $item ) {
        fputcsv( $output, array(
            $item->item_id,
            $item->content_type,
            $item->author_id,
            $item->title,
            $item->status,
            $item->spam_score,
            $item->date_gmt,
        ) );
    }

    fclose( $output );
    exit;
}

/**
 * REST callback for POST /cmcc/v1/settings/export.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_export_settings(): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    return new WP_REST_Response( array(
        'success' => true,
        'data'    => $settings,
    ), 200 );
}

/**
 * REST callback for POST /cmcc/v1/settings/import.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_import_settings( WP_REST_Request $request ): WP_REST_Response {
    $body = json_decode( $request->get_body(), true );
    $settings = $body['settings'] ?? array();

    if ( empty( $settings ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'No settings data provided.',
        ), 400 );
    }

    update_option( CMCC_SETTINGS_OPTION, $settings );

    return new WP_REST_Response( array(
        'success' => true,
        'message' => 'Settings imported.',
    ), 200 );
}

/**
 * Get default CMCC settings.
 *
 * @return array<string, mixed>
 */
function cmcc_get_default_settings(): array {
    return array(
        'general' => array(
            'queue_page_size'  => 25,
            'default_language' => 'en',
            'date_format'      => 'relative',
            'notify_on_spam'   => true,
        ),
        'moderation' => array(
            'auto_approve_trusted' => true,
            'hold_for_review'      => true,
            'max_links'            => 5,
        ),
        'ai_moderation' => array(
            'engine'              => 'none',
            'api_key'             => '',
            'model'               => '',
            'auto_moderate'       => false,
            'spam_threshold'      => 70,
            'enable_language_detection' => true,
            'enable_sentiment_analysis' => false,
        ),
        'notifications' => array(
            'email_alerts' => false,
        ),
    );
}

// ─── Additional REST Callbacks ─────────────────────────────────────────────

if ( ! function_exists( 'cmcc_rest_add_note' ) ) {

/**
 * POST /cmcc/v1/queue/:id/note – Add a note to a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_add_note( WP_REST_Request $request ): WP_REST_Response {
    $item_id = $request->get_param( 'id' );
    $body    = json_decode( $request->get_body(), true );

    // In a real plugin, you would store notes in a dedicated table.
    // For this demo, return a success response.
    return new WP_REST_Response( array(
        'success' => true,
        'note'    => array(
            'id'        => uniqid( 'note_', true ),
            'content'   => sanitize_textarea_field( $body['content'] ?? '' ),
            'is_internal' => ! empty( $body['is_internal'] ),
            'author'    => wp_get_current_user()->display_name,
            'timestamp' => current_time( 'mysql' ),
        ),
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_notes' ) ) {

/**
 * GET /cmcc/v1/queue/:id/notes – Get notes for a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_notes( WP_REST_Request $request ): WP_REST_Response {
    return new WP_REST_Response( array( 'notes' => array() ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_assign_item' ) ) {

/**
 * POST /cmcc/v1/queue/:id/assign – Assign a queue item to a moderator.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_assign_item( WP_REST_Request $request ): WP_REST_Response {
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_activity_feed' ) ) {

/**
 * GET /cmcc/v1/activity-feed – Return recent moderation activity.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_activity_feed(): WP_REST_Response {
    global $wpdb;
    $log_table = CMCC_ACTIVITY_LOG_TABLE;

    $events = $wpdb->get_results(
        "SELECT l.*, u.display_name as moderator_name
         FROM {$log_table} l
         LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
         ORDER BY l.timestamp DESC
         LIMIT 50"
    );

    $feed = array();
    foreach ( $events as $event ) {
        $feed[] = array(
            'id'          => 'event_' . $event->id,
            'type'        => 'action',
            'actorId'     => $event->moderator_id,
            'actorName'   => $event->moderator_name ?: 'User #' . $event->moderator_id,
            'description' => $event->action . ' ' . $event->content_type . ' item: ' . $event->item_title,
            'itemId'      => $event->item_id,
            'itemTitle'   => $event->item_title,
            'timestamp'   => $event->timestamp,
        );
    }

    return new WP_REST_Response( array( 'events' => $feed ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_raw_events' ) ) {

/**
 * GET /cmcc/v1/raw-events – Get raw events for client-side analytics processing.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_raw_events( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;
    $log_table = CMCC_ACTIVITY_LOG_TABLE;
    $start     = sanitize_text_field( $request->get_param( 'start_date' ) );
    $end       = sanitize_text_field( $request->get_param( 'end_date' ) );

    $where  = array( '1=1' );
    $params = array();

    if ( ! empty( $start ) ) {
        $where[]  = 'timestamp >= %s';
        $params[] = $start;
    }
    if ( ! empty( $end ) ) {
        $where[]  = 'timestamp <= %s';
        $params[] = $end;
    }

    $where_clause = implode( ' AND ', $where );
    $sql          = "SELECT * FROM {$log_table} WHERE {$where_clause} ORDER BY timestamp ASC LIMIT 10000";

    $events = $params
        ? $wpdb->get_results( $wpdb->prepare( $sql, $params ) )
        : $wpdb->get_results( $sql );

    return new WP_REST_Response( $events, 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_reports_moderation_activity' ) ) {

/**
 * POST /cmcc/v1/reports/moderation-activity – Generate moderation activity report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_moderation_activity( WP_REST_Request $request ): WP_REST_Response {
    // This is a stub – return a basic report.
    $data = array( array( 'Date', 'Action', 'Moderator', 'Item' ) );
    return new WP_REST_Response( array(
        'success' => true,
        'data'    => $data,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_reports_compliance_audit' ) ) {

/**
 * POST /cmcc/v1/reports/compliance-audit – Export compliance audit log.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_compliance_audit( WP_REST_Request $request ): WP_REST_Response {
    $data = array( array( 'Date', 'Action', 'Moderator', 'Item', 'Notes' ) );
    return new WP_REST_Response( array(
        'success' => true,
        'data'    => $data,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_reports_scheduled' ) ) {

/**
 * POST /cmcc/v1/reports/scheduled – Schedule a report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_scheduled( WP_REST_Request $request ): WP_REST_Response {
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_deactivate_users' ) ) {

/**
 * POST /cmcc/v1/users/deactivate – Deactivate users.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_deactivate_users( WP_REST_Request $request ): WP_REST_Response {
    $author_id = $request->get_param( 'author_id' );
    if ( empty( $author_id ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Missing author_id parameter.',
        ), 400 );
    }

    $user = get_userdata( (int) $author_id );
    if ( ! $user ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'User not found.',
        ), 404 );
    }

    // Deactivate the user - set account status meta
    update_user_meta( (int) $author_id, 'cmcc_account_status', 'deactivated' );

    // Log the activity
    cmcc_log_activity( array(
        'action'       => 'deactivated',
        'content_type' => 'user',
        'item_id'      => (string) $author_id,
        'item_title'   => $user->display_name,
    ) );

    return new WP_REST_Response( array(
        'success' => true,
        'message' => sprintf( 'User %s deactivated successfully.', $user->display_name ),
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_ai_evaluate' ) ) {

/**
 * GET /cmcc/v1/queue/:id/ai-evaluate – Evaluate content using AI.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_ai_evaluate( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;
    $queue_table = CMCC_QUEUE_TABLE;
    $item_id = $request->get_param( 'id' );

    if ( empty( $item_id ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Missing item ID.',
        ), 400 );
    }

    $item = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$queue_table} WHERE item_id = %s",
        $item_id
    ) );

    if ( ! $item ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => 'Item not found.',
        ), 404 );
    }

    // Simple keyword-based spam analysis
    $spam_keywords = array(
        'viagra', 'casino', 'lottery', 'free money', 'click here',
        'buy now', 'act now', 'limited time', 'congratulations',
        'you won', 'prize', 'urgent', 'call now', 'subscribe',
        'earn money', 'work from home', 'make money fast',
    );

    $text = strtolower( $item->title . ' ' . ( $item->excerpt ?? '' ) );
    $score = 0.0;
    $found_keywords = array();

    foreach ( $spam_keywords as $keyword ) {
        if ( strpos( $text, $keyword ) !== false ) {
            $found_keywords[] = $keyword;
            $score += 0.15;
        }
    }

    // Factor in spam_score from queue item if available
    if ( isset( $item->spam_score ) && $item->spam_score > 0 ) {
        $score = max( $score, (float) $item->spam_score );
    }

    // Detect language (simple heuristic)
    $lang = 'en';
    if ( preg_match( '/[а-яА-Я]/u', $text ) ) $lang = 'ru';
    elseif ( preg_match( '/[äöüß]/i', $text ) ) $lang = 'de';
    elseif ( preg_match( '/[éèêëàâùûç]/i', $text ) ) $lang = 'fr';
    elseif ( preg_match( '/[ñíóúé]/i', $text ) ) $lang = 'es';

    // Sentiment analysis (simple keyword-based)
    $positive_words = array( 'good', 'great', 'excellent', 'amazing', 'love', 'fantastic', 'nice', 'helpful' );
    $negative_words = array( 'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'ugly', 'disgusting' );
    $positive_count = 0;
    $negative_count = 0;
    foreach ( $positive_words as $w ) { if ( strpos( $text, $w ) !== false ) $positive_count++; }
    foreach ( $negative_words as $w ) { if ( strpos( $text, $w ) !== false ) $negative_count++; }
    $sentiment = 'neutral';
    if ( $positive_count > $negative_count ) $sentiment = 'positive';
    elseif ( $negative_count > $positive_count ) $sentiment = 'negative';

    return new WP_REST_Response( array(
        'success'    => true,
        'spamScore'  => min( $score, 1.0 ),
        'language'   => $lang,
        'sentiment'  => $sentiment,
        'categories' => $found_keywords,
    ), 200 );
}

} // End function_exists guard
