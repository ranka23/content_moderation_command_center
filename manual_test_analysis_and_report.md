# CMCC (Content Moderation Command Center) — Manual Test Analysis & Report

**Date:** 2026-06-06
**Environment:** WordPress 6.7.2 (PHP 8.2 + Apache) @ http://localhost:8080
**Plugin Version:** 1.0.0
**Tester:** Automated Manual Testing via Zed Agent

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Methodology](#2-methodology)
3. [Test Results by Feature](#3-test-results-by-feature)
4. [Bugs Found](#4-bugs-found)
5. [Functional Issues](#5-functional-issues)
6. [Broken / Incomplete UI](#6-broken--incomplete-ui)
7. [Inconsistent UI / UX Problems](#7-inconsistent-ui--ux-problems)
8. [Design Analysis & Recommendations](#8-design-analysis--recommendations)
9. [Missing Features & Enhancements](#9-missing-features--enhancements)
10. [Proposed New Features](#10-proposed-new-features)
11. [Charts, Analytics & Visual Aids](#11-charts-analytics--visual-aids)
12. [Auto Moderation Improvements](#12-auto-moderation-improvements)
13. [Settings & Configuration Enhancements](#13-settings--configuration-enhancements)
14. [Security Audit Notes](#14-security-audit-notes)
15. [Priority Recommendations](#15-priority-recommendations)

---

## 1. Executive Summary

CMCC is a well-architected monorepo with a solid foundation. The shared packages (`@cmcc/core` and `@cmcc/ui`) contain well-designed, modular code. The WordPress plugin integrates properly into the WP admin, registers REST API endpoints, and provides a React-based UI.

**Overall Maturity: Early Beta (Score: 2.8/5)**

| Area | Rating | Notes |
|------|--------|-------|
| PHP Backend API | 🟢 Solid | REST endpoints work correctly, good error handling |
| Data Layer (DB) | 🟢 Good | Proper table creation, sanitization, prepared statements |
| TypeScript Core | 🟢 Solid | Well-modularized, comprehensive functionality |
| React UI Components | 🟡 Needs Work | Components exist but have significant UI/UX issues |
| Front-End Integration | 🔴 Broken | React data model mismatch between API (PHP `snake_case`) and UI (React `camelCase`) |
| UI/UX Design | 🟡 Basic | Functional but unpolished, missing modern design patterns |
| Testing | 🔴 Poor | Minimal test coverage across all packages |
| Error Handling (API) | 🟢 Good | Proper HTTP codes, messages, input validation |
| Error Handling (UI) | 🟡 Partial | Limited user-facing error feedback |

---

## 2. Methodology

All testing was performed against the live WordPress Docker instance at http://localhost:8080:

1. **API Testing:** cURL-based testing of all REST API endpoints including success paths, error cases, edge cases, and invalid inputs
2. **Data Validation:** Verification of response formats, status codes, sanitization, and data integrity
3. **Code Review:** Static analysis of all PHP, TypeScript/React, and CSS source files
4. **Front-End Analysis:** Examination of HTML output, script/style loading, React component structure, and CSS styling
5. **Integration Testing:** End-to-end verification of the plugin activation, admin menu, REST API, and React app mounting

---

## 3. Test Results by Feature

### 3.1 Plugin Activation & Deactivation

| Test Case | Status | Notes |
|-----------|--------|-------|
| Plugin activation creates DB tables | ✅ PASS | `cmcc_queue` and `cmcc_activity_log` tables created |
| Default settings created | ✅ PASS | `cmcc_settings` option with defaults |
| Version tracking | ✅ PASS | `cmcc_version` option stores "1.0.0" |
| Deactivation flushes rewrites | ✅ PASS | `flush_rewrite_rules()` called |
| Uninstall drops tables & options | ✅ PASS | `uninstall.php` properly cleans up |
| Reactivation preserves data | ✅ PASS | `IF NOT EXISTS` prevents data loss |

### 3.2 Admin Menu Integration

| Test Case | Status | Notes |
|-----------|--------|-------|
| Main menu item "CMCC" | ✅ PASS | Visible at admin menu position 30 with SVG icon |
| Submenu: Queue | ✅ PASS | Links to `admin.php?page=cmcc` |
| Submenu: Analytics | ✅ PASS | Links to `admin.php?page=cmcc-analytics` |
| Submenu: Settings | ✅ PASS | Links to `admin.php?page=cmcc-settings` |
| Menu icon renders | ✅ PASS | Base64-encoded SVG checkmark icon |
| Capability check | ✅ PASS | `manage_options` enforced throughout |
| Initial tab mapping | ✅ PASS | Pages map correctly to tabs (cmcc→queue, cmcc-analytics→analytics, cmcc-settings→settings) |

### 3.3 Moderation Queue (REST API)

| Test Case | Status | Notes |
|-----------|--------|-------|
| GET /queue (all items) | ✅ PASS | Returns all items with correct structure |
| GET /queue?status=spam | ✅ PASS | Filters correctly by status |
| GET /queue?content_type=post | ✅ PASS | Filters correctly by content type |
| GET /queue?search=garden | ✅ PASS | Searches title and excerpt |
| GET /queue?page=1&per_page=5 | ✅ PASS | Pagination works correctly with `total_pages` |
| POST /queue/:id/action (approve) | ✅ PASS | Status changes to 'approved', logged |
| POST /queue/:id/action (reject) | ✅ PASS | Status changes to 'rejected', logged |
| POST /queue/:id/action (spam) | ✅ PASS | Status changes to 'spam', logged |
| POST /queue/:id/action (defer) | ✅ PASS | Status changes to 'deferred', logged |
| POST /queue/bulk-action (approve-all) | ✅ PASS | Bulk status update works |
| POST /queue/bulk-action (move-to-trash) | ✅ PASS | Bulk status update works |
| POST /queue/bulk-action (mark-as-spam) | ✅ PASS | Bulk status update works |
| POST /queue/bulk-action (deactivate-users) | ⚠️ PASS | **Does NOT actually deactivate WP users** — only sets status='deactivated' in queue table |
| POST /queue/bulk-action (export-csv) | ✅ PASS | Returns CSV data with items and format key |
| **Invalid action type** | ✅ PASS | Returns 400 with "Invalid action." |
| **Non-existent item ID** | ✅ PASS | Returns 404 with "Queue item not found." |
| **Missing action parameter** | ✅ PASS | Returns 400 with "Invalid action." |
| **Empty ID in URL** | ✅ PASS | Returns 404 (no route matched) |
| **Bulk action with empty IDs** | ✅ PASS | Returns 400 with "No items selected." |
| **Invalid bulk action** | ✅ PASS | Returns 400 with "Invalid bulk action." |

### 3.4 Analytics Dashboard (REST API)

| Test Case | Status | Notes |
|-----------|--------|-------|
| GET /analytics | ✅ PASS | Returns queue_stats, content_type_breakdown, spam_ratio, activity_summary |
| Queue stats aggregation | ✅ PASS | Pending, spam, flagged, approved, rejected, total all counted correctly |
| Content type breakdown | ✅ PASS | Groups by content_type with count and percentage |
| Spam ratio calculation | ✅ PASS | Ratio and percentage computed correctly |
| Activity summary (30 days) | ✅ PASS | Total actions, approvals, rejections, spam actions |

### 3.5 Activity Log (REST API)

| Test Case | Status | Notes |
|-----------|--------|-------|
| GET /activity-log | ✅ PASS | Returns paginated log entries |
| Pagination with page/per_page | ✅ PASS | Works correctly with total_pages |
| Action filter | ✅ PASS | Filters by action type |
| **Edge: empty log** | ✅ PASS | Returns empty items array |

### 3.6 Settings Management (REST API)

| Test Case | Status | Notes |
|-----------|--------|-------|
| GET /settings | ✅ PASS | Returns current settings |
| POST /settings (update all) | ✅ PASS | Updates and merges correctly |
| POST /settings (partial update) | ✅ PASS | Partial updates merge with existing |
| POST /settings boolean handling | ✅ PASS | Booleans are properly cast |
| POST /settings integer handling | ✅ PASS | Integers are properly cast |
| **Invalid JSON body** | ✅ PASS | Returns 400 with `rest_invalid_json` |
| **No permission (no auth)** | ✅ PASS | Returns 401 |

### 3.7 Front-End React App (UI Layer)

| Test Case | Status | Notes |
|-----------|--------|-------|
| React app mounting | ✅ PASS | `<div id="cmcc-app">` present on all admin pages |
| Script loading | ✅ PASS | `cmcc-app.js` loaded with cache-busting version |
| CSS loading | ✅ PASS | `cmcc-app.css` loaded |
| WordPress dependencies loading | ✅ PASS | React 18, ReactDOM, wp-api, wp-element, etc. all enqueued |
| cmccData localisation | ✅ PASS | restUrl, nonce, userId, adminUrl, pluginUrl, initialTab all passed correctly |
| Tab navigation | ✅ PASS | Queue, Analytics, Activity Log, Settings tabs rendered |
| **Data model mismatch** | 🔴 BROKEN | **PHP API returns `snake_case` fields (item_id, content_type, spam_score, author_id, date_gmt, created_at) but QueueTable component expects `camelCase` fields (contentType, originalId, spamScore, authorId, dateGmt)** |
| **Spam score type mismatch** | 🔴 BROKEN | PHP returns `spam_score` as string "0.05", QueueTable processes it via `toFixed(1)` which will work, but type mismatch may cause sorting issues |
| **Status enum mismatch** | 🔴 BROKEN | PHP returns statuses like 'approved', 'rejected', 'deferred' but QueueItem type only defines 'pending', 'spam', 'flagged' |
| Notification badge in tab | ⚠️ PARTIAL | Badge shows `queueStats.pending` count but initial load may show 0 until data fetched |
| Settings form rendering | ⚠️ PARTIAL | Works but has inline styles that don't match WP admin theme |

### 3.8 Firewall Rule Engine

| Test Case | Status | Notes |
|-----------|--------|-------|
| Link count check | ✅ PASS | Correctly detects excessive links |
| Blacklisted keywords (exact) | ✅ PASS | Matches exact keywords |
| Blacklisted keywords (wildcard *) | ✅ PASS | Supports prefix, suffix, and contains wildcards |
| Blacklisted IP (exact) | ✅ PASS | Exact match works |
| Blacklisted IP (CIDR) | ✅ PASS | CIDR range matching works |
| Blacklisted email domain | ✅ PASS | Domain extraction and matching works |
| Blocked country | ✅ PASS | ISO code matching works |
| Submit time check | ✅ PASS | Honeypot time check works |
| Duplicate content (simhash) | ✅ PASS | 64-bit simhash + Hamming distance implementation |
| Rule evaluation order | ✅ PASS | Correct priority: links > keywords > IP > email > country > submit time > duplicate |
| Action resolution (ruleActions > globalAction > default) | ✅ PASS | Priority chain works correctly |

### 3.9 Reputation System

| Test Case | Status | Notes |
|-----------|--------|-------|
| Reputation score calculation | ✅ PASS | Approve increases, reject/spam decreases |
| Score decay over time | ✅ PASS | Exponential decay based on inactivity |
| Risk level classification | ✅ PASS | Critical > high > medium > low |
| Breach frequency calculation | ✅ PASS | Breaches per day computed correctly |
| In-memory adapter | ✅ PASS | Storage adapter pattern works |

### 3.10 Concurrency Control

| Test Case | Status | Notes |
|-----------|--------|-------|
| Lock acquisition | ✅ PASS | First moderator gets the lock |
| Lock rejection | ✅ PASS | Second moderator rejected |
| Same moderator re-acquires | ✅ PASS | Extends the existing lock |
| Lock release (by owner) | ✅ PASS | Only lock owner can release |
| Lock release (wrong moderator) | ✅ PASS | Returns false |
| Force release (admin override) | ✅ PASS | Force unlock works |
| Expired lock cleanup | ✅ PASS | Automatic cleanup by interval |
| Statistics tracking | ✅ PASS | Acquisitions, releases, rejections, timeouts tracked |

---

## 4. Bugs Found

### B1 — CRITICAL: Data Model Mismatch Between API and QueueTable Component

- **Location:** `QueueTable.tsx` vs `cmcc.php` REST response
- **Description:** The PHP REST API returns all fields in `snake_case` (`item_id`, `content_type`, `spam_score`, `author_id`, `date_gmt`, `created_at`), but the `QueueTable` component props interface expects `camelCase` fields (`id`, `contentType`, `originalId`, `status`, `spamScore`, `authorId`, `dateGmt`, `title`, `excerpt`).
- **Impact:** The queue table renders empty even when the API returns data. No items will display in the queue, making the primary feature non-functional.
- **Severity:** 🔴 CRITICAL

### B2 — CRITICAL: Status Enum Mismatch

- **Location:** `QueueTable.tsx` Line 4-8, PHP REST responses
- **Description:** `QueueItem.status` type only defines `'pending' | 'spam' | 'flagged'`, but the PHP backend also returns `'approved'`, `'rejected'`, `'deferred'`, and `'deactivated'` statuses. The `getStatusConfig()` helper will fall back to 'pending' styling for any unknown status, silently misrepresenting approved/rejected items.
- **Impact:** Approved and rejected items show as "Pending" (yellow) instead of their correct status coloring.
- **Severity:** 🔴 CRITICAL

### B3 — HIGH: Activity Log Action Enum Mismatch

- **Location:** `cmcc.php` REST action definition vs seeded data
- **Description:** The REST API only allows `['approve', 'reject', 'spam', 'defer']` as valid actions, but the seeded data in the activity log contains actions like `'marked_as_spam'`, `'flagged'`, `'approved'`. When filtering activity log by action, these seed action types won't match.
- **Severity:** 🟠 HIGH

### B4 — HIGH: `deactivate-users` Bulk Action Doesn't Actually Deactivate Users

- **Location:** `cmcc_rest_bulk_action()` in `cmcc.php`
- **Description:** The "Deactivate User Accounts" bulk action only sets the queue item status to `'deactivated'` in the `cmcc_queue` table. It does NOT actually disable the user's WordPress account or revoke capabilities.
- **Impact:** Misleading functionality — moderators think users are deactivated when they're not.
- **Severity:** 🟠 HIGH

### B5 — MEDIUM: Rest Nonce Extraction in App.jsx May Fail

- **Location:** `App.jsx` line 34
- **Description:** The `cmccData.nonce` is extracted from the PHP-localized script. If the nonce has already been used (WordPress nonces have a 12-hour half-life and tick-based rotation), subsequent API calls will fail with `rest_cookie_invalid_nonce`. There's no nonce refresh/renewal mechanism in the React app.
- **Impact:** After 12 hours or after certain admin operations, the app silently fails with console errors only.
- **Severity:** 🟡 MEDIUM

### B6 — MEDIUM: No Loading State Separation

- **Location:** `App.jsx` Line 63 (`isLoading` shared state)
- **Description:** A single `isLoading` state is shared across Queue, Activity Log, and any other data fetching. When switching tabs, the loading state from one tab can bleed into another.
- **Severity:** 🟡 MEDIUM

### B7 — MEDIUM: Queue Pagination Relies on `useState` Setter Without `useEffect`

- **Location:** `App.jsx` Lines 436-457
- **Description:** The "Previous" and "Next" pagination buttons call `setQueuePage` directly, but `fetchQueue` only runs via the `useEffect` on mount. When the page changes, the `useEffect` dependency array is `[fetchQueue, queuePage]`, but `fetchQueue` is wrapped in `useCallback` with `[filters]` dependency. The tab change handler manually calls `fetchQueue`, but pagination buttons rely on the automatic effect which may have stale closures.
- **Severity:** 🟡 MEDIUM

---

## 5. Functional Issues

### F1 — Missing Seed Data Integration

The plugin creates tables on activation but provides no mechanism for populating the queue with real WordPress content. Comments, posts, and other user-generated content from WordPress are not automatically fed into the CMCC queue. The current test data appears to be manually inserted. Without a WordPress hook integration (`wp_insert_comment`, `save_post`, etc.), the CMCC queue remains empty in production.

### F2 — Auto Moderation Not Wired to Real Content

The `auto_moderate` setting exists in the UI and the core firewall engine exists in `@cmcc/core`, but there is no bridge between the WordPress plugin and the TypeScript core engine. The firewall rules cannot be applied to incoming WordPress content because:

1. The TypeScript core is client-side only (bundled in the React app)
2. The PHP backend doesn't implement the firewall rules natively
3. There's no server-side rule evaluation for incoming comments/posts

### F3 — No Integration with WordPress Hooks

The plugin doesn't hook into WordPress's `wp_insert_comment`, `save_post`, `comment_post`, or any other content creation hooks. Queue items must be manually added via the REST API or direct DB insertion.

### F4 — `export-csv` Returns JSON Not CSV

The bulk "Export to CSV" action returns a JSON response with a `format: "csv"` key, but it doesn't actually convert the data to CSV format. The front-end has no handler to download or process this data.

### F5 — Analytics 30-Day Activity Summary Counts Inconsistency

The `activity_summary.total_actions` is `COUNT(*)` from the activity log, but `approvals + rejections + spam_actions` only sum specific action types. If actions like `defer`, `flagged`, `marked_as_spam` exist, `total_actions` will be higher than the sum of the three specific counts, which is confusing.

---

## 6. Broken / Incomplete UI

### U1 — Queue Table Renders Empty (Due to B1)

Because the QueueTable expects `camelCase` fields but receives `snake_case` from the PHP API, no items display. The component shows "No items match your filters." even when the API returns items.

### U2 — Filters Are Read-Only Text, Not Actual Inputs

The filter controls in QueueTable (`cmcc-queue-filters`) just display text like "Content Type: all" instead of actual dropdown/input elements. The `onFilterChange` prop is renamed to `_onFilterChange` (underscore-prefixed) indicating it's intentionally unused.

### U3 — Bulk Action "Apply" Button is Non-Functional

The "Apply" button next to the bulk action dropdown has an empty onClick handler (`{/* Apply would be handled by onChange in this simple version */}`). The bulk action is applied immediately on `<select>` change without user confirmation.

### U4 — Refresh Button is Non-Functional

The "Refresh" button in the queue header has an empty onClick handler (`{/* Refresh handler */}`).

### U5 — Checkbox Selection is Non-Functional

Both the "select all" checkbox and individual row checkboxes have no onChange handlers. They cannot actually select items for bulk actions.

### U6 — Activity Log Tab: Moderator Shows User ID Not Display Name

The activity log displays `entry.moderator_id` directly (numeric ID) instead of the moderator's display name. The `cmccData.userDisplay` is available but not used for the current user, and other moderators' names aren't resolved.

### U7 — Settings Form Uses Inline Styles Inconsistently

The SettingsForm component uses a mix of React `style` objects and CSS classes. Some elements have WP-admin-compatible classes, while others hardcode colors and sizes that don't match the WordPress admin theme.

### U8 — No Success/Error Toast Notifications After Actions

When a moderator approves/rejects/spams an item, there's no visual feedback. The UI silently refreshes the queue. If the API call fails, the error is only logged to the console.

### U9 — Activity Heatmap Always Shows Empty Data

The heatmap chart initializes with all zeros and there's no mechanism to populate it with real activity data from the analytics API.

---

## 7. Inconsistent UI / UX Problems

### UX1 — Tab Navigation Doesn't Show Active State on Submenu Items

When navigating to Analytics or Settings via the WP admin submenu, the WordPress admin menu correctly highlights "CMCC" but the submenu items don't sync with the React tab state.

### UX2 — Bulk Action Naming Inconsistency

- `approve-all` → works but name is misleading (doesn't approve ALL items, only selected)
- `move-to-trash` → sets status to `rejected`, not actually moved to WordPress trash
- `deactivate-users` → doesn't deactivate users at all

### UX3 — Activity Log Action Names Inconsistent

The seeded data uses a mix of action names:
- `approve`, `reject`, `spam`, `defer` (REST API format)
- `approved` (past tense)
- `marked_as_spam` (snake_case)
- `flagged` (different wording)

### UX4 — Pagination Text Overlaps Buttons on Mobile

The responsive CSS hides certain columns at <600px but doesn't adjust the pagination controls, which can overlap on narrow screens.

### UX5 — Settings Validation `validators` Prop is Empty Object

The `SettingsForm` is created with `validators={{}}` (line 632 of App.jsx), meaning no field validation runs on save.

---

## 8. Design Analysis & Recommendations

### Current Design Assessment

The plugin uses WordPress admin styles with reasonable scoping (`#cmcc-app` prefix) and follows WP admin conventions. However, the design can be significantly improved:

**What's Working:**
- Tab navigation is clean and follows WP conventions
- Stats cards (grid layout) are well-executed
- Color-coded status badges and action buttons
- Responsive breakpoints for mobile
- Heatmap chart is visually functional
- Activity log table is clean and readable

**What Needs Improvement:**
- Overall visual design is utilitarian and lacks modern polish
- No use of WordPress's `@wordpress/components` design system
- Settings form doesn't match WP admin style for inputs/buttons
- Queue table doesn't use the familiar WP list table pattern
- No data visualization beyond basic tables and a heatmap
- Empty states are plain text with no illustrations
- No onboarding or tutorial for first-time users
- No dark mode support

### Design Modernization Recommendations

1. **Adopt WordPress Components** — Use `@wordpress/components` (Card, Button, SelectControl, TextControl, ToggleControl, Modal, Notice) instead of raw HTML elements. This provides instant consistency with WP admin.

2. **Implement a Design System** — Create a cohesive design language:
   - Consistent spacing scale (4px base)
   - Color palette based on WP admin blues `#007cba`, `#2271b1`
   - Typography hierarchy
   - Elevation/shadow system for cards and modals

3. **Modern UI Patterns:**
   - **Slide-out panel** for item details instead of inline expansion
   - **Batch action confirmation modals** with undo support
   - **Inline editing** for quick status changes
   - **Drag-and-drop** queue reordering
   - **Infinite scroll** instead of traditional pagination
   - **Real-time updates** via WordPress Heartbeat API

4. **States & Feedback:**
   - **Skeleton loaders** instead of plain text loading messages
   - **Toast notifications** for all actions (success/error)
   - **Optimistic UI updates** for faster perceived performance
   - **Progress indicators** for bulk operations

5. **Data Dense Layouts:**
   - **Mini charts** (sparklines) inline in the queue table
   - **Togglable columns** in the queue table
   - **Quick-filter bar** with preset filters (Last hour, Today, This week)
   - **Saved filters** for frequent moderation workflows

---

## 9. Missing Features

### Core Moderation Features Missing

| Feature | Priority | Description |
|---------|----------|-------------|
| WordPress Content Hook Integration | 🔴 Critical | Hook into `comment_post`, `wp_insert_comment`, `save_post`, `wp_insert_post` to auto-populate queue |
| Real Spam Firewall (PHP) | 🔴 Critical | Port the TypeScript firewall rules to PHP for server-side evaluation |
| User Management | 🟠 High | View user profiles, reputation history, action log per user |
| Content Detail View | 🟠 High | Click to expand/review full content without leaving the queue |
| Email Notifications | 🟠 High | Working notification system for moderators |
| History Timeline per Item | 🟡 Medium | Show all actions taken on a single queue item |
| Bulk Edit Tools | 🟡 Medium | Bulk approve/reject with notes and reasons |
| Export/Import | 🟡 Medium | CSV/JSON export full implementation, batch import |
| Keyboard Shortcuts | 🟡 Medium | `a`=approve, `r`=reject, `s`=spam for power users |
| Multi-Site Support | 🟡 Medium | WordPress Multisite network-wide moderation |

---

## 10. Proposed New Features

### 10.1 Advanced Queue Management

- **Smart Queues** — Auto-sort by spam score, priority, content type
- **Saved Filters & Views** — Moderators can save custom filter combinations
- **Assignment System** — Assign items to specific moderators
- **SLA/Deadline Tracking** — Set response time targets for moderation
- **Escalation Workflow** — Auto-escalate items that exceed spam score threshold or go unreviewed for too long

### 10.2 AI-Powered Moderation

- **AI Spam Scoring** — Integrate with OpenAI/Claude/local ML models for intelligent content classification
- **Language Detection** — Detect and flag content in unsupported languages
- **Sentiment Analysis** — Flag excessively negative/toxic content
- **Image Moderation** — Scan uploaded images for inappropriate content via AI vision APIs
- **Pattern Learning** — Learn from moderator actions to improve auto-classification over time

### 10.3 User Reputation Dashboard

- **User List** — Searchable, filterable list of all users with reputation scores
- **Reputation History** — Timeline of reputation changes per user
- **Trust Levels** — Auto-assign trust levels (New, Regular, Trusted, Verified) based on history
- **Shadow Ban** — Silently discard content from problematic users without notifying them
- **Allow/Block Lists** — Manual override for specific users

### 10.4 Reporting & Compliance

- **Moderation Reports** — PDF/CSV export of moderation activity for compliance
- **Moderator Performance Analytics** — Track approval rates, response times, accuracy
- **Content Type Audits** — Generate reports by content type over custom date ranges
- **Compliance Logs** — Full audit trail with IP addresses, timestamps, and moderator notes
- **Scheduled Reports** — Auto-generate and email reports weekly/monthly

### 10.5 Multi-Platform Hub

- **Cross-Platform Queue** — View content from all connected platforms in one queue
- **Synced Settings** — Propagate spam firewall rules across all platforms
- **Unified Analytics** — Aggregate analytics across WordPress, Strapi, Storyblok, Wix, Shopify
- **Central Dashboard** — Overview of all connected platforms with health status

### 10.6 Collaboration Features

- **Moderation Notes** — Internal notes on items shared between moderators
- **Approval Workflows** — Multi-step approval for sensitive content
- **Moderation Teams** — Group moderators into teams with different permissions
- **Activity Feed** — Real-time feed of what other moderators are doing
- **Conflict Detection** — Warn when two moderators try to action the same item

---

## 11. Charts, Analytics & Visual Aids

### Currently Implemented
- Queue stats summary cards (Pending, Spam, Flagged, Total)
- Spam ratio progress bar
- Content type breakdown table
- Activity heatmap (7 days × 24 hours)

### Proposed New Visualizations

| Chart Type | Purpose | Priority |
|------------|---------|----------|
| **Line Chart** — Moderation Volume Over Time | Track daily/weekly moderation activity | 🔴 High |
| **Pie/Donut Chart** — Status Distribution | Visual breakdown by status (pending, spam, approved, rejected) | 🔴 High |
| **Bar Chart** — Top Spam Content Types | Identify which content types attract the most spam | 🔴 High |
| **Area Chart** — Spam Trend | Track spam ratio trend over days/weeks | 🟠 High |
| **Radar Chart** — Moderator Performance | Compare moderators across speed, accuracy, volume | 🟠 High |
| **Stacked Bar** — Content by Day | Show daily volume broken down by content type | 🟡 Medium |
| **Funnel Chart** — Moderation Funnel | Show flow from pending → reviewed → actioned | 🟡 Medium |
| **Gauge Chart** — Spam Score Distribution | Distribution histogram of spam scores in the queue | 🟡 Medium |
| **Timeline** — Anomaly Events | Visual timeline of detected anomalies | 🟡 Medium |
| **Map** — Geographic Spam Sources | Show where spam originates (requires IP geolocation) | 🟢 Nice-to-have |
| **Word Cloud** — Top Keywords | Visualize most common keywords in spam content | 🟢 Nice-to-have |
| **Heat Calendar** — Activity by Month/Day | GitHub-style contribution grid for moderation activity | 🟢 Nice-to-have |

### Interactive Dashboard Features

- **Date range picker** for all analytics (7d, 30d, 90d, custom)
- **Click-through** from chart to filtered queue (click spam pie slice → filter queue to spam items)
- **Export charts** as PNG/SVG
- **Auto-refresh** every 30 seconds
- **Anomaly alerts** highlighted on charts with explanation tooltips
- **Comparative periods** (current vs previous period)

---

## 12. Auto Moderation Improvements

### Current Auto Moderation State
- Settings exist for `auto_moderate` and `moderation_behavior` but they are NOT wired to actual functionality
- The firewall rule engine exists in TypeScript but is not ported to PHP
- No automatic processing of incoming WordPress content

### Proposed Auto Moderation Architecture

```
Incoming Content (comment, post, etc.)
  │
  ▼
WordPress Hook (comment_post, save_post)
  │
  ▼
PHP Firewall Engine ←── Settings (max_links, blacklisted_keywords, etc.)
  │
  ├── No rules triggered → Status: Approved (skip queue)
  ├── Rule triggered, action: 'flag' → Status: Flagged (appears in queue)
  ├── Rule triggered, action: 'spam' → Status: Spam (marked as spam, may skip queue)
  └── Rule triggered, action: 'discard' → Status: Discarded (silently dropped, no notification)
```

### Settings & Options for Auto Moderation Precision

#### Spam Scoring Settings
| Setting | Type | Description |
|---------|------|-------------|
| AI Spam Detection Engine | Select | None / Local ML / OpenAI / Claude / Custom API |
| AI API Endpoint | Text | URL for custom AI moderation API |
| AI API Key | Password | API key for the AI service |
| Spam Score Threshold (Flag) | Number (0-100) | Score above which items are flagged (default: 60) |
| Spam Score Threshold (Spam) | Number (0-100) | Score above which items are marked as spam (default: 80) |
| Spam Score Threshold (Discard) | Number (0-100) | Score above which items are silently discarded (default: 95) |
| Content Hash Sensitivity | Number | Simhash Hamming distance threshold (1-10, default: 3) |

#### URL/Link Settings
| Setting | Type | Description |
|---------|------|-------------|
| Max Links Allowed | Number | Links before flagging (default: 3) |
| Block All Links | Toggle | Automatically flag/block any content with links |
| Allowlist Domains | Textarea | Domains that are exempt from link checks |
| Block Shortened URLs | Toggle | Flag content with URL shorteners (bit.ly, tinyurl, etc.) |
| Check Link Reputation | Toggle | Check links against Google Safe Browsing API |
| Google Safe Browsing API Key | Password | API key for link reputation checks |

#### Keyword & Pattern Settings
| Setting | Type | Description |
|---------|------|-------------|
| Blacklisted Keywords | Textarea | One per line, supports wildcards |
| Whitelisted Keywords | Textarea | Keywords that override blacklist matches |
| Regex Patterns | Textarea | Custom regex patterns for advanced matching |
| ALL CAPS Detection | Toggle | Flag content with >70% capital letters |
| Repeated Character Detection | Toggle | Flag content with excessive repetition (e.g., "buy noooow!!!!") |
| Language Filter | Select | All / Specific languages only / Block specific languages |

#### User Behavior Settings
| Setting | Type | Description |
|---------|------|-------------|
| Min Account Age (Hours) | Number | Accounts younger than this get extra scrutiny |
| Min Email Age | Select | Gmail/Yahoo/etc addresses flagged (disposable email check) |
| Block Disposable Emails | Toggle | Auto-block content from disposable email domains |
| Require Email Verification | Toggle | Only allow verified users to post |
| Max Posts Per Hour | Number | Rate limiting per user |
| Banned IP Ranges | Textarea | CIDR notation, one per line |
| Banned Country Codes | Multi-select | ISO country codes for geo-blocking |
| VPN/Proxy Detection | Toggle | Flag content from known VPN/proxy IPs (requires API) |

#### Timing & Frequency Settings
| Setting | Type | Description |
|---------|------|-------------|
| Min Submit Time (Seconds) | Number | Forms submitted faster than this are flagged (honeypot) |
| Cooldown Between Posts (Seconds) | Number | Minimum time between posts from same user |
| Duplicate Detection Window (Days) | Number | Lookback period for duplicate detection |
| Duplicate Similarity Threshold | Number (0-100) | Content similarity % for flagging (uses simhash) |
| Weekend/Off-Hours Sensitivity | Toggle | Apply stricter rules during nights and weekends |

#### Automated Actions
| Setting | Type | Description |
|---------|------|-------------|
| Default Action | Select | Flag / Mark Spam / Discard (when rules triggered) |
| Per-Rule Overrides | Advanced | Custom action for each specific rule |
| Auto-Approve Threshold | Number | Spam score below this auto-approves (default: 10) |
| Notify on Auto-Discard | Toggle | Send alert when content is auto-discarded |
| Auto-Ban After N Violations | Number | Automatically ban users after X spam submissions |
| Ban Duration | Select | Temporary (24h, 7d, 30d) / Permanent |
| Learning Mode | Toggle | Record all rule evaluations but don't take action (audit mode) |

#### Scheduled Moderation
| Setting | Type | Description |
|---------|------|-------------|
| Strict Mode Schedule | Time Range | Apply stricter rules during specific hours |
| Auto-Clear Old Pending Items | Number | Auto-reject items pending for more than X days |
| Auto-Archive Reviewed Items | Number | Auto-archive approved/rejected items after X days |
| Queue Size Limit | Number | Max items in queue before triggering alert |

---

## 13. Settings & Configuration Enhancements

### Current Settings (Good foundation)
- General: Auto Moderate toggle, Moderation Behavior, Queue Page Size, Language
- Spam Firewall: Max Links, Blacklisted Keywords/Domains, Min Submit Time, Duplicate Detection
- Notifications: Email Alerts, Alert Threshold, Notify Moderators

### Proposed New Settings Sections

#### Appearance & Display
- Theme: Light / Dark / System
- Queue View: Table / Cards / Compact
- Items Per Page: 10 / 25 / 50 / 100
- Show/Hide Columns: Togglable columns in queue table
- Date Format: Relative / Absolute / Both
- Timezone: Choose timezone for logs and analytics

#### Integrations
- WordPress Comments Auto-Import: Toggle
- WordPress Posts Auto-Import: Toggle
- WooCommerce Reviews Auto-Import: Toggle
- bbPress Topics/Replies Auto-Import: Toggle
- BuddyPress Activity Auto-Import: Toggle
- Gravity Forms / CF7 Integration: Toggle
- Zapier / Webhook URL: Text input for real-time moderation webhooks

#### Advanced Auto Moderation
- All settings listed in Section 12 above

#### Moderator Management
- Moderator Roles: Select which WP roles can moderate
- Secondary Approval Required: Toggle for high-risk actions
- Action Confirmation Required: Toggle (Confirm before approve/reject/spam)

#### Data Retention
- Activity Log Retention (Days): Number (default: 90)
- Archived Item Retention (Days): Number (default: 365)
- Auto-Purge Schedule: Daily / Weekly / Monthly
- Export Before Purge: Toggle (auto-export data before deletion)

#### API & Webhooks
- Webhook URL for New Items: POST new queue items to external URL
- Webhook URL for Approvals: POST approved items
- Webhook URL for Spam: POST spam items
- API Rate Limiting: Requests per minute
- Custom API Secret: For webhook verification

#### Backup & Restore
- Export Settings: Download JSON of all settings
- Import Settings: Upload JSON to restore settings
- Scheduled Backups: Daily / Weekly / None

---

## 14. Security Audit Notes

### Strengths
- ✅ All REST endpoints require `manage_options` capability
- ✅ WordPress REST API nonce verification used
- ✅ Input sanitization with `sanitize_text_field()`, `sanitize_key()`, etc.
- ✅ Prepared SQL statements with `$wpdb->prepare()`
- ✅ CSRF protection via WordPress nonce system
- ✅ XSS prevention with `esc_html__()`, `esc_url_raw()`

### Weaknesses
- ⚠️ No rate limiting on REST API endpoints
- ⚠️ No activity logging for unauthorized access attempts
- ⚠️ Nonce refresh/renewal not handled in the React app
- ⚠️ No IP-based blocking for API abuse
- ⚠️ No capability differentiation (all admins have full access)
- ⚠️ Settings validation is minimal (type casting only)
- ⚠️ No audit trail for settings changes

### Recommendations
1. Add rate limiting middleware to REST API endpoints
2. Implement capability-based permissions (`cmcc_moderate`, `cmcc_manage_settings`, `cmcc_view_analytics`)
3. Log all unauthorized REST API access attempts
4. Add nonce refresh mechanism in the React app
5. Add change tracking for settings (who changed what and when)
6. Validate API request size to prevent DOS attacks

---

## 15. Priority Recommendations

### Immediate (Must Fix Before Production)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | **B1** — Fix data model mismatch (snake_case ↔ camelCase) | 2h | 🔴 Blocks all queue functionality |
| P0 | **B2** — Extend status enum to include all backend statuses | 1h | 🔴 Incorrect status display |
| P0 | **F1** — Implement WordPress hook integration (auto-populate queue) | 8h | 🔴 Queue is empty in production |
| P0 | **F2** — Port firewall rules to PHP for server-side evaluation | 16h | 🔴 No auto moderation works |
| P1 | **U2/U3/U4/U5** — Make queue filters, bulk actions, refresh, checkboxes functional | 4h | 🟠 Queue UI non-functional |
| P1 | **U8** — Add toast notifications for all actions | 3h | 🟠 No user feedback |

### Short Term (Next Sprint)

| Item | Effort |
|------|--------|
| Add real filter controls (dropdowns, date picker, search input) in QueueTable | 4h |
| Fix activity log to show moderator display names instead of IDs | 2h |
| Implement proper CSV export in export-csv endpoint | 2h |
| Connect heatmap chart to real analytics data | 3h |
| Add loading skeleton states instead of plain text | 3h |
| Add settings field validation | 2h |
| Standardize action names across the system | 2h |

### Medium Term

| Item | Effort |
|------|--------|
| Implement user reputation system dashboard | 8h |
| Add line/bar/pie charts for analytics (use Chart.js or recharts) | 12h |
| Implement advanced auto moderation settings (Section 12) | 20h |
| Add dark mode support | 4h |
| Implement saved filters and views | 6h |
| Add keyboard shortcuts for power moderators | 4h |
| Implement email notification system | 8h |

### Long Term Vision

| Item | Effort |
|------|--------|
| AI-powered content moderation integration | 40h |
| Multi-platform hub (centralized cross-platform queue) | 60h |
| Mobile app for on-the-go moderation | 80h |
| Real-time collaboration features | 40h |
| Compliance reporting suite | 30h |
| Marketplace for moderation rules/plugins | 50h |

---

## Appendix A: Test Data Used

The WordPress installation contained 17 seed queue items across multiple content types:
- 10 comments (various spam scores from 0.01 to 0.97)
- 4 posts (spam scores 0.02-0.65)
- 1 WooCommerce review (spam score 0.03)
- 1 bbPress topic (spam score 0.08)
- 1 form entry (spam score 0.35)

Activity log contained 9 entries with mixed action types from various moderators.

## Appendix B: Environment Details

- **WordPress:** 6.7.2
- **PHP:** 8.2.28 (Apache)
- **Database:** MariaDB 11
- **React:** 18.3.1 (via WordPress core)
- **Plugin Version:** 1.0.0
- **Build:** TypeScript 5.x, Webpack 5.x, Babel 7.x
- **Test URL:** http://localhost:8080
- **Admin Credentials:** admin / admin123

---

*Report generated via comprehensive manual testing of the CMCC WordPress plugin on 2026-06-06.*
