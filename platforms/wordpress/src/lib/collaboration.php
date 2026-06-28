<?php
/**
 * CMCC Collaboration Module
 *
 * Provides team collaboration features for moderation:
 * - Internal notes on queue items
 * - Item assignment to moderators with due dates and priority
 * - Real-time activity feed
 * - Item history timeline
 *
 * Corresponds to Section 10.6 of the Design Analysis:
 * - Moderation Notes
 * - Assignment System
 * - Activity Feed
 * - Conflict Detection
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get the transient key prefix used for storing notes on a queue item.
 *
 * @param string $item_id The queue item ID.
 * @return string The transient key.
 */
function cmcc_get_notes_key( string $item_id ): string {
    return 'cmcc_notes_' . $item_id;
}

/**
 * Get the transient key used for storing assignment data on a queue item.
 *
 * @param string $item_id The queue item ID.
 * @return string The transient key.
 */
function cmcc_get_assign_key( string $item_id ): string {
    return 'cmcc_assign_' . $item_id;
}

if ( ! function_exists( 'cmcc_rest_add_note' ) ) :

/**
 * POST /cmcc/v1/queue/{id}/note – Add a note to a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_add_note( WP_REST_Request $request ): WP_REST_Response {
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

    $notes_key = cmcc_get_notes_key( $item_id );
    $notes     = get_transient( $notes_key );
    if ( ! is_array( $notes ) ) {
        $notes = array();
    }

    $allowed_types = array( 'general', 'question', 'instruction', 'resolution' );
    $note = array(
        'id'         => uniqid( 'note_' ),
        'itemId'     => $item_id,
        'authorId'   => $current_user->ID,
        'authorName' => $current_user->display_name ?: $current_user->user_login,
        'content'    => $content,
        'createdAt'  => current_time( 'mysql' ),
        'isInternal' => $is_internal,
        'type'       => in_array( $type, $allowed_types, true ) ? $type : 'general',
    );

    array_unshift( $notes, $note );
    // Keep max 100 notes per item.
    $notes = array_slice( $notes, 0, 100 );
    set_transient( $notes_key, $notes, DAY_IN_SECONDS * 30 );

    // Log the note addition as an activity.
    cmcc_log_activity( array(
        'moderator_id'    => $current_user->ID,
        'action'          => 'add_note',
        'content_type'    => 'queue_item',
        'item_id'         => $item_id,
        'item_title'      => '',
        'previous_status' => '',
        'new_status'      => '',
        'notes'           => sprintf(
            'Note added (type: %s, internal: %s)',
            $type,
            $is_internal ? 'yes' : 'no'
        ),
    ) );

    return new WP_REST_Response( array(
        'success' => true,
        'note'    => $note,
    ), 200 );
}

endif; // cmcc_rest_add_note

if ( ! function_exists( 'cmcc_rest_get_notes' ) ) :

/**
 * GET /cmcc/v1/queue/{id}/notes – Get notes for a queue item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_notes( WP_REST_Request $request ): WP_REST_Response {
    $item_id    = $request->get_param( 'id' );
    $notes_key  = cmcc_get_notes_key( $item_id );
    $notes      = get_transient( $notes_key );

    if ( ! is_array( $notes ) ) {
        $notes = array();
    }

    return new WP_REST_Response( array( 'notes' => $notes ), 200 );
}

endif; // cmcc_rest_get_notes

if ( ! function_exists( 'cmcc_rest_assign_item' ) ) :

/**
 * POST /cmcc/v1/queue/{id}/assign – Assign a queue item to a moderator/team.
 *
 * Supports setting a due date and priority level on the assignment.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_assign_item( WP_REST_Request $request ): WP_REST_Response {
    $item_id      = $request->get_param( 'id' );
    $assignee     = sanitize_text_field( $request->get_param( 'assignee' ) );
    $due_date     = sanitize_text_field( $request->get_param( 'due_date' ) );
    $priority     = sanitize_text_field( $request->get_param( 'priority' ) );
    $current_user = wp_get_current_user();

    $allowed_priorities = array( 'low', 'normal', 'high', 'critical' );
    if ( ! in_array( $priority, $allowed_priorities, true ) ) {
        $priority = 'normal';
    }

    // Validate the assignee is a valid WordPress user if provided.
    if ( ! empty( $assignee ) ) {
        $assignee_user = get_user_by( 'login', $assignee );
        if ( ! $assignee_user ) {
            $assignee_user = get_user_by( 'email', $assignee );
        }
        if ( ! $assignee_user ) {
            $assignee_user = get_user_by( 'ID', (int) $assignee );
        }
        if ( ! $assignee_user ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => esc_html__( 'Assignee user not found.', 'cmcc' ),
            ), 404 );
        }
        $assignee = $assignee_user->display_name;
    }

    $assign_key = cmcc_get_assign_key( $item_id );
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

    // Log the assignment in activity log.
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

    // Send assignment notification.
    if ( ! empty( $assignee ) && function_exists( 'cmcc_send_notification' ) ) {
        $queue_item = cmcc_get_queue_item( $item_id );
        cmcc_send_notification( 'assignment', array(
            'title'       => $queue_item ? $queue_item->title : '',
            'assigned_by' => $current_user->display_name,
            'due_date'    => $due_date,
            'priority'    => $priority,
        ) );
    }

    return new WP_REST_Response( array(
        'success'    => true,
        'assignment' => $assignment,
    ), 200 );
}

endif; // cmcc_rest_assign_item

if ( ! function_exists( 'cmcc_rest_get_activity_feed' ) ) :

/**
 * GET /cmcc/v1/activity-feed – Get recent moderation activity feed.
 *
 * Returns a real-time feed of moderation actions across the system.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_activity_feed( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $limit      = min( 50, max( 1, (int) $request->get_param( 'limit' ) ) );
    $start_date = $request->get_param( 'start_date' );
    $end_date   = $request->get_param( 'end_date' );
    $log_table  = CMCC_ACTIVITY_LOG_TABLE;

    $where  = '';
    $params = array();

    if ( $start_date ) {
        $where     .= ' AND l.timestamp >= %s';
        $params[]   = $start_date;
    }
    if ( $end_date ) {
        $where     .= ' AND l.timestamp <= %s';
        $params[]   = $end_date;
    }

    $params[] = $limit;

    $sql = "SELECT l.*, u.display_name as moderator_name
            FROM {$log_table} l
            LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
            WHERE 1=1 {$where}
            ORDER BY l.timestamp DESC
            LIMIT %d";

    $rows = $wpdb->get_results(
        $wpdb->prepare( $sql, $params ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    );

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
            'itemId'    => $row->item_id,
            'itemTitle' => $row->item_title,
            'timestamp' => $row->timestamp,
            'action'    => $row->action,
        );
    }

    return new WP_REST_Response( array( 'events' => $events ), 200 );
}

endif; // cmcc_rest_get_activity_feed

if ( ! function_exists( 'cmcc_rest_get_item_history' ) ) :

/**
 * GET /cmcc/v1/queue/{id}/history – Get full history timeline for a queue item.
 *
 * Returns all actions, status changes, notes, and assignments for the item.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function cmcc_rest_get_item_history( WP_REST_Request $request ): WP_REST_Response {
    global $wpdb;

    $item_id   = $request->get_param( 'id' );
    $log_table = CMCC_ACTIVITY_LOG_TABLE;

    $history = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.*, u.display_name as moderator_name
        FROM {$log_table} l
        LEFT JOIN {$wpdb->users} u ON l.moderator_id = u.ID
        WHERE l.item_id = %s
        ORDER BY l.timestamp DESC
        LIMIT 50",
        $item_id
    ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

    // Append notes as supplemental timeline entries.
    $notes_key = cmcc_get_notes_key( $item_id );
    $notes     = get_transient( $notes_key );
    $timeline  = array();

    foreach ( $history as $entry ) {
        $timeline[] = array(
            'type'       => 'action',
            'id'         => 'log_' . $entry->id,
            'moderator'  => $entry->moderator_name ?: 'User #' . $entry->moderator_id,
            'action'     => $entry->action,
            'from'       => $entry->previous_status,
            'to'         => $entry->new_status,
            'notes'      => $entry->notes,
            'timestamp'  => $entry->timestamp,
        );
    }

    if ( is_array( $notes ) ) {
        foreach ( $notes as $note ) {
            $timeline[] = array(
                'type'      => 'note',
                'id'        => $note['id'],
                'moderator' => $note['authorName'] ?? '',
                'action'    => 'note',
                'from'      => '',
                'to'        => '',
                'notes'     => $note['content'] ?? '',
                'timestamp' => $note['createdAt'] ?? '',
            );
        }
    }

    // Add assignment info if available.
    $assign_key = cmcc_get_assign_key( $item_id );
    $assignment = get_transient( $assign_key );
    if ( is_array( $assignment ) && ! empty( $assignment['assignee'] ) ) {
        $timeline[] = array(
            'type'      => 'assignment',
            'id'        => 'assign_' . $item_id,
            'moderator' => $assignment['assignedBy'] ?? '',
            'action'    => 'assigned',
            'from'      => '',
            'to'        => $assignment['assignee'],
            'notes'     => sprintf(
                'Priority: %s, Due: %s',
                $assignment['priority'] ?? 'normal',
                $assignment['dueDate'] ?? 'none'
            ),
            'timestamp' => $assignment['assignedAt'] ?? '',
        );
    }

    // Sort timeline by timestamp descending.
    usort( $timeline, function ( $a, $b ) {
        return strtotime( $b['timestamp'] ) - strtotime( $a['timestamp'] );
    } );

    return new WP_REST_Response( array(
        'item_id'  => $item_id,
        'history'  => $history,
        'timeline' => $timeline,
    ), 200 );
}

endif; // cmcc_rest_get_item_history
