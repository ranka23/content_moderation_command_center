<?php
/**
 * CMCC WordPress Content Hook Integration
 *
 * Hooks into WordPress core actions to auto-populate the moderation queue
 * when new content is created (comments, posts, etc.). This is the critical
 * bridge between WordPress content creation and the CMCC moderation pipeline.
 *
 * Corresponds to sections 9 (F1/F3) and 10 from the Design Analysis:
 * - F1: Missing Seed Data Integration (auto-populate from real data)
 * - F3: No Integration with WordPress Hooks
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Initialize content hooks based on plugin settings.
 */
function cmcc_init_content_hooks(): void {
    $settings = get_option( CMCC_SETTINGS_OPTION, array() );
    $integrations = isset( $settings['integrations'] ) ? $settings['integrations'] : array();

    // Comment hooks
    if ( ! empty( $integrations['auto_import_comments'] ) ) {
        add_action( 'wp_insert_comment', 'cmcc_hook_new_comment', 10, 2 );
        add_action( 'comment_post', 'cmcc_hook_comment_post', 10, 3 );
    }

    // Post/page hooks
    if ( ! empty( $integrations['auto_import_posts'] ) ) {
        add_action( 'wp_insert_post', 'cmcc_hook_new_post', 10, 3 );
        add_action( 'save_post', 'cmcc_hook_save_post', 10, 3 );
    }

    // WooCommerce review hooks
    if ( ! empty( $integrations['auto_import_woocommerce'] ) && class_exists( 'WooCommerce' ) ) {
        add_action( 'woocommerce_new_comment', 'cmcc_hook_woocommerce_review', 10, 2 );
    }

    // bbPress hook
    if ( ! empty( $integrations['auto_import_bbpress'] ) && class_exists( 'bbPress' ) ) {
        add_action( 'bbp_new_topic', 'cmcc_hook_bbpress_topic', 10, 4 );
        add_action( 'bbp_new_reply', 'cmcc_hook_bbpress_reply', 10, 4 );
    }

    // BuddyPress hook
    if ( ! empty( $integrations['auto_import_buddypress'] ) && class_exists( 'BuddyPress' ) ) {
        add_action( 'bp_activity_add', 'cmcc_hook_buddypress_activity', 10, 2 );
    }

    // Gravity Forms hook
    if ( ! empty( $integrations['auto_import_gravityforms'] ) && class_exists( 'GFForms' ) ) {
        add_action( 'gform_entry_created', 'cmcc_hook_gravityforms_entry', 10, 2 );
    }
}
add_action( 'init', 'cmcc_init_content_hooks' );

/**
 * Hook: New comment inserted via wp_insert_comment.
 *
 * @param int        $comment_id The comment ID.
 * @param WP_Comment $comment    The comment object.
 */
function cmcc_hook_new_comment( int $comment_id, WP_Comment $comment ): void {
    // Skip pingbacks and trackbacks
    if ( in_array( $comment->comment_type, array( 'pingback', 'trackback' ), true ) ) {
        return;
    }

    // Derive a display title: use comment content excerpt, falling back to post title, then 'Untitled'.
    $comment_title = mb_substr( wp_strip_all_tags( $comment->comment_content ), 0, 80 );
    if ( '' === $comment_title ) {
        $comment_title = get_the_title( $comment->comment_post_ID );
    }
    if ( '' === $comment_title ) {
        $comment_title = 'Untitled';
    }

    cmcc_add_to_queue(
        'comment',
        (string) $comment_id,
        $comment->comment_author ?: 'Anonymous',
        $comment->comment_author_email ?: '',
        $comment->comment_author_IP ?: '',
        $comment->comment_content ?: '',
        esc_html( $comment_title )
    );
}

/**
 * Hook: Comment posted from the front-end.
 *
 * @param int        $comment_id The comment ID.
 * @param int|string $approved   Approval status (1, 0, 'spam').
 * @param array      $commentdata The comment data array.
 */
if ( ! function_exists( 'cmcc_hook_comment_post' ) ) {
function cmcc_hook_comment_post( int $comment_id, $approved, array $commentdata ): void {
    // We let wp_insert_comment handle it, but this catches any missed cases
    if ( did_action( 'wp_insert_comment' ) <= 0 ) {
        $comment = get_comment( $comment_id );
        if ( $comment ) {
            cmcc_hook_new_comment( $comment_id, $comment );
        }
    }
}
}

/**
 * Hook: New post/page published or updated.
 *
 * @param int     $post_id The post ID.
 * @param WP_Post $post    The post object.
 * @param bool    $update  Whether this is an existing post being updated.
 */
function cmcc_hook_new_post( int $post_id, WP_Post $post, bool $update ): void {
    // Skip auto-saves, revisions, and non-public post types
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    if ( wp_is_post_revision( $post_id ) ) {
        return;
    }
    if ( wp_is_post_autosave( $post_id ) ) {
        return;
    }

    $post_type = get_post_type( $post_id );
    if ( ! $post_type ) {
        $post_type = 'post';
    }

    // Only queue non-public post types if they're newly created (not updates)
    if ( $update ) {
        return;
    }

    $author_id = $post->post_author ?: 0;
    $author    = get_user_by( 'id', $author_id );

    cmcc_add_to_queue(
        $post_type,
        (string) $post_id,
        $author ? $author->display_name : 'Unknown',
        $author ? $author->user_email : '',
        '', // IP not available for posts
        $post->post_content ?: '',
        esc_html( $post->post_title ?: 'Untitled' )
    );
}

/**
 * Hook: save_post alias (redirects to wp_insert_post handling).
 *
 * @param int     $post_id The post ID.
 * @param WP_Post $post    The post object.
 * @param bool    $update  Whether this is an existing post being updated.
 */
if ( ! function_exists( 'cmcc_hook_save_post' ) ) {
function cmcc_hook_save_post( int $post_id, WP_Post $post, bool $update ): void {
    cmcc_hook_new_post( $post_id, $post, $update );
}
}

/**
 * Hook: WooCommerce review submitted.
 *
 * @param int $comment_id The comment ID.
 * @param int $product_id The product ID.
 */
function cmcc_hook_woocommerce_review( int $comment_id, int $product_id ): void {
    $comment = get_comment( $comment_id );
    if ( ! $comment ) {
        return;
    }

    cmcc_add_to_queue(
        'woocommerce_review',
        (string) $comment_id,
        $comment->comment_author ?: 'Anonymous',
        $comment->comment_author_email ?: '',
        $comment->comment_author_IP ?: '',
        $comment->comment_content ?: '',
        sprintf(
            /* translators: %s: product title */
            esc_html__( 'Review on %s', 'cmcc' ),
            get_the_title( $product_id ) ?: 'Product'
        )
    );
}

/**
 * Hook: bbPress new topic.
 *
 * @param int   $topic_id   The topic ID.
 * @param int   $forum_id   The forum ID.
 * @param mixed $anonymous_data Anonymous poster data (false if logged in).
 * @param int   $topic_author The topic author ID.
 */
function cmcc_hook_bbpress_topic( int $topic_id, int $forum_id, $anonymous_data, int $topic_author ): void {
    $topic = get_post( $topic_id );
    if ( ! $topic ) {
        return;
    }

    $author = get_user_by( 'id', $topic_author );
    $author_ip = $anonymous_data && isset( $anonymous_data['author_ip'] )
        ? $anonymous_data['author_ip']
        : '';

    cmcc_add_to_queue(
        'bbpress_topic',
        (string) $topic_id,
        $author ? $author->display_name : 'Anonymous',
        $author ? $author->user_email : '',
        $author_ip,
        $topic->post_content ?: '',
        esc_html( $topic->post_title ?: 'Untitled Topic' )
    );
}

/**
 * Hook: bbPress new reply.
 *
 * @param int   $reply_id   The reply ID.
 * @param int   $topic_id   The topic ID.
 * @param int   $forum_id   The forum ID.
 * @param mixed $anonymous_data Anonymous poster data.
 */
function cmcc_hook_bbpress_reply( int $reply_id, int $topic_id, int $forum_id, $anonymous_data ): void {
    $reply = get_post( $reply_id );
    if ( ! $reply ) {
        return;
    }

    cmcc_add_to_queue(
        'bbpress_reply',
        (string) $reply_id,
        $reply->post_author ? get_user_by( 'id', $reply->post_author )->display_name : 'Anonymous',
        '',
        '',
        $reply->post_content ?: '',
        sprintf(
            /* translators: %s: topic title */
            esc_html__( 'Reply to %s', 'cmcc' ),
            get_the_title( $topic_id ) ?: 'Topic'
        )
    );
}

/**
 * Hook: BuddyPress activity posted.
 *
 * @param array $activity_args Activity arguments before insertion.
 * @param int   $activity_id   The activity ID.
 */
function cmcc_hook_buddypress_activity( array $activity_args, int $activity_id ): void {
    $activity = bp_activity_get_specific( array( 'activity_ids' => array( $activity_id ) ) );
    if ( empty( $activity['activities'] ) ) {
        return;
    }
    $activity = $activity['activities'][0];

    cmcc_add_to_queue(
        'buddypress_activity',
        (string) $activity_id,
        $activity->display_name ?: 'Anonymous',
        '',
        '',
        $activity->content ?: '',
        $activity->action ?: 'BuddyPress Activity'
    );
}

/**
 * Hook: Gravity Forms entry created.
 *
 * @param array $entry The entry data.
 * @param array $form  The form data.
 */
function cmcc_hook_gravityforms_entry( array $entry, array $form ): void {
    $title = isset( $form['title'] ) ? $form['title'] : 'Form Entry';
    $content = '';

    if ( isset( $entry['ip'] ) ) {
        $content .= 'IP: ' . $entry['ip'] . "\n";
    }
    if ( isset( $entry['source_url'] ) ) {
        $content .= 'Source: ' . $entry['source_url'] . "\n";
    }

    cmcc_add_to_queue(
        'form_entry',
        isset( $entry['id'] ) ? (string) $entry['id'] : uniqid( 'gf_' ),
        isset( $entry['created_by'] ) ? get_user_by( 'id', $entry['created_by'] )->display_name : 'Guest',
        '',
        isset( $entry['ip'] ) ? $entry['ip'] : '',
        $content,
        $title
    );
}

/**
 * Add an item to the moderation queue.
 *
 * Runs the content through the PHP firewall engine before inserting,
 * which automatically classifies it as pending, spam, or flagged.
 *
 * @param string $content_type Type of content (comment, post, etc.).
 * @param string $item_id      The original content ID.
 * @param string $author_name  Display name of the author.
 * @param string $author_email Author email address.
 * @param string $author_ip    Author IP address.
 * @param string $content      The full content text.
 * @param string $title        The content title.
 * @return int|false The queue entry ID or false on failure.
 */
function cmcc_add_to_queue(
    string $content_type,
    string $item_id,
    string $author_name = '',
    string $author_email = '',
    string $author_ip = '',
    string $content = '',
    string $title = ''
) {
    global $wpdb;

    $table = CMCC_QUEUE_TABLE;

    // Run through PHP firewall engine for auto-classification
    $settings  = get_option( CMCC_SETTINGS_OPTION, array() );
    $firewall  = isset( $settings['spam_firewall'] ) ? $settings['spam_firewall'] : array();
    $auto_mod  = isset( $settings['auto_moderation'] ) ? $settings['auto_moderation'] : array();
    $behavior  = isset( $settings['general']['moderation_behavior'] ) ? $settings['general']['moderation_behavior'] : 'flag';
    $auto_moderate = ! empty( $settings['general']['auto_moderate'] );

    // Evaluate firewall rules
    $firewall_result = cmcc_evaluate_firewall_rules(
        $content,
        $firewall,
        array(
            'author_ip'    => $author_ip,
            'author_email' => $author_email,
        )
    );

    // Determine status based on firewall result
    $status = 'pending';
    $spam_score = 0;

    if ( $auto_moderate && $firewall_result['triggered'] ) {
        switch ( $firewall_result['action'] ) {
            case 'spam':
                $status = 'spam';
                $spam_score = 85;
                break;
            case 'discard':
                $status = 'spam';
                $spam_score = 95;
                break;
            case 'flag':
                $status = 'flagged';
                $spam_score = 60;
                break;
        }
    }

    // Apply AI spam score thresholds if configured
    $ai_threshold_flag    = isset( $auto_mod['spam_score_flag_threshold'] ) ? (int) $auto_mod['spam_score_flag_threshold'] : 60;
    $ai_threshold_spam    = isset( $auto_mod['spam_score_spam_threshold'] ) ? (int) $auto_mod['spam_score_spam_threshold'] : 80;
    $ai_threshold_discard = isset( $auto_mod['spam_score_discard_threshold'] ) ? (int) $auto_mod['spam_score_discard_threshold'] : 95;

    // ── AI-powered evaluation (if configured) ────────────────────────────
    $ai_mod = isset( $settings['ai_moderation'] ) ? $settings['ai_moderation'] : array();
    $ai_engine = isset( $ai_mod['engine'] ) ? $ai_mod['engine'] : 'none';
    $ai_auto_moderate = ! empty( $ai_mod['auto_moderate'] );

    if ( 'openai' === $ai_engine && ! empty( $ai_mod['api_key'] ) && ! empty( $content ) ) {
        $ai_model  = ! empty( $ai_mod['model'] ) ? $ai_mod['model'] : 'openai/gpt-4o-mini';
        $ai_result = cmcc_ai_evaluate_openrouter( $content, $ai_mod['api_key'], $ai_model );

        // Blend AI score with existing spam score
        $ai_spam_score = $ai_result['spam_score'];
        if ( $ai_spam_score >= $spam_score / 100.0 ) {
            $spam_score = round( $ai_spam_score * 100 );
            if ( $ai_auto_moderate && $auto_moderate ) {
                if ( $ai_spam_score >= 0.9 ) {
                    $status = 'spam';
                } elseif ( $ai_spam_score >= ( isset( $ai_mod['spam_threshold'] ) ? (int) $ai_mod['spam_threshold'] : 70 ) / 100.0 ) {
                    $status = 'flagged';
                    if ( 'pending' === $status ) {
                        $status = 'flagged';
                    }
                } elseif ( 'pending' === $status && $ai_spam_score < 0.2 ) {
                    $status = 'approved';
                }
            }
        }
    }

    // Check if this is from a known bad author
    $author_reputation = cmcc_get_author_reputation( $author_name, $author_email, $author_ip );
    if ( $author_reputation < -10 ) {
        $spam_score = max( $spam_score, 70 );
        if ( $spam_score >= $ai_threshold_flag && 'pending' === $status ) {
            $status = 'flagged';
        }
    }

    $excerpt = mb_substr( wp_strip_all_tags( $content ), 0, 500 );

    $result = $wpdb->insert(
        $table,
        array(
            'item_id'      => $item_id,
            'content_type' => $content_type,
            'status'       => $status,
            'spam_score'   => $spam_score / 100.0,
            'author_id'    => $author_name,
            'date_gmt'     => current_time( 'mysql', true ),
            'title'        => $title,
            'excerpt'      => $excerpt,
        ),
        array( '%s', '%s', '%s', '%f', '%s', '%s', '%s', '%s' )
    );

    // Log the creation if auto-moderated
    if ( 'pending' !== $status ) {
        cmcc_log_activity( array(
            'moderator_id'    => 0,
            'action'          => 'auto_moderate',
            'content_type'    => $content_type,
            'item_id'         => $item_id,
            'item_title'      => $title,
            'previous_status' => 'new',
            'new_status'      => $status,
            'notes'           => sprintf(
                'Auto-classified as %s (spam score: %d)',
                $status,
                $spam_score
            ),
        ) );
    }

    // Send webhook notification for new items
    cmcc_send_webhook( 'new_items', array(
        'item_id'      => $item_id,
        'content_type' => $content_type,
        'status'       => $status,
        'spam_score'   => $spam_score,
        'title'        => $title,
        'time'         => current_time( 'mysql' ),
    ) );

    return $result ? $wpdb->insert_id : false;
}

/**
 * Get author reputation score based on moderation history.
 *
 * @param string $author_name  Author display name.
 * @param string $author_email Author email.
 * @param string $author_ip    Author IP address.
 * @return int Reputation score (negative = bad actor).
 */
function cmcc_get_author_reputation( string $author_name, string $author_email, string $author_ip ): int {
    global $wpdb;

    $table  = CMCC_QUEUE_TABLE;
    $score  = 0;

    // Count spam content from this author
    $spam_count = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE author_id = %s AND status = 'spam'",
        $author_name
    ) );
    $score -= $spam_count * 5;

    // Count flagged content
    $flagged_count = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE author_id = %s AND status = 'flagged'",
        $author_name
    ) );
    $score -= $flagged_count * 2;

    // Count approved content
    $approved_count = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE author_id = %s AND status = 'approved'",
        $author_name
    ) );
    $score += $approved_count * 2;

    return $score;
}
