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
// Auto-load Library Modules
// --------------------------------------------------------------------------

/**
 * Load the enhanced library modules for reports, collaboration, user reputation,
 * and multi-platform hub features.
 *
 * Each file wraps its function definitions in `function_exists()` guards so that
 * the inline implementations in this file serve as safe fallbacks.
 *
 * The order matters: library modules are loaded first so their implementations
 * (which may be more feature-complete) take precedence.
 */
require_once __DIR__ . '/src/lib/reports.php';
require_once __DIR__ . '/src/lib/collaboration.php';
require_once __DIR__ . '/src/lib/user-reputation.php';
require_once __DIR__ . '/src/lib/multi-platform.php';

// --------------------------------------------------------------------------
// Activation / Deactivation
// --------------------------------------------------------------------------

/**
 * Create or upgrade database tables on plugin activation.
 */
function cmcc_activate(): void {
    global $wpdb;

    // Check existing version for upgrade path.
    $installed_version = get_option( 'cmcc_version', '0.0.0' );

    if ( version_compare( $installed_version, '1.0.0', '<' ) ) {
        // Run 1.0.0 migration (fresh install or upgrade from pre-1.0.0).
        // Tables will be created/updated below by dbDelta().
    }

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

    // Seed sample data for fresh install so dashboard isn't completely empty.
    if ( '0.0.0' === $installed_version ) {
        cmcc_seed_sample_data();
    }

    // Update the stored version for future upgrade checks.
    update_option( 'cmcc_version', CMCC_VERSION );

    flush_rewrite_rules();
}
/**
 * Cleanup on plugin deactivation.
 */
function cmcc_deactivate(): void {
    flush_rewrite_rules();
}

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
            'email_alerts'      => true,
            'alert_threshold'   => 10,
            'notify_moderators' => true,
        ),
        'appearance' => array(
            'theme'          => 'light',
            'queue_view'     => 'table',
            'items_per_page' => 25,
            'show_columns'   => array(
                'id', 'content_type', 'title', 'author', 'status',
                'spam_score', 'date', 'actions',
            ),
            'date_format' => 'relative',
            'timezone'    => 'UTC',
        ),
        'auto_moderation' => array(
            'ai_detection_engine'            => 'none',
            'ai_api_endpoint'                => '',
            'ai_api_key'                     => '',
            'spam_score_flag_threshold'      => 60,
            'spam_score_spam_threshold'      => 80,
            'spam_score_discard_threshold'   => 95,
            'content_hash_sensitivity'       => 3,
            'max_links_allowed'              => 5,
            'block_all_links'                => false,
            'allowlist_domains'              => '',
            'block_shortened_urls'           => false,
            'check_link_reputation'          => false,
            'google_safe_browsing_api_key'   => '',
            'whitelisted_keywords'           => '',
            'regex_patterns'                 => '',
            'all_caps_detection'             => false,
            'repeated_char_detection'        => false,
            'language_filter'                => 'all',
            'min_account_age_hours'          => 0,
            'block_disposable_emails'        => false,
            'max_posts_per_hour'             => 0,
            'banned_ip_ranges'               => '',
            'banned_country_codes'           => '',
            'vpn_proxy_detection'            => false,
            'min_submit_time'                => 3,
            'cooldown_between_posts'         => 0,
            'duplicate_detection_window_days' => 7,
            'duplicate_similarity_threshold'  => 80,
            'weekend_off_hours_sensitivity'  => false,
            'default_action'                 => 'flag',
            'auto_approve_threshold'         => 10,
            'notify_on_auto_discard'         => true,
            'auto_ban_after_n_violations'    => 0,
            'ban_duration'                   => 'temporary_24h',
            'learning_mode'                  => false,
        ),
        'integrations' => array(
            'auto_import_comments'     => true,
            'auto_import_posts'       => true,
            'auto_import_woocommerce'  => false,
            'auto_import_bbpress'     => false,
            'auto_import_buddypress'  => false,
            'auto_import_gravityforms' => false,
            'webhook_url'             => '',
        ),
        'moderator_management' => array(
            'moderator_roles'               => array( 'administrator' ),
            'secondary_approval_required'    => false,
            'action_confirmation_required'   => true,
        ),
        'data_retention' => array(
            'activity_log_retention_days'   => 90,
            'archived_item_retention_days'   => 365,
            'auto_purge_schedule'           => 'weekly',
            'export_before_purge'           => true,
        ),
        'api_webhooks' => array(
            'webhook_new_items'  => '',
            'webhook_approvals'  => '',
            'webhook_spam'       => '',
            'api_rate_limiting'  => 60,
            'custom_api_secret'  => '',
        ),
        'backup_restore' => array(
            'scheduled_backups' => 'none',
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

    add_submenu_page(
        'cmcc',
        esc_html__( 'Reports & Compliance', 'cmcc' ),
        esc_html__( 'Reports', 'cmcc' ),
        'manage_options',
        'cmcc-reports',
        'cmcc_render_app'
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'User Reputation', 'cmcc' ),
        esc_html__( 'Users', 'cmcc' ),
        'manage_options',
        'cmcc-users',
        'cmcc_render_app'
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'Collaboration', 'cmcc' ),
        esc_html__( 'Collaboration', 'cmcc' ),
        'manage_options',
        'cmcc-collaboration',
        'cmcc_render_app'
    );

    add_submenu_page(
        'cmcc',
        esc_html__( 'Multi-Platform Hub', 'cmcc' ),
        esc_html__( 'Platforms', 'cmcc' ),
        'manage_options',
        'cmcc-platforms',
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

    // Highlight the correct submenu based on the 'page' parameter
    global $parent_file, $submenu_file;
    $page = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : 'cmcc';
    $parent_file = 'cmcc';

    $submenu_map = array(
        'cmcc'              => 'cmcc',
        'cmcc-analytics'    => 'cmcc-analytics',
        'cmcc-settings'     => 'cmcc-settings',
        'cmcc-reports'      => 'cmcc-reports',
        'cmcc-users'        => 'cmcc-users',
        'cmcc-collaboration' => 'cmcc-collaboration',
        'cmcc-platforms'    => 'cmcc-platforms',
    );
    $submenu_file = isset( $submenu_map[ $page ] ) ? $submenu_map[ $page ] : 'cmcc';

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

    // The 'page' parameter determines the initial active tab in the React app.
    // The value is sanitized with sanitize_key() which strips all unsafe
    // characters. Full authorization is enforced by the manage_options
    // capability check in cmcc_render_app() before this function is called.
    $initial_tab = 'cmcc';
    if ( isset( $_GET['page'] ) && is_string( $_GET['page'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $initial_tab = sanitize_key( $_GET['page'] );
    }

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
            'initialTab'   => $initial_tab,
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
            'search'         => array( 'type' => 'string', 'default' => '' ),
            'sort_field'     => array( 'type' => 'string', 'default' => 'created_at' ),
            'sort_direction' => array( 'type' => 'string', 'default' => 'DESC' ),
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
        'args'                => array(
            'start_date' => array(
                'required'          => false,
                'type'              => 'string',
                'format'            => 'date-time',
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'end_date' => array(
                'required'          => false,
                'type'              => 'string',
                'format'            => 'date-time',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
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

    // GET /cmcc/v1/queue/:id/history
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/history', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_item_history',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/users/reputation
    register_rest_route( 'cmcc/v1', '/users/reputation', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_user_reputation',
        'permission_callback' => 'cmcc_rest_permission_check',
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

    // ---- NEW: Collaboration / Queue Assignment & Notes ----

    // POST /cmcc/v1/queue/:id/note – Add a note to a queue item
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/note', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_add_note',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id'          => array( 'required' => true ),
            'content'     => array( 'required' => true, 'type' => 'string' ),
            'is_internal' => array( 'type' => 'boolean', 'default' => true ),
            'type'        => array( 'type' => 'string', 'default' => 'general' ),
        ),
    ) );

    // GET /cmcc/v1/queue/:id/notes – Get notes for a queue item
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/notes', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_notes',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/queue/:id/assign – Assign item to a moderator
    register_rest_route( 'cmcc/v1', '/queue/(?P<id>[a-zA-Z0-9_-]+)/assign', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_assign_item',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id'        => array( 'required' => true ),
            'assignee'  => array( 'type' => 'string' ),
            'due_date'  => array( 'type' => 'string' ),
            'priority'  => array( 'type' => 'string', 'default' => 'normal' ),
        ),
    ) );

    // GET /cmcc/v1/activity-feed – Get recent moderation activity feed
    register_rest_route( 'cmcc/v1', '/activity-feed', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_activity_feed',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'limit' => array( 'type' => 'integer', 'default' => 20 ),
        ),
    ) );

    // ---- NEW: Reports & Compliance ----

    // POST /cmcc/v1/reports/moderation-activity – Generate moderation activity report
    register_rest_route( 'cmcc/v1', '/reports/moderation-activity', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_moderation_activity',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'start_date' => array( 'type' => 'string', 'default' => '' ),
            'end_date'   => array( 'type' => 'string', 'default' => '' ),
            'format'     => array( 'type' => 'string', 'default' => 'csv' ),
        ),
    ) );

    // POST /cmcc/v1/reports/compliance-audit – Export compliance audit log
    register_rest_route( 'cmcc/v1', '/reports/compliance-audit', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_compliance_audit',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'start_date' => array( 'type' => 'string', 'default' => '' ),
            'end_date'   => array( 'type' => 'string', 'default' => '' ),
            'format'     => array( 'type' => 'string', 'default' => 'csv' ),
        ),
    ) );

    // POST /cmcc/v1/reports/moderator-performance – Get moderator performance analytics
    register_rest_route( 'cmcc/v1', '/reports/moderator-performance', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_reports_moderator_performance',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'start_date' => array( 'type' => 'string', 'default' => '' ),
            'end_date'   => array( 'type' => 'string', 'default' => '' ),
        ),
    ) );

    // POST /cmcc/v1/reports/scheduled – Schedule a recurring report
    register_rest_route( 'cmcc/v1', '/reports/scheduled', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_reports_scheduled',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'type'      => array( 'required' => true, 'type' => 'string' ),
            'frequency' => array( 'required' => true, 'type' => 'string' ),
            'format'    => array( 'type' => 'string', 'default' => 'csv' ),
            'emails'    => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
        ),
    ) );

    // GET /cmcc/v1/reports/scheduled – List scheduled reports
    register_rest_route( 'cmcc/v1', '/reports/scheduled', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_scheduled_reports',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // DELETE /cmcc/v1/reports/scheduled – Delete a scheduled report
    register_rest_route( 'cmcc/v1', '/reports/scheduled', array(
        'methods'             => 'DELETE',
        'callback'            => 'cmcc_rest_delete_scheduled_report',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'id' => array( 'required' => true, 'type' => 'string' ),
        ),
    ) );

    // ---- NEW: Multi-Platform Hub ----

    // GET /cmcc/v1/platforms/status – Get status of all connected platforms
    register_rest_route( 'cmcc/v1', '/platforms/status', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_platforms_status',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // POST /cmcc/v1/platforms/sync-settings – Sync firewall rules across platforms
    register_rest_route( 'cmcc/v1', '/platforms/sync-settings', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_platforms_sync_settings',
        'permission_callback' => 'cmcc_rest_permission_check',
    ) );

    // GET /cmcc/v1/unified-queue – Get unified queue across all platforms
    register_rest_route( 'cmcc/v1', '/unified-queue', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_unified_queue',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'page'     => array( 'type' => 'integer', 'default' => 1 ),
            'per_page' => array( 'type' => 'integer', 'default' => 25 ),
            'status'   => array( 'type' => 'string', 'default' => '' ),
        ),
    ) );

    // GET /cmcc/v1/reputation/user/{id} – Detailed reputation for a single user
    register_rest_route( 'cmcc/v1', '/reputation/user/(?P<id>[^/]+)', array(
        'methods'             => 'GET',
        'callback'            => 'cmcc_rest_get_user_reputation_detail',
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

    // POST /cmcc/v1/queue/export – Export queue items as CSV
    register_rest_route( 'cmcc/v1', '/queue/export', array(
        'methods'             => 'POST',
        'callback'            => 'cmcc_rest_queue_export',
        'permission_callback' => 'cmcc_rest_permission_check',
        'args'                => array(
            'status'  => array( 'type' => 'string', 'default' => '' ),
            'ids'     => array(
                'type'  => 'array',
                'items' => array( 'type' => 'string' ),
            ),
        ),
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

    // Sorting parameters with whitelist-based sanitisation.
    $allowed_sort_fields = array( 'created_at', 'date_gmt', 'spam_score', 'title', 'status', 'content_type', 'author_id' );
    $sort_field_raw     = $request->get_param( 'sort_field' );
    $sort_field         = in_array( $sort_field_raw, $allowed_sort_fields, true ) ? $sort_field_raw : 'created_at';

    $sort_direction_raw = strtoupper( $request->get_param( 'sort_direction' ) );
    $sort_direction     = ( 'ASC' === $sort_direction_raw ) ? 'ASC' : 'DESC';

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
        "SELECT * FROM {$table} WHERE {$where_clause} ORDER BY {$sort_field} {$sort_direction} LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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

    $allowed_actions = array( 'approve', 'reject', 'spam', 'defer', 'flag' );
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
        'flag'    => 'flagged',
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
    $action = cmcc_normalize_action( sanitize_text_field( $request->get_param( 'action' ) ) );

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

        // B4 Fix: Deactivate actual WordPress users for 'deactivate-users' action
        if ( 'deactivate-users' === $action ) {
            $items_sql = $wpdb->prepare(
                "SELECT * FROM {$table} WHERE item_id IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                $ids
            );
            $deactivate_items = $wpdb->get_results( $items_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            foreach ( $deactivate_items as $dq_item ) {
                $author_id = intval( $dq_item->author_id );
                if ( $author_id > 0 && $author_id !== 1 ) {
                    wp_deactivate_user( $author_id );
                    cmcc_log_activity( array(
                        'moderator_id'    => get_current_user_id(),
                        'action'          => 'deactivate-users',
                        'content_type'    => $dq_item->content_type,
                        'item_id'         => $dq_item->item_id,
                        'item_title'      => $dq_item->title,
                        'previous_status' => $dq_item->status,
                        'new_status'      => 'deactivated',
                        'notes'           => 'User account deactivated via bulk action',
                    ) );
                }
            }
        }
    }

    if ( 'export-csv' === $action ) {
        $placeholders_int = array_fill(0, count($ids), '%d');
        $id_ints = array_map('intval', $ids);

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT item_id, content_type, title, status, spam_score, author_id, date_gmt FROM {$table} WHERE item_id IN (" . implode(',', $placeholders_int) . ')'
            ),
            $id_ints
        );

        $csv_data = array();
        // Header row
        $csv_data[] = array('ID', 'Content Type', 'Title', 'Status', 'Spam Score', 'Author ID', 'Date GMT');
        foreach ($results as $row) {
            $csv_data[] = array($row->item_id, $row->content_type, $row->title, $row->status, $row->spam_score, $row->author_id, $row->date_gmt);
        }

        return new WP_REST_Response( array(
            'success' => true,
            'filename' => 'cmcc-export-' . gmdate( 'Y-m-d-His' ) . '.csv',
            'data' => $csv_data,
            'headers' => array('ID', 'Content Type', 'Title', 'Status', 'Spam Score', 'Author ID', 'Date GMT'),
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

    // Parse date range from request (default: last 7 days).
    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );

    if ( $start_date_raw ) {
        $start_date = gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) );
    } else {
        $start_date = gmdate( 'Y-m-d H:i:s', strtotime( '-7 days' ) );
    }
    if ( $end_date_raw ) {
        $end_date = gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) );
    } else {
        $end_date = gmdate( 'Y-m-d H:i:s' );
    }

    // Date range WHERE clause for log table (heatmap, volume, activity summary).
    $date_where = $wpdb->prepare( 'timestamp >= %s AND timestamp <= %s', $start_date, $end_date );

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

    // Content type breakdown with per-status counts.
    $content_type_data = $wpdb->get_results(
        "SELECT content_type, COUNT(*) as count FROM {$queue_table} GROUP BY content_type ORDER BY count DESC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );
    $content_type_statuses = $wpdb->get_results(
        "SELECT content_type, status, COUNT(*) as count FROM {$queue_table} GROUP BY content_type, status ORDER BY content_type, status", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );
    // Index by content_type + status
    $ct_status_map = array();
    foreach ( $content_type_statuses as $srow ) {
        $ct_status_map[ $srow->content_type ][ $srow->status ] = (int) $srow->count;
    }
    $content_breakdown = array();
    $all_statuses = array( 'pending', 'approved', 'spam', 'flagged', 'rejected', 'deferred' );
    foreach ( $content_type_data as $row ) {
        $ct = $row->content_type;
        $total_ct = (int) $row->count;
        $entry = array(
            'content_type' => $ct,
            'count'        => $total_ct,
            'percentage'   => $queue_stats['total'] > 0
                ? round( ( $total_ct / $queue_stats['total'] ) * 100, 1 )
                : 0,
        );
        foreach ( $all_statuses as $s ) {
            $scount = isset( $ct_status_map[ $ct ][ $s ] ) ? $ct_status_map[ $ct ][ $s ] : 0;
            $entry[ $s ]         = $scount;
            $entry[ $s . '_pct' ] = $total_ct > 0
                ? round( ( $scount / $total_ct ) * 100, 1 )
                : 0;
        }
        $content_breakdown[] = $entry;
    }

    // Spam ratio.
    $spam_count  = isset( $status_counts['spam'] ) ? (int) $status_counts['spam']->count : 0;
    $total_count = $queue_stats['total'];
    $spam_ratio  = $total_count > 0 ? $spam_count / $total_count : 0;

    // Recent activity stats within date range.
    $activity_counts = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT
                SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as approvals,
                SUM(CASE WHEN action = 'reject' THEN 1 ELSE 0 END) as rejections,
                SUM(CASE WHEN action = 'spam' THEN 1 ELSE 0 END) as spam_actions,
                SUM(CASE WHEN action = 'defer' THEN 1 ELSE 0 END) as defer_actions,
                SUM(CASE WHEN action = 'flag' THEN 1 ELSE 0 END) as flag_actions,
                SUM(CASE WHEN action = 'deactivate-users' THEN 1 ELSE 0 END) as deactivate_actions
            FROM {$log_table} WHERE {$date_where}"
        )
    );

    $approvals       = (int) ( $activity_counts->approvals ?? 0 );
    $rejections      = (int) ( $activity_counts->rejections ?? 0 );
    $spam_actions    = (int) ( $activity_counts->spam_actions ?? 0 );
    $defer_actions   = (int) ( $activity_counts->defer_actions ?? 0 );
    $flag_actions    = (int) ( $activity_counts->flag_actions ?? 0 );
    $deactivate_act  = (int) ( $activity_counts->deactivate_actions ?? 0 );

    // total_actions is always the sum of all individual counts, not COUNT(*)
    $total_actions = $approvals + $rejections + $spam_actions + $defer_actions + $flag_actions + $deactivate_act;

    // Activity heatmap: 7 days × 24 hours grid from activity log within date range.
    $heatmap_sql = $wpdb->prepare(
        "SELECT
            DAYOFWEEK(timestamp) - 1 as day_of_week,
            HOUR(timestamp) as hour,
            COUNT(*) as count
        FROM {$log_table}
        WHERE {$date_where}
        GROUP BY DAYOFWEEK(timestamp), HOUR(timestamp)
        ORDER BY day_of_week, hour"
    );
    $heatmap_rows = $wpdb->get_results( $heatmap_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Initialize 7x24 grid
    $heatmap_data = array();
    for ( $d = 0; $d < 7; $d++ ) {
        $heatmap_data[ $d ] = array_fill( 0, 24, 0 );
    }
    $heatmap_max = 0;
    if ( is_array( $heatmap_rows ) ) {
        foreach ( $heatmap_rows as $row ) {
            $d = intval( $row->day_of_week );
            $h = intval( $row->hour );
            $c = intval( $row->count );
            if ( isset( $heatmap_data[ $d ][ $h ] ) ) {
                $heatmap_data[ $d ][ $h ] = $c;
                if ( $c > $heatmap_max ) {
                    $heatmap_max = $c;
                }
            }
        }
    }

    // Status distribution for pie chart.
    $status_distribution = array(
        'labels' => array( 'Pending', 'Approved', 'Spam', 'Flagged', 'Rejected', 'Deferred' ),
        'values' => array(
            $queue_stats['pending'],
            $queue_stats['approved'],
            $queue_stats['spam'],
            $queue_stats['flagged'],
            $queue_stats['rejected'],
            0,
        ),
        'colors' => array( '#f59e0b', '#22c55e', '#ef4444', '#f97316', '#6b7280', '#06b6d4' ),
    );
    // Add deferred count if available.
    $status_distribution['values'][5] = isset( $status_counts['deferred'] ) ? (int) $status_counts['deferred']->count : 0;

    // Moderation volume over time within date range.
    $volume_sql = $wpdb->prepare(
        "SELECT
            DATE(timestamp) as day,
            SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN action = 'reject' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN action = 'spam' THEN 1 ELSE 0 END) as spam,
            SUM(CASE WHEN action = 'flag' THEN 1 ELSE 0 END) as flagged,
            SUM(CASE WHEN action = 'defer' THEN 1 ELSE 0 END) as deferred
        FROM {$log_table}
        WHERE {$date_where}
        GROUP BY DATE(timestamp)
        ORDER BY day ASC"
    );
    $volume_rows = $wpdb->get_results( $volume_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Build day-by-day labels filling gaps with zeros (based on date range).
    $start_ts  = strtotime( $start_date );
    $end_ts    = strtotime( $end_date );
    $total_days = max( 1, (int) ceil( ( $end_ts - $start_ts ) / DAY_IN_SECONDS ) );

    $volume_labels   = array();
    $volume_approved  = array();
    $volume_rejected  = array();
    $volume_spam      = array();
    $volume_flagged   = array();
    $volume_deferred  = array();
    $volume_map = array();
    foreach ( $volume_rows as $vr ) {
        $volume_map[ $vr->day ] = $vr;
    }
    for ( $i = $total_days - 1; $i >= 0; $i-- ) {
        $date     = gmdate( 'M j', $start_ts + ( $i * DAY_IN_SECONDS ) );
        $date_key = gmdate( 'Y-m-d', $start_ts + ( $i * DAY_IN_SECONDS ) );
        $volume_labels[] = $date;
        if ( isset( $volume_map[ $date_key ] ) ) {
            $v = $volume_map[ $date_key ];
            $volume_approved[]  = (int) $v->approved;
            $volume_rejected[]  = (int) $v->rejected;
            $volume_spam[]      = (int) $v->spam;
            $volume_flagged[]   = (int) $v->flagged;
            $volume_deferred[]  = (int) $v->deferred;
        } else {
            $volume_approved[]  = 0;
            $volume_rejected[]  = 0;
            $volume_spam[]      = 0;
            $volume_flagged[]   = 0;
            $volume_deferred[]  = 0;
        }
    }

    // Top spam content types for bar chart
    $spam_types = $wpdb->get_results(
        "SELECT content_type, COUNT(*) as count FROM {$queue_table} WHERE status = 'spam' GROUP BY content_type ORDER BY count DESC LIMIT 10", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );
    $spam_type_labels = array();
    $spam_type_values = array();
    $spam_type_colors = array( '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#6366f1' );
    foreach ( $spam_types as $st ) {
        $spam_type_labels[] = $st->content_type;
        $spam_type_values[] = (int) $st->count;
    }

    return new WP_REST_Response( array(
        'date_range'           => array(
            'start' => $start_date,
            'end'   => $end_date,
        ),
        'queue_stats'          => $queue_stats,
        'content_type_breakdown' => $content_breakdown,
        'spam_ratio'           => array(
            'spam_count'  => $spam_count,
            'total_count' => $total_count,
            'ratio'       => round( $spam_ratio, 4 ),
            'percentage'  => round( $spam_ratio * 100, 1 ),
        ),
        'activity_summary'     => array(
            'total_actions' => $total_actions,
            'approvals'     => $approvals,
            'rejections'    => $rejections,
            'spam_actions'  => $spam_actions,
            'defer_actions' => $defer_actions,
            'flag_actions'  => $flag_actions,
        ),
        'activity_heatmap'     => array(
            'data'     => $heatmap_data,
            'maxCount' => $heatmap_max,
        ),
        'status_distribution'  => $status_distribution,
        'moderation_volume'    => array(
            'labels'   => $volume_labels,
            'approved' => $volume_approved,
            'rejected' => $volume_rejected,
            'spam'     => $volume_spam,
            'flagged'  => $volume_flagged,
            'deferred' => $volume_deferred,
        ),
        'spam_content_types'   => array(
            'labels' => $spam_type_labels,
            'values' => $spam_type_values,
            'colors' => array_slice( $spam_type_colors, 0, count( $spam_type_labels ) ),
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
        "SELECT l.*, u.display_name as moderator_name FROM {$table} l LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID WHERE {$where_clause} ORDER BY l.timestamp DESC LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        array_merge( $values, array( $per_page, $offset ) )
    );
    $items = $wpdb->get_results( $data_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Resolve moderator display names
    $user_ids = array_unique(array_filter(array_map(function($e) {
        return isset($e->moderator_id) ? intval($e->moderator_id) : 0;
    }, $items)));

    $display_names = array();
    if (!empty($user_ids)) {
        foreach ($user_ids as $uid) {
            $user_info = get_userdata($uid);
            $display_names[$uid] = $user_info ? $user_info->display_name : 'Unknown';
        }
    }

    // Map display names back to entries
    foreach ($items as &$entry) {
        $uid = isset($entry->moderator_id) ? intval($entry->moderator_id) : 0;
        $entry->moderator_display_name = isset($display_names[$uid]) ? $display_names[$uid] : 'System';
    }
    unset($entry);

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
    $stored   = get_option( CMCC_SETTINGS_OPTION, array() );
    $defaults = cmcc_get_default_settings();
    // Merge stored settings with defaults to ensure all sections are present
    // even if they were added by a newer version of the plugin.
    $settings = array_merge( $defaults, $stored );
    // Merge each section's fields individually so new fields appear
    foreach ( $defaults as $section => $fields ) {
        if ( is_array( $fields ) && isset( $stored[ $section ] ) && is_array( $stored[ $section ] ) ) {
            $settings[ $section ] = array_merge( $fields, $stored[ $section ] );
        }
    }
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
// REST Callbacks – New Features (Export, Import, History, Reputation)
// --------------------------------------------------------------------------

/**
 * POST /cmcc/v1/settings/export – export settings as JSON.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_export_settings(): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    return new WP_REST_Response( array(
        'success'     => true,
        'data'        => $settings,
        'exported_at' => current_time( 'mysql', true ),
    ), 200 );
}

/**
 * POST /cmcc/v1/settings/import – import settings from JSON.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_import_settings( WP_REST_Request $request ): WP_REST_Response {
    $body = $request->get_json_params();
    if ( ! isset( $body['settings'] ) || ! is_array( $body['settings'] ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid settings data.', 'cmcc' ),
        ), 400 );
    }
    $merged = cmcc_sanitize_settings( $body['settings'], cmcc_get_default_settings() );
    update_option( CMCC_SETTINGS_OPTION, $merged );
    return new WP_REST_Response( array(
        'success' => true,
        'message' => esc_html__( 'Settings imported successfully.', 'cmcc' ),
    ), 200 );
}

if ( ! function_exists( 'cmcc_rest_get_item_history' ) ) {

/**
 * GET /cmcc/v1/queue/:id/history – get item history/timeline.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_item_history( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id   = $request->get_param( 'id' );
    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

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

    $queue_table = $wpdb->prefix . CMCC_QUEUE_TABLE;

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

} // End function_exists guard

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

if ( ! function_exists( 'cmcc_send_notification' ) ) {

/**
 * Send an email notification to moderators.
 *
 * @param string $subject The email subject line.
 * @param string $message The email message body (HTML).
 * @param string $type    The notification type (default: 'moderation').
 * @return void
 */
function cmcc_send_notification( string $subject, string $message, string $type = 'moderation' ): void {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    $notify   = $settings['notifications']['notify_moderators'] ?? true;

    if ( ! $notify ) {
        return;
    }

    $moderators = get_users( array( 'role__in' => array( 'administrator' ) ) );
    $headers    = array( 'Content-Type: text/html; charset=UTF-8' );

    foreach ( $moderators as $mod ) {
        wp_mail( $mod->user_email, $subject, $message, $headers );
    }
}

} // End function_exists guard

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

// --------------------------------------------------------------------------
// Helper Functions – Action Normalization, CSV, Firewall, Hooks
// --------------------------------------------------------------------------

/**
 * Normalize action names to canonical form (B3 Fix).
 *
 * Maps various action name formats to the canonical set:
 * 'approve', 'reject', 'spam', 'defer', 'flag'.
 *
 * @param string $action The raw action name.
 * @return string The normalized action name.
 */
function cmcc_normalize_action( string $action ): string {
    $normalized = strtolower( trim( $action ) );

    $map = array(
        'approved'       => 'approve',
        'marked_as_spam' => 'spam',
        'marked-spam'    => 'spam',
        'flagged'        => 'flag',
        'flag'           => 'flag',
        'deferred'       => 'defer',
        'rejected'       => 'reject',
        'approve-all'    => 'approve-all',
        'move-to-trash'  => 'move-to-trash',
        'mark-as-spam'   => 'mark-as-spam',
        'deactivate-users' => 'deactivate-users',
        'export-csv'     => 'export-csv',
    );

    return $map[ $normalized ] ?? $action;
}

/**
 * Escape a value for CSV output (F4 Fix).
 *
 * @param mixed $value The value to escape.
 * @return string The CSV-escaped value.
 */
function cmcc_csv_escape( $value ): string {
    $str = (string) $value;
    // Enclose in quotes if contains comma, double-quote, or newline
    if ( strpos( $str, ',' ) !== false || strpos( $str, '"' ) !== false || strpos( $str, "\n" ) !== false ) {
        $str = '"' . str_replace( '"', '""', $str ) . '"';
    }
    return $str;
}

/**
 * Auto-add content to the CMCC queue (F1/F3 Fix).
 *
 * @param string $content_type The type of content (comment, post, page, etc.).
 * @param int|string $item_id   The ID of the content item.
 * @param int|string $author_id The author/user ID.
 * @param string     $title     The title of the content.
 * @param string     $excerpt   The excerpt or trimmed content.
 * @param string     $date_gmt  The GMT date string.
 * @return int|false
 */
function cmcc_auto_add_to_queue( string $content_type, $item_id, $author_id, string $title, string $excerpt, string $date_gmt ) {
    // Evaluate firewall rules first (F2 Fix)
    $firewall_result = cmcc_evaluate_firewall_for_content( $content_type, $excerpt );

    $spam_score = 0;
    $status     = 'pending';

    if ( $firewall_result['triggered'] ) {
        switch ( $firewall_result['action'] ) {
            case 'spam':
                $status     = 'spam';
                $spam_score = 0.9;
                break;
            case 'discard':
                $status     = 'spam';
                $spam_score = 1.0;
                break;
            case 'flag':
            default:
                $status     = 'flagged';
                $spam_score = 0.6;
                break;
        }
    }

    return cmcc_upsert_queue_item( array(
        'item_id'      => $content_type . '-' . $item_id,
        'content_type' => $content_type,
        'status'       => $status,
        'spam_score'   => $spam_score,
        'author_id'    => (string) $author_id,
        'date_gmt'     => $date_gmt,
        'title'        => $title,
        'excerpt'      => $excerpt,
    ) );
}

// --------------------------------------------------------------------------
// WordPress Hook Integration (F1/F3 Fix)
// --------------------------------------------------------------------------

if ( ! function_exists( 'cmcc_hook_comment_post' ) ) {

/**
 * Hook into comment_post to auto-add comments to the CMCC queue.
 */
function cmcc_hook_comment_post( int $comment_id, $comment_approved, array $commentdata ): void {
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    cmcc_auto_add_to_queue(
        'comment',
        $comment_id,
        $commentdata['user_id'] ?? $commentdata['comment_author'] ?? 0,
        $commentdata['comment_author'] ?? '',
        $commentdata['comment_content'] ?? '',
        $commentdata['comment_date_gmt'] ?? current_time( 'mysql', true )
    );
}

} // End function_exists guard
// add_action( 'comment_post', 'cmcc_hook_comment_post', 10, 3 ); // Registered via cmcc_init_content_hooks()

/**
 * Hook into wp_insert_comment for programmatic comment creation.
 */
function cmcc_hook_wp_insert_comment( int $comment_id, WP_Comment $comment ): void {
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    cmcc_auto_add_to_queue(
        'comment',
        $comment_id,
        $comment->user_id ?? $comment->comment_author ?? 0,
        $comment->comment_author ?? '',
        $comment->comment_content ?? '',
        $comment->comment_date_gmt ?? current_time( 'mysql', true )
    );
}
// add_action( 'wp_insert_comment', 'cmcc_hook_wp_insert_comment', 10, 2 ); // Registered via cmcc_init_content_hooks()

if ( ! function_exists( 'cmcc_hook_save_post' ) ) {

/**
 * Hook into save_post to auto-add posts/pages to the CMCC queue.
 */
function cmcc_hook_save_post( int $post_id, WP_Post $post, bool $update ): void {
    // Skip revisions, autosaves, and updates
    if ( $update || wp_is_post_revision( $post_id ) || wp_is_autosave( $post_id ) ) {
        return;
    }
    // Only handle public post types
    $allowed_types = array( 'post', 'page' );
    if ( ! in_array( $post->post_type, $allowed_types, true ) ) {
        return;
    }
    cmcc_auto_add_to_queue(
        $post->post_type,
        $post_id,
        $post->post_author,
        $post->post_title,
        wp_trim_words( $post->post_content, 55 ),
        $post->post_date_gmt
    );
}

} // End function_exists guard
// add_action( 'save_post', 'cmcc_hook_save_post', 10, 3 ); // Registered via cmcc_init_content_hooks()

/**
 * Hook into wp_insert_post for programmatic post creation.
 */
function cmcc_hook_wp_insert_post( int $post_id, WP_Post $post, bool $update ): void {
    // Skip revisions, autosaves, and updates
    if ( $update || wp_is_post_revision( $post_id ) || wp_is_autosave( $post_id ) ) {
        return;
    }
    $allowed_types = array( 'post', 'page' );
    if ( ! in_array( $post->post_type, $allowed_types, true ) ) {
        return;
    }
    cmcc_auto_add_to_queue(
        $post->post_type,
        $post_id,
        $post->post_author,
        $post->post_title,
        wp_trim_words( $post->post_content, 55 ),
        $post->post_date_gmt
    );
}
// add_action( 'wp_insert_post', 'cmcc_hook_wp_insert_post', 10, 3 ); // Registered via cmcc_init_content_hooks()

// --------------------------------------------------------------------------
// PHP Firewall Engine (F2 Fix – Non-AI)
// --------------------------------------------------------------------------

/**
 * Evaluate content against CMCC spam firewall rules.
 *
 * Pure PHP port of the TypeScript firewall rules from @cmcc/core.
 * Checks: link count, blacklisted keywords, blacklisted email domains,
 * minimum submit time, and duplicate content.
 *
 * @param string $content The content text to evaluate.
 * @param array<string, mixed> $options {
 *     Optional. Firewall rule options.
 *     @type int    $max_links                Max links allowed (default: 5).
 *     @type string $blacklisted_keywords     Newline-separated keywords.
 *     @type string $blacklisted_email_domains Newline-separated domains.
 *     @type int    $min_submit_time          Min submit time in seconds (default: 3).
 *     @type bool   $enable_duplicate_detection Whether to check duplicates (default: true).
 *     @type int    $duplicate_lookback_days  Duplicate lookback days (default: 7).
 *     @type string $global_action            Default action: 'flag', 'spam', 'discard'.
 * }
 * @return array{triggered: bool, action: string|null, reason: string}
 */
function cmcc_evaluate_firewall( string $content, array $options = array() ): array {
    $max_links                = isset( $options['max_links'] ) ? intval( $options['max_links'] ) : 5;
    $blacklisted_keywords     = isset( $options['blacklisted_keywords'] ) ? $options['blacklisted_keywords'] : '';
    $blacklisted_email_domains = isset( $options['blacklisted_email_domains'] ) ? $options['blacklisted_email_domains'] : '';
    $min_submit_time          = isset( $options['min_submit_time'] ) ? intval( $options['min_submit_time'] ) : 3;
    $enable_duplicate         = isset( $options['enable_duplicate_detection'] ) ? (bool) $options['enable_duplicate_detection'] : true;
    $duplicate_lookback       = isset( $options['duplicate_lookback_days'] ) ? intval( $options['duplicate_lookback_days'] ) : 7;
    $global_action            = isset( $options['global_action'] ) ? $options['global_action'] : 'flag';

    // 1. Check link count
    $link_count = preg_match_all( '/https?:\/\/[^\s]+/i', $content );
    if ( $link_count > $max_links ) {
        return array(
            'triggered' => true,
            'action'    => $global_action,
            'reason'    => "Content contains {$link_count} links (max allowed: {$max_links})",
        );
    }

    // 2. Check blacklisted keywords
    if ( ! empty( $blacklisted_keywords ) ) {
        $keywords = explode( "\n", str_replace( "\r\n", "\n", $blacklisted_keywords ) );
        $lower_content = strtolower( $content );
        foreach ( $keywords as $keyword ) {
            $keyword = trim( strtolower( $keyword ) );
            if ( empty( $keyword ) ) {
                continue;
            }
            // Handle wildcards: *keyword*, starts with, ends with
            if ( str_starts_with( $keyword, '*' ) && str_ends_with( $keyword, '*' ) ) {
                $check = substr( $keyword, 1, -1 );
                if ( str_contains( $lower_content, $check ) ) {
                    return array(
                        'triggered' => true,
                        'action'    => $global_action,
                        'reason'    => "Content contains blacklisted keyword pattern: {$keyword}",
                    );
                }
            } elseif ( str_ends_with( $keyword, '*' ) ) {
                $check = substr( $keyword, 0, -1 );
                if ( str_starts_with( $lower_content, $check ) ) {
                    return array(
                        'triggered' => true,
                        'action'    => $global_action,
                        'reason'    => "Content contains blacklisted keyword pattern: {$keyword}",
                    );
                }
            } elseif ( str_starts_with( $keyword, '*' ) ) {
                $check = substr( $keyword, 1 );
                if ( str_ends_with( $lower_content, $check ) ) {
                    return array(
                        'triggered' => true,
                        'action'    => $global_action,
                        'reason'    => "Content contains blacklisted keyword pattern: {$keyword}",
                    );
                }
            } else {
                if ( str_contains( $lower_content, $keyword ) ) {
                    return array(
                        'triggered' => true,
                        'action'    => $global_action,
                        'reason'    => "Content contains blacklisted keyword: {$keyword}",
                    );
                }
            }
        }
    }

    // 3. Check duplicate content (simple exact match)
    if ( $enable_duplicate ) {
        global $wpdb;
        $queue_table = $wpdb->prefix . CMCC_QUEUE_TABLE;
        $lookback_date = gmdate( 'Y-m-d H:i:s', strtotime( "-{$duplicate_lookback} days" ) );
        $content_hash = md5( strtolower( trim( $content ) ) );
        $duplicate = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$queue_table} WHERE MD5(LOWER(TRUNCATE(excerpt, 100))) = %s AND created_at >= %s",
            $content_hash,
            $lookback_date
        ) );
        if ( intval( $duplicate ) > 0 ) {
            return array(
                'triggered' => true,
                'action'    => $global_action,
                'reason'    => 'Duplicate content detected',
            );
        }
    }

    return array(
        'triggered' => false,
        'action'    => null,
        'reason'    => '',
    );
}

/**
 * Evaluate firewall rules for incoming content using stored settings (F2 Fix).
 *
 * @param string $content_type The content type.
 * @param string $content      The content text.
 * @return array{triggered: bool, action: string|null, reason: string}
 */
function cmcc_evaluate_firewall_for_content( string $content_type, string $content ): array {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    $firewall_settings = isset( $settings['spam_firewall'] ) ? $settings['spam_firewall'] : array();

    // Check if auto moderation is enabled
    $general = isset( $settings['general'] ) ? $settings['general'] : array();
    if ( empty( $general['auto_moderate'] ) ) {
        return array(
            'triggered' => false,
            'action'    => null,
            'reason'    => 'Auto moderation is disabled',
        );
    }

    return cmcc_evaluate_firewall( $content, $firewall_settings );
}

// --------------------------------------------------------------------------
// Seed Data (Development Helper)
// --------------------------------------------------------------------------

/**
 * Seed 500+ dummy items for development/testing.
 * Run via WP-CLI: wp eval 'cmcc_seed_sample_data();'
 * Or trigger manually from CMCC Tools in admin.
 */
function cmcc_seed_sample_data(): void {
    global $wpdb;

    $queue_table = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $log_table   = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    // ── Clear existing data ────────────────────────────────────────────
    $wpdb->query( "TRUNCATE TABLE {$queue_table}" );
    $wpdb->query( "TRUNCATE TABLE {$log_table}" );

    // ── Generate 525 queue items ───────────────────────────────────────
    $content_types = array( 'comment', 'post', 'review', 'woocommerce_review', 'forum_topic', 'user_profile', 'media', 'page', 'product' );
    $statuses      = array( 'pending', 'approved', 'rejected', 'spam', 'flagged', 'deferred' );
    $actions       = array( 'approved', 'rejected', 'marked_as_spam', 'flagged', 'deferred', 'auto_moderated' );
    $moderators    = array( '1' => 'Admin', '2' => 'Jane Moderator', '3' => 'Bob Reviewer', '4' => 'Alice Admin', '5' => 'Auto-moderation' );

    $good_excerpts = array(
        'I really enjoyed reading this article and learned a lot from it. The author did a great job explaining complex topics in simple terms.',
        'This is a thoughtful analysis of the current state of content moderation. I appreciate the balanced perspective presented here.',
        'Thanks for sharing these insights! I have been dealing with similar issues on my own site and this gave me some new ideas to try.',
        'A comprehensive guide that covers everything you need to know. Well structured and easy to follow.',
        'I have been following this topic for years and this is one of the best explanations I have seen. Keep up the great work!',
    );

    $user_names = array(
        'Alice Johnson', 'Bob Smith', 'Carol Williams', 'Dave Brown', 'Eve Jones',
        'Frank Garcia', 'Grace Miller', 'Hank Davis', 'Ivy Rodriguez', 'Jack Martinez',
        'Karen Hernandez', 'Leo Lopez', 'Mona Gonzalez', 'Nate Wilson', 'Olive Anderson',
        'Pete Thomas', 'Quinn Taylor', 'Rosa Moore', 'Sam Jackson', 'Tina Martin',
        'Uma Lee', 'Vince Perez', 'Wendy Thompson', 'Xander White', 'Yara Harris',
        'Zack Sanchez', 'Aisha Clark', 'Ben Ramirez', 'Clara Lewis', 'Dan Robinson',
        'Ella Walker', 'Finn Young', 'Grace Hall', 'Henry Allen', 'Isla King',
        'Jake Wright', 'Kara Scott', 'Liam Green', 'Mia Baker', 'Noah Adams',
        'Olivia Nelson', 'Paul Hill', 'Quinn Campbell', 'Ruby Mitchell', 'Sara Roberts',
        'Tom Turner', 'Una Phillips', 'Victor Evans', 'Will Edwards', 'Zara Collins',
    );

    $spammer_names = array(
        'SpammerX', 'QuickCash', 'DealMaster', 'ClickHere', 'WinBigNow',
        'FreeMoney', 'ViagraOffers', 'CasinoPro', 'CryptoKing', 'LoanShark',
        'PrizeWinner', 'ActNow', 'LimitedOffer', 'SecretProfits', 'MiracleCure',
    );

    $good_titles = array(
        'comment' => array(
            'Great article! Thanks for sharing.',
            'I completely disagree with this post.',
            'This is exactly what I was looking for.',
            'Can you provide more details about this?',
            'Nice write-up, very informative.',
            'Not sure I agree with your conclusions.',
            'Thanks for the helpful information.',
            'This changed my perspective on things.',
            'Could you elaborate on point #3?',
            'Well said! I couldn\'t agree more.',
        ),
        'post' => array(
            'How to improve your productivity in 2024',
            'The ultimate guide to content moderation',
            '10 tips for better customer engagement',
            'Why we need stronger spam filters',
            'The future of AI in content management',
            'Best practices for community management',
            'Understanding user behavior analytics',
            'A complete guide to WordPress security',
            'How to scale your moderation team',
            'The impact of social media on online discourse',
        ),
        'default' => array(
            'Help needed with plugin configuration',
            'Best practices for database optimization',
            'How do you handle spam in your community?',
            'New feature request: bulk moderation',
            'Looking for beta testers',
            'Tips for new moderators',
            'Integration with third-party tools',
            'Performance issues with large queues',
            'Security concerns with user submissions',
            'Weekly community discussion thread',
        ),
    );

    $spam_titles = array(
        'Check out this amazing deal at %s',
        'Buy now!!! Limited offer!!! Click %s',
        'You won\'t believe this one weird trick! %s',
        'Make $5000/day working from home! %s',
        'Congratulations! You\'ve won a prize! Claim at %s',
        'This crypto will 100x! Invest at %s',
        'Lose 30 pounds in 30 days! %s',
        'Your computer has a virus! Fix it at %s',
        'Exclusive deal just for you! %s',
        'Meet singles in your area tonight! %s',
    );

    $spam_urls = array(
        'https://spam.example.com/deal',
        'https://scam.example.com/win',
        'https://cheap-deals.example.org/buy',
        'https://miracle.example.net/cure',
        'https://crypto-bonus.example.co/invest',
        'https://free-money.example.io/claim',
        'https://weight-loss.example.com/secret',
        'https://casino-bonus.example.org/free',
        'https://virus-scan.example.net/alert',
        'https://phishing-login.example.com/verify',
    );

    $author_cache = array();
    $inserted_item_ids = array();

    for ( $i = 1; $i <= 525; $i++ ) {
        $content_type = $content_types[ array_rand( $content_types ) ];
        $is_spam      = ( mt_rand( 1, 100 ) <= 25 ); // ~25% spam

        // Determine status
        if ( $is_spam ) {
            $roll = mt_rand( 1, 100 );
            if ( $roll <= 50 ) {
                $status = 'spam';
            } elseif ( $roll <= 80 ) {
                $status = 'flagged';
            } else {
                $status = 'pending';
            }
        } else {
            $roll = mt_rand( 1, 100 );
            if ( $roll <= 30 ) {
                $status = 'approved';
            } elseif ( $roll <= 50 ) {
                $status = 'rejected';
            } elseif ( $roll <= 70 ) {
                $status = 'pending';
            } else {
                $status = 'deferred';
            }
        }

        // Author
        if ( $is_spam && mt_rand( 1, 100 ) <= 60 ) {
            $author_name = $spammer_names[ array_rand( $spammer_names ) ];
            $author_id   = 'spammer-' . mt_rand( 1, 100 );
        } else {
            $author_name = $user_names[ array_rand( $user_names ) ];
            $author_id   = 'user-' . mt_rand( 101, 9999 );
        }
        $author_cache[ $author_id ] = $author_name;

        // Score
        $spam_score = $is_spam ? mt_rand( 6000, 9999 ) / 10000 : mt_rand( 1, 4500 ) / 10000;

        // Date (within last 45 days)
        $days_back = mt_rand( 0, 45 );
        $hours_back = mt_rand( 0, 23 );
        $date_gmt  = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days_back} days -{$hours_back} hours" ) );

        // Title
        if ( $is_spam && 'comment' === $content_type ) {
            $title_template = $spam_titles[ array_rand( $spam_titles ) ];
            $spam_url       = $spam_urls[ array_rand( $spam_urls ) ];
            $title          = sprintf( $title_template, $spam_url );
        } else {
            $titles = isset( $good_titles[ $content_type ] ) ? $good_titles[ $content_type ] : $good_titles['default'];
            $title  = $titles[ array_rand( $titles ) ];
        }

        // Excerpt
        if ( $is_spam && mt_rand( 1, 100 ) <= 70 ) {
            $excerpt = $good_excerpts[ array_rand( $good_excerpts ) ];
        } else {
            $excerpt = $good_excerpts[ array_rand( $good_excerpts ) ];
        }

        $item_id = 'item-dummy-' . $i;
        $inserted_item_ids[] = $item_id;

        $wpdb->insert(
            $queue_table,
            array(
                'item_id'      => $item_id,
                'content_type' => $content_type,
                'status'       => $status,
                'spam_score'   => $spam_score,
                'author_id'    => $author_id,
                'date_gmt'     => $date_gmt,
                'title'        => $title,
                'excerpt'      => $excerpt,
            ),
            array( '%s', '%s', '%s', '%f', '%s', '%s', '%s', '%s' )
        );

        // Activity log for every ~3rd item
        if ( 0 === $i % 3 ) {
            $mod_ids  = array_keys( $moderators );
            $mod_id   = $mod_ids[ array_rand( $mod_ids ) ];
            $mod_name = $moderators[ $mod_id ];
            $action   = $actions[ array_rand( $actions ) ];

            $action_status_map = array(
                'approved'       => 'approved',
                'rejected'       => 'rejected',
                'marked_as_spam' => 'spam',
                'flagged'        => 'flagged',
                'deferred'       => 'deferred',
                'auto_moderated' => 'auto_moderated',
            );
            $new_status = isset( $action_status_map[ $action ] ) ? $action_status_map[ $action ] : $status;

            $log_timestamp = gmdate( 'Y-m-d H:i:s', strtotime( $date_gmt . ' +' . mt_rand( 1, 120 ) . ' minutes' ) );

            $wpdb->insert(
                $log_table,
                array(
                    'moderator_id'    => $mod_id,
                    'action'          => $action,
                    'content_type'    => $content_type,
                    'item_id'         => $item_id,
                    'item_title'      => $title,
                    'previous_status' => 'pending',
                    'new_status'      => $new_status,
                    'notes'           => ( 'approved' === $action ? 'Looks good.' : ( 'rejected' === $action ? 'Violates guidelines.' : ( 'marked_as_spam' === $action ? 'Spam detected.' : '' ) ) ),
                    'timestamp'       => $log_timestamp,
                ),
                array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
            );
        }
    }

    // ── Generate extra activity log entries for rich history ──────────
    $extra_log_entries = 200 - ( count( $inserted_item_ids ) / 3 );
    if ( $extra_log_entries > 0 ) {
        for ( $i = 0; $i < $extra_log_entries; $i++ ) {
            $mod_ids  = array_keys( $moderators );
            $mod_id   = $mod_ids[ array_rand( $mod_ids ) ];
            $mod_name = $moderators[ $mod_id ];
            $action   = $actions[ array_rand( $actions ) ];
            $ct       = $content_types[ array_rand( $content_types ) ];
            $days     = mt_rand( 0, 30 );
            $hours    = mt_rand( 0, 23 );

            $wpdb->insert(
                $log_table,
                array(
                    'moderator_id'    => $mod_id,
                    'action'          => $action,
                    'content_type'    => $ct,
                    'item_id'         => 'item-dummy-' . mt_rand( 1, 525 ),
                    'item_title'      => 'Reference item',
                    'previous_status' => 'pending',
                    'new_status'      => $action,
                    'notes'           => '',
                    'timestamp'       => gmdate( 'Y-m-d H:i:s', strtotime( "-{$days} days -{$hours} hours" ) ),
                ),
                array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
            );
        }
    }
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

// --------------------------------------------------------------------------
// NEW: Collaboration REST Callbacks (Notes, Assignments, Activity Feed)
// --------------------------------------------------------------------------

if ( ! function_exists( 'cmcc_rest_add_note' ) ) {

/**
 * POST /cmcc/v1/queue/:id/note – Add a note to a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_add_note( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id    = $request->get_param( 'id' );
    $content    = sanitize_textarea_field( $request->get_param( 'content' ) );
    $is_internal = (bool) $request->get_param( 'is_internal' );
    $type       = sanitize_text_field( $request->get_param( 'type' ) );
    $current_user = wp_get_current_user();

    if ( empty( $content ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Note content is required.', 'cmcc' ),
        ), 400 );
    }

    // Store notes as a transient attached to the item (simple key-value approach)
    $notes_key = 'cmcc_notes_' . $item_id;
    $notes = get_transient( $notes_key );
    if ( ! is_array( $notes ) ) {
        $notes = array();
    }

    $note = array(
        'id'         => uniqid( 'note_' ),
        'itemId'     => $item_id,
        'authorId'   => $current_user->ID,
        'authorName' => $current_user->display_name ?: $current_user->user_login,
        'content'    => $content,
        'createdAt'  => current_time( 'mysql' ),
        'isInternal' => $is_internal,
        'type'       => in_array( $type, array( 'general', 'question', 'instruction', 'resolution' ), true ) ? $type : 'general',
    );

    array_unshift( $notes, $note );
    // Keep max 100 notes per item
    $notes = array_slice( $notes, 0, 100 );
    set_transient( $notes_key, $notes, DAY_IN_SECONDS * 30 );

    return new WP_REST_Response( array(
        'success' => true,
        'note'    => $note,
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
    $item_id = $request->get_param( 'id' );
    $notes_key = 'cmcc_notes_' . $item_id;
    $notes = get_transient( $notes_key );

    if ( ! is_array( $notes ) ) {
        $notes = array();
    }

    return new WP_REST_Response( array( 'notes' => $notes ), 200 );
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
    $item_id  = $request->get_param( 'id' );
    $assignee = sanitize_text_field( $request->get_param( 'assignee' ) );
    $due_date = sanitize_text_field( $request->get_param( 'due_date' ) );
    $priority = sanitize_text_field( $request->get_param( 'priority' ) );
    $current_user = wp_get_current_user();

    $allowed_priorities = array( 'low', 'normal', 'high', 'critical' );
    if ( ! in_array( $priority, $allowed_priorities, true ) ) {
        $priority = 'normal';
    }

    // Store assignment as a transient
    $assign_key = 'cmcc_assign_' . $item_id;
    $assignment = array(
        'itemId'     => $item_id,
        'assignee'   => $assignee,
        'assignedBy' => $current_user->display_name ?: $current_user->user_login,
        'assignedAt' => current_time( 'mysql' ),
        'dueDate'    => $due_date ?: '',
        'priority'   => $priority,
        'status'     => 'pending',
    );

    set_transient( $assign_key, $assignment, DAY_IN_SECONDS * 30 );

    // Log the assignment in activity log
    cmcc_log_activity( array(
        'moderator_id'    => $current_user->ID,
        'action'          => 'assign',
        'content_type'    => 'queue_item',
        'item_id'         => $item_id,
        'item_title'      => '',
        'previous_status' => '',
        'new_status'      => 'assigned',
        'notes'           => sprintf(
            'Assigned to %s with %s priority',
            $assignee ?: 'unassigned',
            $priority
        ),
    ) );

    return new WP_REST_Response( array(
        'success'    => true,
        'assignment' => $assignment,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_activity_feed' ) ) {

/**
 * GET /cmcc/v1/activity-feed – Get recent moderation activity feed.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_activity_feed( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $limit = min( 50, max( 1, (int) $request->get_param( 'limit' ) ) );
    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        ORDER BY l.timestamp DESC
        LIMIT %d",
        $limit
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $events = array();
    foreach ( $rows as $row ) {
        $events[] = array(
            'id'          => 'event_' . $row->id,
            'type'        => 'action',
            'actorId'     => $row->moderator_id,
            'actorName'   => $row->moderator_name ?: 'User #' . $row->moderator_id,
            'description' => sprintf(
                '%s %s item: %s',
                ucfirst( $row->action ),
                $row->content_type,
                $row->item_title ?: $row->item_id
            ),
            'itemId'      => $row->item_id,
            'itemTitle'   => $row->item_title,
            'timestamp'   => $row->timestamp,
        );
    }

    return new WP_REST_Response( array( 'events' => $events ), 200 );
}

} // End function_exists guard

// --------------------------------------------------------------------------
// REST Callbacks – Reports & Compliance
// --------------------------------------------------------------------------

if ( ! function_exists( 'cmcc_rest_reports_moderation_activity' ) ) {

/**
 * POST /cmcc/v1/reports/moderation-activity – Generate moderation activity report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_moderation_activity( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );
    $format         = $request->get_param( 'format' );

    $start_date = $start_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) ) : gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
    $end_date   = $end_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) ) : gmdate( 'Y-m-d H:i:s' );

    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        ORDER BY l.timestamp DESC",
        $start_date,
        $end_date
    ) );

    // Generate CSV
    $csv_lines = array();
    $csv_lines[] = 'Date,Moderator,Action,Content Type,Item,Previous Status,New Status,Notes';
    foreach ( $results as $row ) {
        $line = implode( ',', array(
            $row->timestamp,
            $row->moderator_name ?: 'User #' . $row->moderator_id,
            $row->action,
            $row->content_type,
            $row->item_title ?: $row->item_id,
            $row->previous_status,
            $row->new_status,
            str_replace( '"', '""', $row->notes ?: '' ),
        ) );
        $csv_lines[] = $line;
    }

    return new WP_REST_Response( array(
        'success'    => true,
        'format'     => $format,
        'filename'   => 'cmcc-moderation-activity-' . gmdate( 'Y-m-d' ) . '.csv',
        'headers'    => array( 'Date', 'Moderator', 'Action', 'Content Type', 'Item', 'Previous Status', 'New Status', 'Notes' ),
        'data'       => $csv_lines,
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
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );

    $start_date = $start_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) ) : gmdate( 'Y-m-d H:i:s', strtotime( '-90 days' ) );
    $end_date   = $end_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) ) : gmdate( 'Y-m-d H:i:s' );

    $log_table = $wpdb->prefix . CMCC_ACTIVITY_LOG_TABLE;

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name, u.user_email as moderator_email
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        ORDER BY l.timestamp DESC",
        $start_date,
        $end_date
    ) );

    $csv_lines = array();
    $csv_lines[] = 'ID,Timestamp,Moderator ID,Moderator Name,Moderator Email,Action,Content Type,Item ID,Item Title,Previous Status,New Status,Notes';
    foreach ( $results as $row ) {
        $line = implode( ',', array(
            $row->id,
            $row->timestamp,
            $row->moderator_id,
            $row->moderator_name ?: 'Unknown',
            $row->moderator_email ?: '',
            $row->action,
            $row->content_type,
            $row->item_id,
            str_replace( ',', ';', $row->item_title ?: '' ),
            $row->previous_status,
            $row->new_status,
            str_replace( '"', '""', $row->notes ?: '' ),
        ) );
        $csv_lines[] = $line;
    }

    return new WP_REST_Response( array(
        'success'    => true,
        'filename'   => 'cmcc-compliance-audit-' . gmdate( 'Y-m-d' ) . '.csv',
        'headers'    => array( 'ID', 'Timestamp', 'Moderator ID', 'Moderator Name', 'Moderator Email', 'Action', 'Content Type', 'Item ID', 'Item Title', 'Previous Status', 'New Status', 'Notes' ),
        'data'       => $csv_lines,
        'total_rows' => count( $results ),
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_reports_moderator_performance' ) ) {

/**
 * GET /cmcc/v1/reports/moderator-performance – Get moderator performance analytics.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_reports_moderator_performance( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $start_date_raw = $request->get_param( 'start_date' );
    $end_date_raw   = $request->get_param( 'end_date' );

    $start_date = $start_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $start_date_raw ) ) : gmdate( 'Y-m-d H:i:s', strtotime( '-30 days' ) );
    $end_date   = $end_date_raw ? gmdate( 'Y-m-d H:i:s', strtotime( $end_date_raw ) ) : gmdate( 'Y-m-d H:i:s' );

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
            MAX(l.timestamp) as last_action
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.timestamp >= %s AND l.timestamp <= %s
        GROUP BY l.moderator_id
        ORDER BY total_actions DESC",
        $start_date,
        $end_date
    ) );

    $performance = array();
    foreach ( $results as $row ) {
        $total = (int) $row->total_actions;
        $performance[] = array(
            'moderator_id'   => $row->moderator_id,
            'moderator_name' => $row->moderator_name ?: 'User #' . $row->moderator_id,
            'total_actions'  => $total,
            'approvals'      => (int) $row->approvals,
            'rejections'     => (int) $row->rejections,
            'spam_actions'   => (int) $row->spam_actions,
            'defer_actions'  => (int) $row->defer_actions,
            'flag_actions'   => (int) $row->flag_actions,
            'approval_rate'  => $total > 0 ? round( ( (int) $row->approvals / $total ) * 100, 1 ) : 0,
            'last_action'    => $row->last_action,
        );
    }

    return new WP_REST_Response( array(
        'success'     => true,
        'performance' => $performance,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_reports_scheduled' ) ) {

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
            'message' => esc_html__( 'Invalid report type.', 'cmcc' ),
        ), 400 );
    }

    if ( ! in_array( $frequency, $allowed_frequencies, true ) ) {
        return new WP_REST_Response( array(
            'success' => false,
            'message' => esc_html__( 'Invalid frequency.', 'cmcc' ),
        ), 400 );
    }

    $scheduled = get_option( 'cmcc_scheduled_reports', array() );

    $report = array(
        'id'        => uniqid( 'report_' ),
        'type'      => $type,
        'frequency' => $frequency,
        'format'    => $format,
        'emails'    => is_array( $emails ) ? array_map( 'sanitize_email', $emails ) : array(),
        'created'   => current_time( 'mysql' ),
        'next_run'  => current_time( 'mysql' ),
    );

    $scheduled[] = $report;
    update_option( 'cmcc_scheduled_reports', $scheduled );

    // Schedule the cron event if not already scheduled
    if ( ! wp_next_scheduled( 'cmcc_daily_report_cron' ) ) {
        wp_schedule_event( time(), 'daily', 'cmcc_daily_report_cron' );
    }

    return new WP_REST_Response( array(
        'success' => true,
        'report'  => $report,
        'message' => sprintf(
            'Report scheduled: %s %s',
            $type,
            $frequency
        ),
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_scheduled_reports' ) ) {

/**
 * GET /cmcc/v1/reports/scheduled – List all scheduled reports.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_scheduled_reports(): WP_REST_Response {
    $scheduled = get_option( 'cmcc_scheduled_reports', array() );

    return new WP_REST_Response( array(
        'success' => true,
        'reports' => $scheduled,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_delete_scheduled_report' ) ) {

/**
 * DELETE /cmcc/v1/reports/scheduled – Delete a scheduled report.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_delete_scheduled_report( WP_REST_Request $request ): WP_REST_Response {
    $id = sanitize_text_field( $request->get_param( 'id' ) );

    $scheduled = get_option( 'cmcc_scheduled_reports', array() );
    $found     = false;

    foreach ( $scheduled as $key => $report ) {
        if ( $report['id'] === $id ) {
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

} // End function_exists guard

if ( ! function_exists( 'cmcc_rest_get_platforms_status' ) ) {

/**
 * GET /cmcc/v1/platforms/status – Get status of all connected platforms.
 *
 * Returns the connection status of each supported platform integration.
 *
 * @return WP_REST_Response
 */
function cmcc_rest_get_platforms_status(): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );

    $platforms = array(
        'wordpress' => array(
            'connected'  => true,
            'name'       => 'WordPress',
            'version'    => get_bloginfo( 'version' ),
            'health'     => 'healthy',
        ),
        'shopify' => array(
            'connected'  => false,
            'name'       => 'Shopify',
            'version'    => '',
            'health'     => 'unknown',
        ),
        'storyblok' => array(
            'connected'  => false,
            'name'       => 'Storyblok',
            'version'    => '',
            'health'     => 'unknown',
        ),
        'strapi' => array(
            'connected'  => false,
            'name'       => 'Strapi',
            'version'    => '',
            'health'     => 'unknown',
        ),
        'wix' => array(
            'connected'  => false,
            'name'       => 'Wix',
            'version'    => '',
            'health'     => 'unknown',
        ),
    );

    // Check if any integrations are configured
    $integrations = isset( $settings['integrations'] ) ? $settings['integrations'] : array();
    if ( ! empty( $integrations['webhook_url'] ) ) {
        $platforms['wordpress']['health'] = 'healthy';
    }

    return new WP_REST_Response( array(
        'success'   => true,
        'platforms' => $platforms,
    ), 200 );
}

} // End function_exists guard

if ( ! function_exists( 'cmcc_send_scheduled_reports' ) ) {

/**
 * Cron handler for sending scheduled reports.
 */
function cmcc_send_scheduled_reports(): void {
    $scheduled = get_option( 'cmcc_scheduled_reports', array() );
    $today     = current_time( 'Y-m-d' );
    $day_of_week = (int) current_time( 'w' );
    $day_of_month = (int) current_time( 'j' );

    foreach ( $scheduled as $report ) {
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

        // Generate and send the report
        $subject = sprintf(
            '[CMCC] Scheduled Report: %s — %s',
            ucwords( str_replace( '_', ' ', $report['type'] ) ),
            $today
        );

        $message = sprintf(
            'Your scheduled %s report is attached.%sPlease find the report data in your CMCC dashboard.',
            $report['type'],
            "\n\n"
        );

        wp_mail(
            $report['emails'],
            $subject,
            $message,
            array( 'Content-Type: text/plain; charset=UTF-8' )
        );
    }
}

} // End function_exists guard
add_action( 'cmcc_daily_report_cron', 'cmcc_send_scheduled_reports' );

// --------------------------------------------------------------------------
// Multi-Site Support
// --------------------------------------------------------------------------

/**
 * Check if WordPress is running in multisite mode.
 *
 * @return bool
 */
function cmcc_is_multisite(): bool {
    return is_multisite();
}

/**
 * Get all site IDs in a multisite network.
 *
 * @return array List of site IDs.
 */
function cmcc_get_multisite_sites(): array {
    if ( ! cmcc_is_multisite() ) {
        return array();
    }
    $sites = get_sites( array( 'fields' => 'ids', 'number' => 1000 ) );
    return array_map( 'intval', $sites );
}

/**
 * Run a callback on each site in a multisite network.
 *
 * @param callable $callback The callback to run on each site.
 */
function cmcc_run_on_all_sites( callable $callback ): void {
    if ( ! cmcc_is_multisite() ) {
        $callback();
        return;
    }
    $site_ids = cmcc_get_multisite_sites();
    foreach ( $site_ids as $site_id ) {
        switch_to_blog( $site_id );
        $callback();
        restore_current_blog();
    }
}

/**
 * Handle network-wide activation for multisite.
 */
function cmcc_multisite_activate( $network_wide ): void {
    if ( $network_wide && cmcc_is_multisite() ) {
        cmcc_run_on_all_sites( 'cmcc_activate' );
    } else {
        cmcc_activate();
    }
}
register_activation_hook( __FILE__, 'cmcc_multisite_activate' );

/**
 * Handle network-wide deactivation for multisite.
 */
function cmcc_multisite_deactivate( $network_wide ): void {
    if ( $network_wide && cmcc_is_multisite() ) {
        cmcc_run_on_all_sites( 'cmcc_deactivate' );
    } else {
        cmcc_deactivate();
    }
}
register_deactivation_hook( __FILE__, 'cmcc_multisite_deactivate' );

/**
 * Register the CMCC admin menu pages (network-aware).
 */
function cmcc_network_admin_menu(): void {
    if ( ! cmcc_is_multisite() ) {
        return;
    }
    add_submenu_page(
        'settings.php',
        esc_html__( 'CMCC Network Settings', 'cmcc' ),
        esc_html__( 'CMCC', 'cmcc' ),
        'manage_network_options',
        'cmcc-network',
        'cmcc_render_network_page'
    );
}
add_action( 'network_admin_menu', 'cmcc_network_admin_menu' );

/**
 * Render the network admin page.
 */
function cmcc_render_network_page(): void {
    if ( ! current_user_can( 'manage_network_options' ) ) {
        wp_die( esc_html__( 'You do not have sufficient permissions.', 'cmcc' ) );
    }
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'CMCC Network Settings', 'cmcc' ); ?></h1>
        <p><?php esc_html_e( 'CMCC is network-enabled. Each site in the network has its own moderation queue and settings.', 'cmcc' ); ?></p>
        <p><?php esc_html_e( 'Activate the CMCC plugin on individual sites via the Network Admin → Plugins screen.', 'cmcc' ); ?></p>
    </div>
    <?php
}

// --------------------------------------------------------------------------
// REST Callback – Queue Export (CSV)
// --------------------------------------------------------------------------

if ( ! function_exists( 'cmcc_rest_queue_export' ) ) {

/**
 * POST /cmcc/v1/queue/export – Export queue items as CSV.
 *
 * Exports the entire queue (or filtered by status/IDs) as a CSV file.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_queue_export( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $status = sanitize_text_field( $request->get_param( 'status' ) ?? '' );
    $ids    = $request->get_param( 'ids' );

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;
    $where  = array( '1=1' );
    $values = array();

    if ( '' !== $status ) {
        $where[]  = 'status = %s';
        $values[] = $status;
    }

    if ( is_array( $ids ) && ! empty( $ids ) ) {
        $placeholders = implode( ', ', array_fill( 0, count( $ids ), '%s' ) );
        $where[]      = "item_id IN ({$placeholders})";
        $values       = array_merge( $values, $ids );
    }

    $where_clause = implode( ' AND ', $where );

    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT item_id, content_type, title, status, spam_score, author_id, date_gmt, created_at
        FROM {$table}
        WHERE {$where_clause}
        ORDER BY created_at DESC",
        $values
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $headers = array( 'ID', 'Content Type', 'Title', 'Status', 'Spam Score', 'Author', 'Date GMT', 'Created At' );
    $csv_lines = array();
    $csv_lines[] = implode( ',', $headers );

    foreach ( $results as $row ) {
        $csv_lines[] = implode( ',', array(
            cmcc_csv_escape( $row->item_id ),
            $row->content_type,
            cmcc_csv_escape( $row->title ?: '' ),
            $row->status,
            number_format( (float) $row->spam_score, 2 ),
            cmcc_csv_escape( $row->author_id ?: '' ),
            $row->date_gmt ?: '',
            $row->created_at ?: '',
        ) );
    }

    return new WP_REST_Response( array(
        'success'  => true,
        'filename' => 'cmcc-queue-export-' . gmdate( 'Y-m-d-His' ) . '.csv',
        'headers'  => $headers,
        'data'     => $csv_lines,
        'total'    => count( $results ),
    ), 200 );
}

} // End function_exists guard

// --------------------------------------------------------------------------
// Library Module References
// --------------------------------------------------------------------------
//
// The following library modules are auto-loaded at the top of this file and
// contain enhanced implementations for features identified in Sections 9 & 10
// of the manual test analysis:
//
// 1. src/lib/reports.php         — Reports & Compliance (Section 10.4)
// 2. src/lib/collaboration.php   — Collaboration Features (Section 10.6)
// 3. src/lib/user-reputation.php — User Reputation (Sections 9/10.3)
// 4. src/lib/multi-platform.php  — Multi-Platform Hub (Section 10.5)
// 5. src/lib/content-hooks.php   — WordPress Content Hook Integration (F1/F3)
// 6. src/lib/firewall-engine.php — PHP Firewall Engine (F2)
// 7. src/lib/notifications.php   — Email Notifications System (Section 9)
//
// All library modules use function_exists() guards so they integrate safely
// with the inline implementations in this file.
