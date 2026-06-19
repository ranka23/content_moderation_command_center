<?php
/**
 * CMCC User Reputation Module
 *
 * Provides user reputation tracking and trust level assignment.
 * Calculates reputation scores based on moderation history and
 * assigns trust levels (New, Regular, Trusted, Verified, Suspicious, Blocked).
 *
 * Corresponds to Section 9 (User Management) and Section 10.3
 * (User Reputation Dashboard) of the Design Analysis.
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Calculate a user's reputation score based on their moderation history.
 *
 * Aggregates queue data for a specific author to compute reputation:
 * - Approved content improves reputation
 * - Spam/flagged content harms reputation
 *
 * @param string $author_id The author identifier (username, email, or ID).
 * @return array{author_id: string, total_items: int, spam_count: int, approved_count: int, flagged_count: int, rejected_count: int, spam_ratio: float, reputation_score: int, trust_level: string}
 */
function cmcc_get_user_reputation_data( string $author_id ): array {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;

    $data = $wpdb->get_row( $wpdb->prepare(
        "SELECT
            author_id,
            COUNT(*) as total_items,
            SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            AVG(spam_score) as avg_spam_score,
            MAX(spam_score) as max_spam_score
        FROM {$queue_table}
        WHERE author_id = %s
        GROUP BY author_id",
        $author_id
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    if ( ! $data ) {
        return array(
            'author_id'       => $author_id,
            'total_items'     => 0,
            'spam_count'      => 0,
            'approved_count'  => 0,
            'flagged_count'   => 0,
            'rejected_count'  => 0,
            'spam_ratio'      => 0.0,
            'reputation_score' => 0,
            'trust_level'     => 'New',
        );
    }

    $total_items    = (int) $data->total_items;
    $spam_count     = (int) $data->spam_count;
    $approved_count = (int) $data->approved_count;
    $flagged_count  = (int) $data->flagged_count;
    $rejected_count = (int) $data->rejected_count;
    $spam_ratio     = $total_items > 0 ? round( $spam_count / $total_items, 2 ) : 0;

    // Calculate reputation score: -5 per spam, -2 per flagged, +2 per approved, -3 per rejected.
    $reputation_score = ( $approved_count * 2 ) - ( $spam_count * 5 ) - ( $flagged_count * 2 ) - ( $rejected_count * 3 );

    // Determine trust level based on spam ratio and reputation score.
    if ( $total_items < 2 ) {
        $trust_level = 'New';
    } elseif ( $reputation_score <= -20 || $spam_ratio > 0.5 ) {
        $trust_level = 'Blocked';
    } elseif ( $reputation_score <= -10 || $spam_ratio > 0.2 ) {
        $trust_level = 'Suspicious';
    } elseif ( $reputation_score >= 20 && $spam_ratio <= 0.05 ) {
        $trust_level = 'Verified';
    } elseif ( $reputation_score >= 10 && $spam_ratio <= 0.1 ) {
        $trust_level = 'Trusted';
    } elseif ( $spam_ratio > 0.05 ) {
        $trust_level = 'Suspicious';
    } else {
        $trust_level = 'Regular';
    }

    return array(
        'author_id'        => $data->author_id,
        'total_items'      => $total_items,
        'spam_count'       => $spam_count,
        'approved_count'   => $approved_count,
        'flagged_count'    => $flagged_count,
        'rejected_count'   => $rejected_count,
        'spam_ratio'       => $spam_ratio,
        'reputation_score' => $reputation_score,
        'trust_level'      => $trust_level,
    );
}

if ( ! function_exists( 'cmcc_rest_get_user_reputation' ) ) :

/**
 * GET /cmcc/v1/reputation/users – Get paginated user reputation data.
 *
 * Returns all users in the moderation queue with reputation scores,
 * trust levels, and activity counts.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_user_reputation( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $queue_table = CMCC_QUEUE_TABLE;
    $page        = max( 1, (int) $request->get_param( 'page' ) ?: 1 );
    $per_page    = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ?: 25 ) );
    $offset      = ( $page - 1 ) * $per_page;
    $search      = sanitize_text_field( $request->get_param( 'search' ) ?? '' );
    $trust_level = sanitize_text_field( $request->get_param( 'trust_level' ) ?? '' );

    $where  = array( 'author_id != %s' );
    $values = array( '' );

    if ( '' !== $search ) {
        $where[]  = 'author_id LIKE %s';
        $values[] = '%' . $wpdb->esc_like( $search ) . '%';
    }

    $where_clause = implode( ' AND ', $where );

    // Get total count.
    $count_sql = $wpdb->prepare(
        "SELECT COUNT(DISTINCT author_id) FROM {$queue_table} WHERE {$where_clause}",
        $values
    ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $total_users = (int) $wpdb->get_var( $count_sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

    // Get aggregated user data.
    $users = $wpdb->get_results( $wpdb->prepare(
        "SELECT
            author_id,
            COUNT(*) as total_items,
            SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            AVG(spam_score) as avg_spam_score,
            MAX(spam_score) as max_spam_score,
            MIN(date_gmt) as first_seen,
            MAX(date_gmt) as last_seen
        FROM {$queue_table}
        WHERE {$where_clause}
        GROUP BY author_id
        ORDER BY total_items DESC
        LIMIT %d OFFSET %d",
        array_merge( $values, array( $per_page, $offset ) )
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    $result = array();
    foreach ( $users as $user ) {
        $reputation = cmcc_get_user_reputation_data( $user->author_id );

        // Filter by trust level if specified.
        if ( '' !== $trust_level && $reputation['trust_level'] !== $trust_level ) {
            continue;
        }

        $result[] = array(
            'author_id'        => $user->author_id,
            'total_items'      => (int) $user->total_items,
            'spam_count'       => (int) $user->spam_count,
            'approved_count'   => (int) $user->approved_count,
            'flagged_count'    => (int) $user->flagged_count,
            'rejected_count'   => (int) $user->rejected_count,
            'avg_spam_score'   => round( (float) $user->avg_spam_score, 2 ),
            'max_spam_score'   => round( (float) $user->max_spam_score, 2 ),
            'spam_ratio'       => $reputation['spam_ratio'],
            'reputation_score' => $reputation['reputation_score'],
            'trust_level'      => $reputation['trust_level'],
            'first_seen'       => $user->first_seen,
            'last_seen'        => $user->last_seen,
        );
    }

    return new WP_REST_Response( array(
        'users'       => $result,
        'total'       => $total_users,
        'page'        => $page,
        'per_page'    => $per_page,
        'total_pages' => (int) ceil( $total_users / $per_page ),
    ), 200 );
}

endif; // cmcc_rest_get_user_reputation

if ( ! function_exists( 'cmcc_rest_get_user_reputation_detail' ) ) :

/**
 * GET /cmcc/v1/reputation/user/{id} – Get detailed reputation for a single user.
 *
 * Returns comprehensive reputation data for one user, including
 * recent history, trust level, and moderation statistics.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_user_reputation_detail( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $author_id  = sanitize_text_field( $request->get_param( 'id' ) );
    $reputation = cmcc_get_user_reputation_data( $author_id );

    // Get recent queue items from this author.
    $queue_table = CMCC_QUEUE_TABLE;
    $recent_items = $wpdb->get_results( $wpdb->prepare(
        "SELECT id, item_id, content_type, status, spam_score, title, excerpt, date_gmt, created_at
        FROM {$queue_table}
        WHERE author_id = %s
        ORDER BY created_at DESC
        LIMIT 25",
        $author_id
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    // Get recent activity log entries for this user.
    $log_table = CMCC_ACTIVITY_LOG_TABLE;
    $activity = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.item_id IN (
            SELECT item_id FROM {$queue_table} WHERE author_id = %s
        )
        ORDER BY l.timestamp DESC
        LIMIT 50",
        $author_id
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    // Check if this is a WordPress user.
    $wp_user     = null;
    $wp_user_obj = get_user_by( 'login', $author_id );
    if ( ! $wp_user_obj ) {
        $wp_user_obj = get_user_by( 'email', $author_id );
    }
    if ( $wp_user_obj ) {
        $wp_user = array(
            'ID'              => $wp_user_obj->ID,
            'display_name'    => $wp_user_obj->display_name,
            'user_email'      => $wp_user_obj->user_email,
            'user_registered' => $wp_user_obj->user_registered,
            'roles'           => array_values( $wp_user_obj->roles ),
        );
    }

    return new WP_REST_Response( array(
        'reputation'  => $reputation,
        'wp_user'     => $wp_user,
        'recent_items' => $recent_items,
        'activity'    => $activity,
    ), 200 );
}

endif; // cmcc_rest_get_user_reputation_detail
