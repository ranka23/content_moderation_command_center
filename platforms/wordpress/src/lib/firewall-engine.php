<?php
/**
 * CMCC PHP Firewall Engine
 *
 * Server-side port of the TypeScript firewall rule engine from @cmcc/core.
 * Evaluates content against spam firewall rules at the PHP level before
 * items are inserted into the queue, providing real-time protection.
 *
 * Corresponds to Section 9 (F2): Real Spam Firewall (PHP)
 *
 * @package CMCC
 */

defined( 'ABSPATH' ) || exit;

/**
 * Evaluate all firewall rules against the given content.
 *
 * This is the main entry point for server-side firewall evaluation.
 * It checks link counts, blacklisted keywords, author reputation, and more.
 *
 * @param string $content  The content to evaluate.
 * @param array  $options  Firewall rule options.
 * @param array  $context  Context about the author/content (IP, email, etc.).
 * @return array {
 *     Firewall evaluation result.
 *
 *     @type bool   $triggered Whether any rule was triggered.
 *     @type string $action    The action to take ('flag', 'spam', 'discard').
 *     @type string $reason    Human-readable reason.
 *     @type string $rule_name The name of the triggered rule.
 * }
 */
function cmcc_evaluate_firewall_rules( string $content, array $options = array(), array $context = array() ): array {
    $max_links              = isset( $options['max_links'] ) ? (int) $options['max_links'] : 5;
    $blacklisted_keywords   = isset( $options['blacklisted_keywords'] ) ? $options['blacklisted_keywords'] : '';
    $blacklisted_domains    = isset( $options['blacklisted_email_domains'] ) ? $options['blacklisted_email_domains'] : '';
    $min_submit_time        = isset( $options['min_submit_time'] ) ? (int) $options['min_submit_time'] : 3;
    $global_action          = isset( $options['global_action'] ) ? $options['global_action'] : 'flag';

    $author_ip    = isset( $context['author_ip'] ) ? $context['author_ip'] : '';
    $author_email = isset( $context['author_email'] ) ? $context['author_email'] : '';

    // 1. Check link count
    $link_count = cmcc_count_links( $content );
    if ( $link_count > $max_links ) {
        return array(
            'triggered' => true,
            'action'    => $global_action,
            'reason'    => sprintf(
                'Content contains %d links (max allowed: %d)',
                $link_count,
                $max_links
            ),
            'rule_name' => 'maxLinks',
        );
    }

    // 2. Check blacklisted keywords
    $keyword_result = cmcc_check_blacklisted_keywords( $content, $blacklisted_keywords );
    if ( $keyword_result['triggered'] ) {
        return array(
            'triggered' => true,
            'action'    => 'spam',
            'reason'    => sprintf(
                'Content contains blacklisted keyword: "%s"',
                $keyword_result['matched_keyword']
            ),
            'rule_name' => 'blacklistedKeywords',
        );
    }

    // 3. Check blacklisted email domains
    if ( '' !== $author_email ) {
        $domain_result = cmcc_check_blacklisted_email_domain( $author_email, $blacklisted_domains );
        if ( $domain_result['triggered'] ) {
            return array(
                'triggered' => true,
                'action'    => 'spam',
                'reason'    => sprintf(
                    'Author email domain is blacklisted: %s',
                    $domain_result['matched_domain']
                ),
                'rule_name' => 'blacklistedEmailDomains',
            );
        }
    }

    // 4. Check if content is mostly ALL CAPS (spam indicator)
    $all_caps_ratio = cmcc_check_all_caps( $content );
    if ( $all_caps_ratio > 0.7 ) {
        return array(
            'triggered' => true,
            'action'    => 'flag',
            'reason'    => sprintf(
                'Content is %.0f%% uppercase (potential spam)',
                $all_caps_ratio * 100
            ),
            'rule_name' => 'allCapsSpam',
        );
    }

    // 5. Check for excessive URL shorteners
    $shortener_count = cmcc_count_shortened_urls( $content );
    if ( $shortener_count > 0 ) {
        return array(
            'triggered' => true,
            'action'    => 'flag',
            'reason'    => sprintf(
                'Content contains %d shortened URLs',
                $shortener_count
            ),
            'rule_name' => 'shortenedUrls',
        );
    }

    // No rules triggered
    return array(
        'triggered' => false,
        'action'    => '',
        'reason'    => '',
        'rule_name' => '',
    );
}

/**
 * Count the number of HTTP/HTTPS links in content.
 *
 * @param string $content The content to check.
 * @return int Number of links found.
 */
function cmcc_count_links( string $content ): int {
    preg_match_all( '/https?:\/\/[^\s]+/i', $content, $matches );
    return count( $matches[0] );
}

/**
 * Check content for blacklisted keywords (one per line in settings).
 *
 * Supports:
 * - Wildcard patterns: *keyword*, keyword*, *keyword
 * - Regex patterns: /pattern/i (forward-slash delimited, uses preg_match)
 * - Plain text: simple str_contains match (backward compatible)
 *
 * Words like "spam" or "buy" used in legitimate context (e.g. "spam detection",
 * "buy now" button) can cause false positives with plain-text matching.
 * Use regex patterns with word boundaries to avoid this, e.g.:
 *   /\bspam\b/i   — matches "spam" as a whole word only
 *   /\bbuy\s+now\b/i — matches "buy now" as a phrase
 *
 * @param string $content         The content to check.
 * @param string $keywords_text   Newline-separated list of keywords.
 * @return array Result with 'triggered' and 'matched_keyword' keys.
 */
function cmcc_check_blacklisted_keywords( string $content, string $keywords_text ): array {
    if ( '' === trim( $keywords_text ) ) {
        return array( 'triggered' => false, 'matched_keyword' => null );
    }

    $keywords = explode( "\n", $keywords_text );
    $lower_content = mb_strtolower( $content );

    foreach ( $keywords as $keyword ) {
        $keyword = trim( $keyword );
        if ( '' === $keyword ) {
            continue;
        }

        // ── Regex pattern (e.g., /pattern/i) ───────────────────────────────
        if ( preg_match( '/^\/(.+)\/[a-z]*$/i', $keyword, $regex_matches ) ) {
            $pattern = '/' . $regex_matches[1] . '/';
            // Ensure the pattern has delimiters; if not, wrap it
            if ( @preg_match( $pattern, '' ) === false ) {
                // Invalid regex — skip this keyword silently
                continue;
            }
            if ( @preg_match( $pattern, $content ) ) {
                return array( 'triggered' => true, 'matched_keyword' => $keyword );
            }
            continue;
        }

        $lower_keyword = mb_strtolower( $keyword );

        // Wildcard matching
        if ( str_starts_with( $lower_keyword, '*' ) && str_ends_with( $lower_keyword, '*' ) ) {
            // *keyword* - contains
            $check = substr( $lower_keyword, 1, -1 );
            if ( str_contains( $lower_content, $check ) ) {
                return array( 'triggered' => true, 'matched_keyword' => $keyword );
            }
        } elseif ( str_ends_with( $lower_keyword, '*' ) ) {
            // keyword* - starts with
            $check = substr( $lower_keyword, 0, -1 );
            if ( str_starts_with( $lower_content, $check ) ) {
                return array( 'triggered' => true, 'matched_keyword' => $keyword );
            }
        } elseif ( str_starts_with( $lower_keyword, '*' ) ) {
            // *keyword - ends with
            $check = substr( $lower_keyword, 1 );
            if ( str_ends_with( $lower_content, $check ) ) {
                return array( 'triggered' => true, 'matched_keyword' => $keyword );
            }
        } else {
            // Plain text — contains match (backward compatible)
            if ( str_contains( $lower_content, $lower_keyword ) ) {
                return array( 'triggered' => true, 'matched_keyword' => $keyword );
            }
        }
    }

    return array( 'triggered' => false, 'matched_keyword' => null );
}

/**
 * Check if the author's email domain is blacklisted.
 *
 * @param string $email         The author's email address.
 * @param string $domains_text  Newline-separated list of blacklisted domains.
 * @return array Result with 'triggered' and 'matched_domain' keys.
 */
function cmcc_check_blacklisted_email_domain( string $email, string $domains_text ): array {
    if ( '' === trim( $domains_text ) || '' === $email ) {
        return array( 'triggered' => false, 'matched_domain' => null );
    }

    $parts = explode( '@', $email );
    $domain = isset( $parts[1] ) ? mb_strtolower( trim( $parts[1] ) ) : '';
    if ( '' === $domain ) {
        return array( 'triggered' => false, 'matched_domain' => null );
    }

    $domains = explode( "\n", $domains_text );
    foreach ( $domains as $blacklisted ) {
        $blacklisted = mb_strtolower( trim( $blacklisted ) );
        if ( '' === $blacklisted ) {
            continue;
        }
        if ( $domain === $blacklisted ) {
            return array( 'triggered' => true, 'matched_domain' => $blacklisted );
        }
    }

    return array( 'triggered' => false, 'matched_domain' => null );
}

/**
 * Calculate the ratio of uppercase characters in content.
 *
 * @param string $content The content to check.
 * @return float Ratio of uppercase letters (0.0 to 1.0).
 */
function cmcc_check_all_caps( string $content ): float {
    $letters = preg_replace( '/[^a-zA-Z]/', '', $content );
    if ( '' === $letters ) {
        return 0.0;
    }
    $upper = preg_replace( '/[^A-Z]/', '', $content );
    return mb_strlen( $upper ) / mb_strlen( $letters );
}

/**
 * Count shortened URLs in content.
 *
 * @param string $content The content to check.
 * @return int Number of shortened URLs found.
 */
function cmcc_count_shortened_urls( string $content ): int {
    $shorteners = array(
        'bit\.ly',
        'tinyurl\.com',
        't\.co',
        'goo\.gl',
        'ow\.ly',
        'is\.gd',
        'buff\.ly',
        'short\.link',
        'rb\.gy',
        'cutt\.ly',
    );

    $pattern = '/https?:\/\/(?:' . implode( '|', $shorteners ) . ')\/[^\s]+/i';
    preg_match_all( $pattern, $content, $matches );
    return count( $matches[0] );
}
