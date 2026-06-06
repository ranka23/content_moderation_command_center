<?php
/**
 * CMCC Uninstall - Cleanup database tables and options.
 *
 * @package CMCC
 */

// If uninstall not called from WordPress, exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Drop custom tables.
$tables = array(
    $wpdb->prefix . 'cmcc_queue',
    $wpdb->prefix . 'cmcc_activity_log',
);

foreach ( $tables as $table ) {
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $wpdb->query( "DROP TABLE IF EXISTS {$table}" );
}

// Delete plugin options.
delete_option( 'cmcc_settings' );

// Clear any cached data.
wp_cache_flush();
