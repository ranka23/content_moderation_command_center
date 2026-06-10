<?php
/**
 * CMCC Seed Data Script
 *
 * Generates a large dataset of dummy queue items and activity log entries
 * for testing the CMCC plugin.
 *
 * Usage:
 *   wp eval-file scripts/seed-data.php --allow-root
 *   # or from inside the Docker container:
 *   docker exec cmcc-wordpress-1 wp eval-file /var/www/html/wp-content/plugins/cmcc/scripts/seed-data.php --allow-root
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', dirname( __DIR__, 4 ) . '/wp-admin/' );
defined( 'WP_DEBUG' ) || define( 'WP_DEBUG', false );

if ( ! defined( 'CMCC_QUEUE_TABLE' ) ) {
	require_once dirname( __DIR__ ) . '/cmcc.php';
}

global $wpdb;

$queue_table = $wpdb->prefix . 'cmcc_queue';
$log_table   = $wpdb->prefix . 'cmcc_activity_log';

echo "Seeding CMCC test data...\n\n";

// ─── Configuration ──────────────────────────────────────────────────────────

$queue_count  = 500; // Total queue items to create
$log_count    = 300; // Total activity log entries to create

// ─── Content Type Templates ─────────────────────────────────────────────────

$content_types = array(
	'comment'           => array(
		'titles' => array(
			'Re: %s',
			'Great post about %s',
			'I disagree with %s',
			'Thanks for sharing %s',
			'Has anyone tried %s?',
			'This is exactly what I needed!',
			'Not sure I agree with %s',
			'Can you elaborate on %s?',
			'Great tips on %s!',
			' I have a question about %s',
		),
		'excerpts' => array(
			'I really enjoyed reading this article. Thanks for sharing your insights on this topic!',
			'This is a great resource. I have bookmarked it for future reference.',
			'I disagree with some points here. In my experience, the opposite has been true.',
			'Can someone explain this in simpler terms? I am having trouble understanding.',
			'I have been doing this for years and can confirm these tips work!',
			'This changed my perspective on the subject completely. Well written!',
			'Could you provide some sources for the statistics mentioned here?',
			'I tried this method and it worked wonders for my situation.',
			'Great article! I shared it with my colleagues and they loved it too.',
			'This is exactly the information I was looking for. Thank you!',
		),
	),
	'post'              => array(
		'titles' => array(
			'The Ultimate Guide to %s',
			'10 Tips for Better %s',
			'Why %s Matters in %d',
			'How to Master %s in 5 Steps',
			'Everything You Need to Know About %s',
			'The Beginner Guide to %s',
			'%s: A Comprehensive Overview',
			'Top 5 %s Strategies That Work',
			'Understanding %s: A Deep Dive',
			'%s for Beginners: Getting Started',
		),
		'excerpts' => array(
			'In this comprehensive guide, we explore everything you need to know to get started and succeed.',
			'We have compiled the top tips from industry experts to help you improve your skills.',
			'Discover why this topic is more important than ever in the current landscape.',
			'Follow these five simple steps to master the fundamentals and build from there.',
			'A complete overview covering all the essential aspects you need to understand.',
			'New to the topic? This beginner-friendly guide will walk you through the basics.',
			'An in-depth exploration of the key concepts, strategies, and best practices.',
			'We tested dozens of approaches so you do not have to. Here are the ones that work.',
			'A thorough examination of the subject matter, from foundational to advanced topics.',
			'Start your journey with this easy-to-follow guide designed for absolute beginners.',
		),
	),
	'page'              => array(
		'titles' => array(
			'About %s',
			'%s Services Overview',
			'Contact %s Support',
			'%s Documentation',
			'%s Frequently Asked Questions',
			'%s Privacy Policy',
			'%s Terms of Service',
			'%s Community Guidelines',
			'%s API Reference',
			'Getting Started with %s',
		),
		'excerpts' => array(
			'Learn more about our mission, vision, and the team behind the project.',
			'Explore our full range of services designed to help you succeed.',
			'Get in touch with our support team for assistance with any issues.',
			'Comprehensive documentation covering all features and functionality.',
			'Find answers to the most commonly asked questions about our platform.',
			'Our privacy policy outlines how we collect, use, and protect your data.',
			'Please read these terms carefully before using our services.',
			'Guidelines for participating in our community respectfully and constructively.',
			'Complete API reference documentation for developers integrating with our platform.',
			'A step-by-step guide to help new users get started quickly.',
		),
	),
	'woocommerce_review' => array(
		'titles' => array(
			'5 Stars - Amazing %s!',
			'Great %s, highly recommend',
			'Decent %s for the price',
			'Not what I expected from %s',
			'Best %s I have ever bought',
			'Poor quality %s, do not buy',
			'Excellent value %s',
			'Average %s, does the job',
			'Outstanding %s, worth every penny',
			'Disappointed with this %s',
		),
		'excerpts' => array(
			'Exceeded my expectations! The quality is outstanding and it arrived quickly.',
			'Really happy with this purchase. Works exactly as described and feels premium.',
			'Good for the price point. Not the best I have used but definitely not the worst.',
			'The product did not match the description. Had to return it unfortunately.',
			'This is hands down the best purchase I have made this year. Absolutely love it!',
			'The quality is very poor. Started falling apart after just a few uses.',
			'Incredible value for money. I would pay double for this quality!',
			'It is okay. Nothing special but it gets the job done as expected.',
			'Premium quality throughout. You can tell a lot of thought went into the design.',
			'Save your money. There are much better alternatives available for less.',
		),
	),
	'bbpress_topic'     => array(
		'titles' => array(
			'Question about %s',
			'Help needed with %s',
			'Tutorial: How to %s',
			'Recommendations for %s',
			'Bug report: %s issue',
			'Showcase: My %s setup',
			'Discussion: Future of %s',
			'Tips and tricks for %s',
			'Troubleshooting %s problems',
			'Review: Best %s tools',
		),
		'excerpts' => array(
			'Has anyone else experienced this issue? Looking for solutions from the community.',
			'I have been trying to figure this out for hours. Any help would be greatly appreciated!',
			'I put together this step-by-step guide based on my experience. Hope it helps others!',
			'Looking for recommendations on the best tools and resources available right now.',
			'I encountered a problem and have gathered the details below. Can anyone confirm?',
			'Here is my current setup. Would love to hear feedback and suggestions for improvement.',
			'What does everyone think about the latest developments? Lets discuss!',
			'I have compiled my top tips after months of trial and error. Share yours too!',
			'Having trouble with a specific issue. Here is what I have tried so far.',
			'I tested several different options. Here is my honest comparison and recommendations.',
		),
	),
	'bbpress_reply'     => array(
		'titles' => array(
			'RE: %s',
			'My experience with %s',
			'I found a fix for %s',
			'+1 for %s',
			'Actually, %s works better',
		),
		'excerpts' => array(
			'I had the same issue and this is how I resolved it. Hope it helps!',
			'In my experience, a different approach works much better. Let me explain.',
			'I found a workaround that solves this problem completely. Here is how.',
			'I agree with the previous poster. This is definitely the best approach.',
			'Actually, there is a better solution. I have been using it for months.',
		),
	),
	'buddypress_activity' => array(
		'titles' => array(
			'Just finished reading %s',
			'Check out this article on %s',
			'Excited about %s!',
			'Working on %s project',
			'Recommendation: %s',
		),
		'excerpts' => array(
			'Just finished reading an amazing article. Highly recommend it to everyone!',
			'I found this really interesting and thought the community would enjoy it too.',
			'So excited to share that I have been working on something related to this!',
			'Spent the weekend working on a new project. Here is a sneak peek!',
			'I highly recommend checking this out. It has been incredibly useful for me.',
		),
	),
	'form_entry'        => array(
		'titles' => array(
			'Contact: %s inquiry',
			'Support request: %s',
			'Feedback about %s',
			'Partnership proposal: %s',
			'General inquiry: %s',
		),
		'excerpts' => array(
			'I am reaching out to inquire about your services and potential collaboration opportunities.',
			'I need assistance with a technical issue I am experiencing with the platform.',
			'I wanted to provide some feedback about my recent experience using the product.',
			'I am interested in discussing a partnership opportunity between our organizations.',
			'I have a question about your pricing and would like to learn more about the options.',
		),
	),
);

// ─── Spam Templates ─────────────────────────────────────────────────────────

$spam_excerpts = array(
	'Buy cheap watches now!!! https://scam.example.com Limited offer!!! Act now!!!',
	'Earn $5000 per day working from home! Click here to start your journey now!!!',
	'Congratulations! You have been selected as the winner of our grand prize! Claim now!',
	'FREE iPhone giveaway!!! Limited time only!!! Enter now!!! Enter now!!!',
	'I can get your site to #1 on Google guaranteed! DM me for pricing...',
	'Make money fast! No experience needed! Start earning today!!! Visit my profile!!!',
	'You won a free vacation!!! Click here to claim your all-expenses-paid trip!!!',
	'Lose 30 pounds in 30 days with this one weird trick!!! Doctors hate this!!!',
	'Your computer has a virus!!! Call this number immediately for free support!!!',
	'Get rich quick with cryptocurrency!!! guaranteed returns!!! Invest now!!!',
	'Cheap medications online! No prescription needed!!! Discreet shipping!!!',
	'Exclusive deal just for you!!! 90% off everything!!! Today only!!! Limited stock!!!',
	'Your account has been compromised!!! Verify your details immediately!!!',
	'Hot girls in your area want to meet you!!! Click here to find love!!!',
	'Double your money in 24 hours!!! Proven system!!! Thousands of satisfied customers!!!',
);

$spam_titles = array(
	'!!! LIMITED TIME OFFER !!!',
	'You Won!!! Claim Your Prize!!!',
	'!!! ACT NOW !!! Exclusive Deal',
	'!!! URGENT: Account Alert !!!',
	'Make Money Fast!!! No Catch!!!',
	'!!! FREE Stuff Inside !!!',
	'Congratulations!!! You Are A Winner!!!',
	'!!! Dont Miss Out !!! 90% Off',
	'!!! Warning: Security Alert !!!',
	'Exclusive Opportunity!!! Apply Now!!!',
	'!!! Last Chance !!! Offer Ending',
	'!!! Verified: You Qualify !!!',
	'!!! Special Promotion !!!',
	'!!! Act Now Before Its Gone !!!',
	'!!! You Have Been Selected !!!',
);

// ─── Topic Keywords ─────────────────────────────────────────────────────────

$keywords = array(
	'WordPress', 'SEO', 'Content Marketing', 'Web Design', 'PHP',
	'JavaScript', 'React', 'CSS', 'Python', 'Data Science',
	'Machine Learning', 'AI', 'Blockchain', 'Cloud Computing', 'DevOps',
	'Digital Marketing', 'Social Media', 'Email Marketing', 'Analytics', 'UX Design',
	'Mobile Development', 'API Integration', 'Database Design', 'Security', 'Performance',
	'Open Source', 'E-commerce', 'SaaS', 'Startups', 'Remote Work',
);

// ─── Author Names ───────────────────────────────────────────────────────────

$authors = array();
for ( $i = 1; $i <= 50; $i++ ) {
	$authors[] = "user-{$i}";
}

$spam_authors = array( 'spammer-1', 'spammer-2', 'spammer-3', 'spammer-4', 'spammer-5' );

// ─── Helper: Pick a random item from an array ───────────────────────────────

function pick( array $arr ) {
	return $arr[ array_rand( $arr ) ];
}

function pick_n( array $arr, int $n ): array {
	$keys = array_rand( $arr, min( $n, count( $arr ) ) );
	if ( ! is_array( $keys ) ) {
		$keys = array( $keys );
	}
	$result = array();
	foreach ( $keys as $k ) {
		$result[] = $arr[ $k ];
	}
	return $result;
}

// ─── Helper: Generate a timestamp within the last N days ─────────────────────

function random_timestamp( int $max_days_ago = 30 ): string {
	$now    = time();
	$ago    = rand( 0, $max_days_ago * 86400 );
	$time   = $now - $ago;
	return gmdate( 'Y-m-d H:i:s', $time );
}

// ─── Helper: Random spam score ──────────────────────────────────────────────

function random_spam_score( bool $is_spam = false ): float {
	if ( $is_spam ) {
		return round( mt_rand( 7000, 9999 ) / 10000, 2 ); // 0.70 - 0.99
	}
	// Weighted towards lower scores for non-spam
	$roll = mt_rand( 0, 100 );
	if ( $roll < 40 ) {
		return round( mt_rand( 0, 999 ) / 10000, 2 ); // 0.00 - 0.09
	} elseif ( $roll < 70 ) {
		return round( mt_rand( 1000, 2999 ) / 10000, 2 ); // 0.10 - 0.29
	} elseif ( $roll < 90 ) {
		return round( mt_rand( 3000, 5999 ) / 10000, 2 ); // 0.30 - 0.59
	} else {
		return round( mt_rand( 6000, 8999 ) / 10000, 2 ); // 0.60 - 0.89
	}
}

// ─── Helper: Pick a realistic status with weighted distribution ─────────────

function pick_status(): string {
	$roll = mt_rand( 0, 100 );
	if ( $roll < 35 ) {
		return 'pending';
	} elseif ( $roll < 50 ) {
		return 'approved';
	} elseif ( $roll < 65 ) {
		return 'spam';
	} elseif ( $roll < 78 ) {
		return 'flagged';
	} elseif ( $roll < 88 ) {
		return 'rejected';
	} elseif ( $roll < 95 ) {
		return 'deferred';
	} else {
		return 'deactivated';
	}
}

// ─── Generate Queue Items ──────────────────────────────────────────────────

echo "Generating {$queue_count} queue items...\n";

$queue_values = array();
$queue_placeholders = array();
$queue_item_ids = array();

$content_type_keys = array_keys( $content_types );
$all_authors = array_merge( $authors, $spam_authors );

for ( $i = 1; $i <= $queue_count; $i++ ) {
	$content_type = pick( $content_type_keys );
	$template     = $content_types[ $content_type ];
	$keyword      = pick( $keywords );
	$year         = rand( 2024, 2026 );
	$is_spam      = $i > ( $queue_count - 50 ) || ( mt_rand( 0, 100 ) < 15 ); // Last 50 items + 15% random are spam

	if ( $is_spam ) {
		$title   = pick( $spam_titles );
		$excerpt = pick( $spam_excerpts );
		$author  = pick( $spam_authors );
		$status  = 'spam';
		$score   = random_spam_score( true );
	} else {
		$title_pattern = pick( $template['titles'] );
		$title   = sprintf( $title_pattern, $keyword, $year );
		$excerpt = pick( $template['excerpts'] );
		$author  = pick( $all_authors );
		$status  = pick_status();
		$score   = random_spam_score( false );
	}

	$item_id = "{$content_type}-seed-{$i}";
	$queue_item_ids[] = $item_id;
	$timestamp = random_timestamp( 60 );

	$queue_placeholders[] = '( %s, %s, %s, %f, %s, %s, %s, %s, %s )';
	$queue_values = array_merge( $queue_values, array(
		$item_id,
		$content_type,
		$status,
		$score,
		$author,
		$timestamp,
		$title,
		$excerpt,
		$timestamp, // created_at = same as date_gmt for seed data
	) );

	// Progress indicator
	if ( $i % 100 === 0 ) {
		echo "  ... {$i} items generated\n";
	}
}

echo "Inserting {$queue_count} queue items into database...\n";

$chunk_size = 50;
for ( $i = 0; $i < count( $queue_placeholders ); $i += $chunk_size ) {
	$chunk_placeholders = array_slice( $queue_placeholders, $i, $chunk_size );
	$chunk_values       = array_slice( $queue_values, $i * 9, $chunk_size * 9 );

	if ( empty( $chunk_placeholders ) ) {
		continue;
	}

	$sql = "INSERT INTO {$queue_table}
		( item_id, content_type, status, spam_score, author_id, date_gmt, title, excerpt, created_at )
		VALUES " . implode( ', ', $chunk_placeholders );

	$wpdb->query( $wpdb->prepare( $sql, $chunk_values ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

	if ( $wpdb->last_error ) {
		echo "  Error inserting chunk {$i}: {$wpdb->last_error}\n";
	}
}

echo "  Done! Total queue items: " . $wpdb->get_var( "SELECT COUNT(*) FROM {$queue_table}" ) . "\n\n";

// ─── Generate Activity Log ─────────────────────────────────────────────────

echo "Generating {$log_count} activity log entries...\n";

$actions           = array( 'approve', 'reject', 'spam', 'defer' );
$moderator_names   = array( 'admin', 'moderator-1', 'moderator-2', 'moderator-3', 'editor-1', 'editor-2' );
$action_notes      = array(
	'approve' => array(
		'Legitimate content',
		'Helpful contribution',
		'Approved by moderator',
		'Quality content',
		'No issues found',
		'Looks good',
		'Approved after review',
	),
	'reject' => array(
		'Violates community guidelines',
		'Inappropriate content',
		'Spam detected',
		'Offensive language',
		'Irrelevant content',
		'Duplicate submission',
		'Low quality content',
	),
	'spam' => array(
		'Spam detected by firewall',
		'Keyword match detected',
		'Suspicious links found',
		'Known spam pattern',
		'Excessive links detected',
		'Blacklisted keyword found',
		'Automated spam detection',
	),
	'defer' => array(
		'Pending senior moderator review',
		'Flagged for further investigation',
		'Needs second opinion',
		'Escalated to team lead',
		'Deferred for policy review',
	),
);

$log_values       = array();
$log_placeholders = array();

for ( $i = 1; $i <= $log_count; $i++ ) {
	$action      = pick( $actions );
	$moderator   = pick( $moderator_names );
	$item_id     = pick( $queue_item_ids );
	$content_type = explode( '-', $item_id )[0];
	$notes_array = $action_notes[ $action ];
	$notes       = pick( $notes_array );
	$prev_status = pick( array( 'pending', 'flagged', 'pending', 'pending', 'spam' ) );
	$new_status  = $action === 'approve' ? 'approved' : ( $action === 'reject' ? 'rejected' : ( $action === 'spam' ? 'spam' : 'deferred' ) );
	$item_title  = sprintf( 'Item %s', $item_id );
	$timestamp   = random_timestamp( 60 );

	$log_placeholders[] = '( %s, %s, %s, %s, %s, %s, %s, %s, %s )';
	$log_values = array_merge( $log_values, array(
		$moderator,
		$action,
		$content_type,
		$item_id,
		$item_title,
		$prev_status,
		$new_status,
		$notes,
		$timestamp,
	) );
}

echo "Inserting {$log_count} activity log entries into database...\n";

for ( $i = 0; $i < count( $log_placeholders ); $i += $chunk_size ) {
	$chunk_placeholders = array_slice( $log_placeholders, $i, $chunk_size );
	$chunk_values       = array_slice( $log_values, $i * 9, $chunk_size * 9 );

	if ( empty( $chunk_placeholders ) ) {
		continue;
	}

	$sql = "INSERT INTO {$log_table}
		( moderator_id, action, content_type, item_id, item_title, previous_status, new_status, notes, timestamp )
		VALUES " . implode( ', ', $chunk_placeholders );

	$wpdb->query( $wpdb->prepare( $sql, $chunk_values ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

	if ( $wpdb->last_error ) {
		echo "  Error inserting chunk {$i}: {$wpdb->last_error}\n";
	}
}

echo "  Done! Total log entries: " . $wpdb->get_var( "SELECT COUNT(*) FROM {$log_table}" ) . "\n\n";

// ─── Summary ────────────────────────────────────────────────────────────────

echo "=== SEED DATA SUMMARY ===\n";
echo "Queue table:     " . $wpdb->get_var( "SELECT COUNT(*) FROM {$queue_table}" ) . " items\n";

$status_counts = $wpdb->get_results( "SELECT status, COUNT(*) as c FROM {$queue_table} GROUP BY status ORDER BY c DESC" );
foreach ( $status_counts as $row ) {
	echo "  {$row->status}: {$row->c}\n";
}

echo "\nActivity log:    " . $wpdb->get_var( "SELECT COUNT(*) FROM {$log_table}" ) . " entries\n";

$action_counts = $wpdb->get_results( "SELECT action, COUNT(*) as c FROM {$log_table} GROUP BY action ORDER BY c DESC" );
foreach ( $action_counts as $row ) {
	echo "  {$row->action}: {$row->c}\n";
}

echo "\nSeed complete!\n";
