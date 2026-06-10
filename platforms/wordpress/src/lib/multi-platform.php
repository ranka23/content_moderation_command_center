<?php
/**
 * CMCC Multi-Platform Hub Module
 *
 * Provides cross-platform moderation capabilities:
 * - Aggregated platform health status
 * - Unified queue across all connected platforms
 * - Synchronized firewall rules and settings propagation
 *
 * Corresponds to Section 10.5 of the Design Analysis:
 * - Cross-Platform Queue
 * - Synced Settings
 * - Unified Analytics
 * - Central Dashboard
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'cmcc_rest_get_platforms_status' ) ) :

/**
 * GET /cmcc/v1/platforms/status – Get aggregated status of all connected platforms.
 *
 * Returns health, version, and connection status for each supported
 * platform integration (WordPress, Shopify, Strapi, Storyblok, Wix).
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_platforms_status( WP_REST_Request $request ): WP_REST_Response {
    $settings = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    $integrations = isset( $settings['integrations'] ) ? $settings['integrations'] : array();

    $platforms = array(
        'wordpress' => array(
            'connected'  => true,
            'name'       => 'WordPress',
            'version'    => get_bloginfo( 'version' ),
            'health'     => 'healthy',
            'queue_count' => (int) wp_count_posts( 'cmcc_queue' )->publish ?? 0,
            'last_sync'  => current_time( 'mysql' ),
        ),
        'shopify' => array(
            'connected'  => ! empty( $integrations['webhook_url'] ),
            'name'       => 'Shopify',
            'version'    => '',
            'health'     => ! empty( $integrations['webhook_url'] ) ? 'healthy' : 'disconnected',
            'queue_count' => 0,
            'last_sync'  => null,
        ),
        'storyblok' => array(
            'connected'  => false,
            'name'       => 'Storyblok',
            'version'    => '',
            'health'     => 'disconnected',
            'queue_count' => 0,
            'last_sync'  => null,
        ),
        'strapi' => array(
            'connected'  => false,
            'name'       => 'Strapi',
            'version'    => '',
            'health'     => 'disconnected',
            'queue_count' => 0,
            'last_sync'  => null,
        ),
        'wix' => array(
            'connected'  => false,
            'name'       => 'Wix',
            'version'    => '',
            'health'     => 'disconnected',
            'queue_count' => 0,
            'last_sync'  => null,
        ),
    );

    // Allow other plugins/themes to filter platform data.
    $platforms = apply_filters( 'cmcc_platform_status', $platforms, $integrations );

    return new WP_REST_Response( array(
        'success'   => true,
        'platforms' => $platforms,
        'summary'   => array(
            'total_platforms'    => count( $platforms ),
            'connected_count'    => count( array_filter( $platforms, function ( $p ) {
                return ! empty( $p['connected'] );
            } ) ),
            'healthy_count'      => count( array_filter( $platforms, function ( $p ) {
                return 'healthy' === $p['health'];
            } ) ),
            'disconnected_count' => count( array_filter( $platforms, function ( $p ) {
                return 'disconnected' === $p['health'];
            } ) ),
        ),
    ), 200 );
}

endif; // cmcc_rest_get_platforms_status

if ( ! function_exists( 'cmcc_rest_platforms_sync_settings' ) ) :

/**
 * POST /cmcc/v1/platforms/sync-settings – Sync firewall rules across platforms.
 *
 * Propagates current spam firewall rules to all connected platforms.
 * Returns the sync status for each platform.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_platforms_sync_settings( WP_REST_Request $request ): WP_REST_Response {
    $settings    = get_option( CMCC_SETTINGS_OPTION, cmcc_get_default_settings() );
    $integrations = isset( $settings['integrations'] ) ? $settings['integrations'] : array();
    $firewall     = isset( $settings['spam_firewall'] ) ? $settings['spam_firewall'] : array();

    $sync_payload = array(
        'firewall_rules' => array(
            'max_links'                  => $firewall['max_links'] ?? 5,
            'blacklisted_keywords'       => $firewall['blacklisted_keywords'] ?? '',
            'blacklisted_email_domains'  => $firewall['blacklisted_email_domains'] ?? '',
            'min_submit_time'            => $firewall['min_submit_time'] ?? 3,
            'enable_duplicate_detection' => ! empty( $firewall['enable_duplicate_detection'] ),
            'duplicate_lookback_days'    => $firewall['duplicate_lookback_days'] ?? 7,
            'global_action'              => $firewall['global_action'] ?? 'flag',
        ),
        'auto_moderation' => isset( $settings['auto_moderation'] ) ? $settings['auto_moderation'] : array(),
        'timestamp'       => current_time( 'mysql', true ),
        'source'          => home_url(),
    );

    // Sync to each platform via webhook.
    $results = array();

    // WordPress self-sync is always successful.
    $results['wordpress'] = array(
        'platform'  => 'WordPress',
        'success'   => true,
        'synced_at' => current_time( 'mysql' ),
    );

    // Send to external platforms via their configured webhooks.
    $platforms_map = array(
        'shopify'   => 'shopify_sync_endpoint',
        'storyblok' => 'storyblok_sync_endpoint',
        'strapi'    => 'strapi_sync_endpoint',
        'wix'       => 'wix_sync_endpoint',
    );

    foreach ( $platforms_map as $platform_key => $setting_key ) {
        $endpoint = isset( $integrations[ $setting_key ] ) ? $integrations[ $setting_key ] : '';
        $label    = ucfirst( $platform_key );

        if ( empty( $endpoint ) ) {
            $results[ $platform_key ] = array(
                'platform' => $label,
                'success'  => false,
                'reason'   => 'No sync endpoint configured',
                'synced_at' => null,
            );
            continue;
        }

        $response = wp_remote_post( $endpoint, array(
            'body'    => wp_json_encode( $sync_payload ),
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-CMCC-Sync'  => 'firewall-rules',
            ),
            'timeout'  => 15,
            'blocking' => true,
        ) );

        if ( is_wp_error( $response ) ) {
            $results[ $platform_key ] = array(
                'platform' => $label,
                'success'  => false,
                'reason'   => $response->get_error_message(),
                'synced_at' => null,
            );
        } else {
            $results[ $platform_key ] = array(
                'platform'  => $label,
                'success'   => true,
                'http_code' => wp_remote_retrieve_response_code( $response ),
                'synced_at' => current_time( 'mysql' ),
            );
        }
    }

    // Store last sync time.
    update_option( 'cmcc_last_settings_sync', current_time( 'mysql', true ) );

    return new WP_REST_Response( array(
        'success'  => true,
        'results'  => $results,
        'synced_at' => current_time( 'mysql' ),
        'rules_version' => md5( wp_json_encode( $sync_payload ) ),
    ), 200 );
}

endif; // cmcc_rest_platforms_sync_settings

if ( ! function_exists( 'cmcc_rest_get_unified_queue' ) ) :

/**
 * GET /cmcc/v1/unified-queue – Get combined queue from all platforms.
 *
 * Returns all queue items aggregated from the local WordPress queue
 * and any connected platforms. Supports pagination and filtering.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_unified_queue( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $page     = max( 1, (int) $request->get_param( 'page' ) ?: 1 );
    $per_page = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ?: 25 ) );
    $offset   = ( $page - 1 ) * $per_page;
    $status   = sanitize_text_field( $request->get_param( 'status' ) ?? '' );

    $table = $wpdb->prefix . CMCC_QUEUE_TABLE;

    $where  = array( '1=1' );
    $values = array();

    if ( '' !== $status ) {
        $where[]  = 'status = %s';
        $values[] = $status;
    }

    $where_clause = implode( ' AND ', $where );

    // Count total items.
    $count_sql = $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE {$where_clause}",
        $values
    ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $total_items = (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Get local items.
    $items = $wpdb->get_results( $wpdb->prepare(
        "SELECT *,
        'wordpress' as platform,
        'local' as source
        FROM {$table}
        WHERE {$where_clause}
        ORDER BY created_at DESC
        LIMIT %d OFFSET %d",
        array_merge( $values, array( $per_page, $offset ) )
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    // Add platform origin info to each item.
    $unified = array();
    foreach ( $items as $item ) {
        $unified[] = array(
            'id'           => $item->id,
            'item_id'      => $item->item_id,
            'content_type' => $item->content_type,
            'status'       => $item->status,
            'spam_score'   => (float) $item->spam_score,
            'author_id'    => $item->author_id,
            'title'        => $item->title,
            'excerpt'      => $item->excerpt,
            'date_gmt'     => $item->date_gmt,
            'created_at'   => $item->created_at,
            'platform'     => 'wordpress',
            'source'       => 'local',
        );
    }

    // Allow external platforms to inject items via filter.
    $external_items = apply_filters( 'cmcc_unified_queue_external', array(), $request );
    if ( is_array( $external_items ) && ! empty( $external_items ) ) {
        foreach ( $external_items as $ext_item ) {
            $unified[] = $ext_item;
        }
        // Re-sort by created_at descending.
        usort( $unified, function ( $a, $b ) {
            return strtotime( $b['created_at'] ?? $b['date_gmt'] ?? 'now' )
                 - strtotime( $a['created_at'] ?? $a['date_gmt'] ?? 'now' );
        } );
    }

    $total_unified = count( $unified );

    return new WP_REST_Response( array(
        'items'       => $unified,
        'total'       => $total_items,
        'unified_total' => $total_unified,
        'page'        => $page,
        'per_page'    => $per_page,
        'total_pages' => (int) ceil( $total_items / $per_page ),
    ), 200 );
}

endif; // cmcc_rest_get_unified_queue
