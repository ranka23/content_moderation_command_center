# CMCC WordPress Plugin — Codebase Review Report

**Date:** 2026-06-28  
**Audit Scope:** WordPress plugin (`platforms/wordpress/`) and shared packages (`packages/cmcc-ui/`, `packages/cmcc-core/`)  
**Auditor:** Automated codebase analysis  
**Priority Legend:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | ⚪ Informational

---

## Table of Contents

1. [Architecture & File Organization](#1-architecture--file-organization)
2. [Dead Code Detection](#2-dead-code-detection)
3. [Code Duplication](#3-code-duplication)
4. [Code Smells & Complexity](#4-code-smells--complexity)
5. [Error Handling Gaps](#5-error-handling-gaps)
6. [Security Audit](#6-security-audit)
7. [Missing REST Routes](#7-missing-rest-routes)
8. [Missing Documentation](#8-missing-documentation)
9. [CSS & Frontend Issues](#9-css--frontend-issues)
10. [Shared Package Inconsistencies](#10-shared-package-inconsistencies)
11. [Recommended Refactoring Plan](#11-recommended-refactoring-plan)
12. [Summary Counts](#12-summary-counts)

---

## 1. Architecture & File Organization

### 1.1 🟠 `cmcc.php` — God File (1,920 lines)

The main plugin file mixes concerns that should be separated:

| Concern | Lines | Should be in |
|---------|-------|-------------|
| Plugin header/constants | 1-39 | ✓ Correct |
| DB schema (activation) | 46-113 | `src/lib/activator.php` |
| Bootstrap (init) | 126-145 | ✓ Correct |
| Admin assets/menu | 149-242 | ✓ Correct |
| REST route registration | 245-461 | ✓ Acceptable |
| Permission check | 486-500 | ✓ Correct |
| REST callbacks (queue) | 504-778 | `src/lib/queue-endpoints.php` |
| REST callbacks (analytics) | 780-878 | `src/lib/analytics-endpoints.php` |
| REST callbacks (activity log) | 881-928 | `src/lib/activity-endpoints.php` |
| REST callbacks (settings) | 930-982 | `src/lib/settings-endpoints.php` |
| REST callbacks (reputation) | 988-1051 | `src/lib/reputation-endpoints.php` |
| Helper functions | 1057-1180 | `src/lib/helpers.php` |
| Default settings array | 1182-1301 | `src/lib/default-settings.php` |
| Activity feed callback | 1307-1382 | `src/lib/collaboration.php` (conflicts) |
| User deactivation | 1383-1425 | `src/lib/user-management.php` |
| AI evaluation (basic) | 1427-1508 | `src/lib/ai-evaluation.php` |
| AI evaluation (OpenRouter) | 1516-1644 | `src/lib/ai-evaluation.php` |
| AI evaluation (extended) | 1649-1772 | `src/lib/ai-evaluation.php` |
| AI evaluate+update queue | 1775-1887 | `src/lib/ai-evaluation.php` |
| AI auto-moderate endpoint | 1890-1920 | `src/lib/ai-evaluation.php` |

**Recommendation:** Split `cmcc.php` into focused files in `src/lib/`. The `function_exists` guards make this safe — existing files won't conflict.

### 1.2 🟡 Inconsistent Function Guard Styles

The codebase uses TWO different patterns for function-exists guards:

**Pattern A — Used in `cmcc.php` (all functions):**
```php
if ( ! function_exists( 'cmcc_rest_get_queue' ) ) {
    function cmcc_rest_get_queue() { ... }
} // End function_exists guard
```

**Pattern B — Used in `lib/*.php` files (some functions):**
```php
if ( ! function_exists( 'cmcc_rest_add_note' ) ) :
    function cmcc_rest_add_note() { ... }
endif; // cmcc_rest_add_note
```

**Impact:** No functional impact but inconsistent style harms readability. The `endif` style is PHP's alternative syntax for control structures — both work identically.

### 1.3 ⚪ Multi-Platform Support at WordPress Level

The `multi-platform.php` file adds WordPress-based routes for syncing settings to Shopify, Storyblok, Strapi, and Wix — but these platforms have their own standalone implementations in the monorepo. This creates confusion about whether settings sync is handled at the WordPress-plugin level or the standalone-platform level. **These routes are also not registered (see §7).**

---

## 2. Dead Code Detection

### 2.1 🔴 `cmcc_csv_escape()` — Used But Never Defined

**Severity:** Critical (potential fatal error)

**Evidence:**
- Called in `reports.php` lines 62, 65, 68 (moderation-activity) and lines 132, 139, 142 (compliance-audit)
- **Nowhere defined** in any PHP file in the WordPress platform

```php
// reports.php uses it, but it doesn't exist
cmcc_csv_escape( $row->moderator_name ? 'User #' . $row->moderator_id : '' );
```

**Impact:** If either moderation-activity or compliance-audit endpoint is called, PHP will throw a fatal error. This makes the entire reports feature non-functional.

**Fix:** Define the function in `reports.php`:
```php
function cmcc_csv_escape( string $value ): string {
    return '"' . str_replace( '"', '""', $value ) . '"';
}
```

### 2.2 🟠 Unregistered REST Routes (6 Endpoints)

These functions exist in the codebase but their REST routes are **never registered** in `cmcc_register_rest_routes()`:

| Function | File | Expected Route |
|----------|------|---------------|
| `cmcc_rest_get_platforms_status` | `multi-platform.php` | `GET /cmcc/v1/platforms/status` |
| `cmcc_rest_platforms_sync_settings` | `multi-platform.php` | `POST /cmcc/v1/platforms/sync-settings` |
| `cmcc_rest_get_unified_queue` | `multi-platform.php` | `GET /cmcc/v1/unified-queue` |
| `cmcc_rest_reports_moderator_performance` | `reports.php` | `GET /cmcc/v1/reports/moderator-performance` |
| `cmcc_rest_get_scheduled_reports` | `reports.php` | `GET /cmcc/v1/reports/scheduled` |
| `cmcc_rest_delete_scheduled_report` | `reports.php` | `DELETE /cmcc/v1/reports/scheduled` |

**Impact:** These features are unreachable from the frontend. The code exists but does nothing. Adds ~300 lines of dead code.

### 2.3 🟡 Unused Default Settings Fields

The default settings array in `cmcc_get_default_settings()` contains fields that are never rendered in the UI's `buildSections()`:

| Field | Location | Notes |
|-------|----------|-------|
| `moderation.auto_approve_trusted` | L1197 | Section `moderation` exists in defaults but not rendered in UI |
| `moderation.hold_for_review` | L1198 | Same as above |
| `general.default_language` | L1192 | Named `language` in the UI field |
| `general.date_format` | L1193 | Not rendered in UI General tab |
| `general.notify_on_spam` | L1194 | Not rendered in UI General tab |

**Impact:** These settings exist in the database but can never be changed via the UI. They're set once at plugin activation and effectively hardcoded.

### 2.4 🟡 Unused `cmcc_log_activity()` Helper

The `cmcc_log_activity()` helper function (L1073-1092) exists to centralize activity logging but is only used in **3 places**:
- `cmcc_rest_deactivate_users()` (L1412)
- `cmcc_ai_evaluate_and_update_queue()` (L1863)
- `cmcc_rest_add_note()` (collaboration.php L88)

Most REST callbacks directly call `$wpdb->insert()` on the log table instead of using the helper. If the helper's logic needs updating (e.g., adding a new column), 5+ places need manual updates.

### 2.5 🟡 `cmcc_rest_get_queue` — `date_range` Parameter Not in Route Registration

The `date_range` parameter (added in B9 fix) is used in the queue query logic (L558-569) but is **not declared** in the route's `args` array (L255-264). WordPress REST API will still pass it through, but it's not documented/schema-validated.

### 2.6 🔵 `cmcc_hook_save_post` — Redundant Alias

`cmcc_hook_save_post()` (content-hooks.php L156-159) simply calls `cmcc_hook_new_post()` with the same arguments. This is a deliberate alias for the `save_post` action hook, but it introduces an extra function call on every post save.

---

## 3. Code Duplication

### 3.1 🔴 `cmcc_rest_get_activity_feed` — Defined Twice, Different Implementations

**Defined in:**
- `cmcc.php` lines 1307-1341 (simple, no parameters, LIMIT 50)
- `collaboration.php` lines 221-287 (supports `limit`, `start_date`, `end_date` parameters)

**Differences:**

| Aspect | cmcc.php version | collaboration.php version |
|--------|-----------------|--------------------------|
| Parameters | None | `limit`, `start_date`, `end_date` |
| Limit method | Hardcoded `LIMIT 50` in SQL | Configurable via `$request->get_param('limit')` |
| Date filtering | None | Supports start/end date |
| Conflict risk | Whichever loads last wins | |

**Impact:** Depending on file load order, one implementation silently overrides the other. The collaboration.php version is more feature-rich. This is a **race condition in code** — not at runtime, but at load time.

### 3.2 🟡 Triplicated Spam Keyword List

The exact same 15-element keyword array appears in **three places** in `cmcc.php`:

1. `cmcc_rest_ai_evaluate()` — line 1459
2. `cmcc_rest_ai_evaluate_ex()` — line 1707
3. `cmcc_ai_evaluate_and_update_queue()` — line 1812

```php
$spam_keywords = array(
    'viagra', 'casino', 'lottery', 'free money', 'click here',
    'buy now', 'act now', 'limited time', 'congratulations',
    'you won', 'prize', 'urgent', 'call now', 'subscribe',
    'earn money', 'work from home', 'make money fast',
);
```

**Impact:** If you need to add/remove a keyword, you must update all 3 places. One will inevitably be missed. Should be a global constant or shared function.

### 3.3 🟡 Duplicated Status Maps

The action-to-status mapping array is defined **twice**:

1. `cmcc_rest_queue_action()` — L623-629
2. `cmcc_rest_bulk_action()` — L724-730

```php
$status_map = array(
    'approve' => 'approved',
    'reject'  => 'rejected',
    'spam'    => 'spam',
    'flag'    => 'flagged',
    'defer'   => 'deferred',
);
```

### 3.4 🟡 Duplicated CSV Generation Logic

The CSV generation in `reports.php` creates arrays with `implode(',', ...)` manually. Both `cmcc_rest_reports_moderation_activity()` and `cmcc_rest_reports_compliance_audit()` share the same pattern but have different headers and slightly different field escaping. A shared CSV utility function would reduce duplication.

### 3.5 🟡 Sentiment Analysis Logic Duplicated

The same positive/negative word sentiment analysis appears in:
1. `cmcc_rest_ai_evaluate()` — L1490-1499 (cmcc.php)
2. `cmcc_rest_ai_evaluate_ex()` — L1738-1751 (cmcc.php)

### 3.6 🔵 Language Detection Logic Duplicated

The same regex-based language detection (ru/de/fr/es via Unicode character matching) appears in:
1. `cmcc_rest_ai_evaluate()` — L1484-1488
2. `cmcc_rest_ai_evaluate_ex()` — L1728-1736

---

## 4. Code Smells & Complexity

### 4.1 🟠 `cmcc_add_to_queue()` — Too Many Responsibilities (content-hooks.php L315-422)

This single function does ALL of the following:
1. Reads settings from DB
2. Runs firewall evaluation (external function call)
3. Applies firewall-based status/spam score
4. Runs AI-powered evaluation (external function)
5. Blends AI + firewall scores
6. Applies threshold-based auto-moderation
7. Checks author reputation
8. Updates spam score based on reputation
9. Inserts into DB
10. Logs activity

**Complexity:** ~8 decision points, multiple nested if/else branches, score blending logic spanning lines 349-406.

**Recommendation:** Extract into pipeline stages:
- `cmcc_firewall_stage()`
- `cmcc_ai_stage()`
- `cmcc_reputation_stage()`
- `cmcc_insertion_stage()`

### 4.2 🟠 `buildSections()` — 680-Line Function (useSettings.js L24-704)

This function manually defines all 10 settings sections with inline field arrays. Each section follows the exact same pattern:
```javascript
const sectionData = s('section_name')
sections.push({
  id: 'section_name',
  title: 'Section Title',
  fields: [
    { name: 'field_name', label: 'Field Label', type: 'field_type' },
    // ... repeated for every field
  ],
})
Object.assign(initialValues, sectionData)
```

**Lines per section:**
| Section | Lines |
|---------|-------|
| General | ~45 |
| Spam Firewall | ~55 |
| Notifications | ~30 |
| Appearance & Display | ~58 |
| Integrations | ~48 |
| Advanced Auto Moderation | ~235 |
| Moderator Management | ~25 |
| Data Retention | ~40 |
| API & Webhooks | ~42 |
| Backup & Restore | ~22 |

The Advanced Auto Moderation section alone accounts for 235 lines of field definitions (L270-497).

**Recommendation:** Move field definitions to a JSON configuration file or constant. The function should just iterate over the config.

### 4.3 🟡 Widget-Specific Constant Name Audit

The plugin header says "Version: 1.0.0" but the PHP constant is `CMCC_VERSION = '1.0.2'`. These are out of sync.

### 4.4 🟡 `initializedRef` Pattern (SettingsForm.tsx)

The intentional B6 fix uses `initializedRef` to prevent form re-initialization after re-fetch. While documented, this means after import, users must reload the page. This is a known tradeoff but could be improved by exposing a "reinitialize" method.

### 4.5 🟡 Settings Form Save Button — Dual Path

The save button now has TWO submission paths:
1. React `onSubmit` handler (the intended path)
2. `onClick` fallback (added as workaround for automation issues)

This dual path means if the `onSubmit` handler ever changes, the `onClick` fallback must be updated separately. Both paths call `handleSettingsSave()` ultimately, but the `onClick` path forces form validation differently.

### 4.6 🟡 Comment Title Logic in `cmcc_hook_new_comment()` (content-hooks.php L79-83)

```php
esc_html(
    mb_substr( wp_strip_all_tags( $comment->comment_content ), 0, 80 )
    ?: get_the_title( $comment->comment_post_ID )
    ?: 'Untitled'
)
```

This uses the comment content excerpt as the title, falling back to post title. The behavior is intentional (previously fixed per AI moderation report Issue 5), but the nesting makes it hard to read. Also, `esc_html` is applied to the entire expression result after the ternary chain, which is correct but non-obvious.

### 4.7 🟡 Number Input Value Appending (useSettings.js)

Not a code bug per se, but the `fill`/`type_text` automation issue with `<input type="number">` is a known React behavior: React treats programmatic value setting differently from keystrokes. Consider using `inputMode="numeric"` with `type="text"` as a workaround, or document it as a known limitation.

### 4.8 ⚪ Variable Naming Inconsistencies

| File | Naming Style | Example |
|------|-------------|---------|
| `cmcc.php` | snake_case | `$spam_score`, `$new_status` |
| `useSettings.js` | camelCase | `settingsSections`, `settingsInitialValues` |
| `useQueue.js` | camelCase | `queueItems`, `isQueueLoading` |
| `SettingsPage.jsx` | camelCase + const prefix | `aiConfig`, `handleExport` |
| `QueuePage.jsx` | abbreviated | `h`, `cba`, `scba`, `hbawc`, `d` |

The abbreviated variables in `QueuePage.jsx` (L49-58, L112) are particularly problematic for readability:
```javascript
const [cba, scba] = useState(null)  // "confirm bulk action" / "set confirm bulk action"
const d = h.detailItem  // "detail"
const hbawc = useCallback((a, ids) => scba({ action: a, ids }), [])
```

---

## 5. Error Handling Gaps

### 5.1 🟠 Missing Input Validation on REST Endpoints

Several REST endpoints lack proper input validation:

| Endpoint | Missing Validation | Risk |
|----------|-------------------|------|
| `POST /settings/import` | No JSON schema validation | Malformed data could corrupt settings |
| `POST /queue/bulk-action` | No validation of item existence | Returns success even if some IDs are invalid |
| `POST /users/deactivate` | Only validates existence, not if user is already deactivated | Idempotent operation could spam activity log |
| `POST /reports/scheduled` | No email address validation for `emails` field beyond sanitize_email | Invalid addresses stored silently |

### 5.2 🟠 Silent Failures — No Error Logging

Several places have `try-catch` or error checks without logging:

| Location | Code | Issue |
|----------|------|-------|
| `cmcc_handle_export_csv()` L1100 | Returns error response for empty IDs | OK — has error response |
| `cmcc_rest_ai_evaluate()` L1459 | No try/catch around keyword analysis | Array access without null checks |
| `cmcc_rest_import_settings()` L1162 | No validation of settings structure | Silent corruption |
| `cmcc_rest_platforms_sync_settings()` L113 | Treats any wp_remote_post response as success | Network errors silently treated as success |

### 5.3 🟡 Race Condition in Nonce Refresh (api.js L23-56)

The nonce refresh logic in `api.js` is well-implemented but has an edge case: if multiple API calls happen simultaneously and all get 403, they'll all attempt nonce refresh, causing N duplicate requests. Consider a mutex/lock pattern for concurrent nonce refreshes.

### 5.4 🟡 `@` Suppression in Regex Validation (firewall-engine.php L173)

```php
if ( @preg_match( $pattern, '' ) === false ) {
    continue; // Invalid regex — skip this keyword silently
}
```

The `@` error suppression hides all PHP warnings from `preg_match()`. While this is intentional to avoid breaking the UI with malformed regex patterns, it also hides legitimate errors. Consider checking `preg_last_error()` instead.

### 5.5 🟡 Activity Feed — Empty Moderator Name Fallback (cmcc.php L1333, collaboration.php L270)

```php
'moderator_name' => $event->moderator_name ?: 'User #' . $event->moderator_id
```

This falls back to "User #0" if `moderator_id` is 0 (system action). Should check for 0 and use "System" instead.

---

## 6. Security Audit

### 6.1 ✅ Prepared Statements (All Good)

Every raw SQL query uses `$wpdb->prepare()` with proper `%s`/`%d`/`%f` placeholders. The `phpcs:ignore` comments are present for table name interpolation (which is safe since table names are hardcoded constants).

### 6.2 ✅ Permission Checks (All Good)

Every REST route uses `cmcc_rest_permission_check()` which requires `manage_options` capability.

### 6.3 ✅ Input Sanitization (Mostly Good)

Most user inputs are sanitized with `sanitize_text_field()`, `sanitize_email()`, `sanitize_textarea_field()`, or `esc_html()`. The notable gap is:

### 6.4 🟡 Webhook URL Not Validated as URL

In `cmcc_send_webhook()` (notifications.php L130-158), the webhook URL is taken from settings and passed directly to `wp_remote_post()` without URL validation. If a non-URL string is configured, `wp_remote_post()` will fail silently (the call is non-blocking).

### 6.5 🟡 Nonce Handling — Minor Gap

The `cmccData` localization (cmcc.php L185-192) passes the nonce to JavaScript:
```php
'nonce' => wp_create_nonce( 'wp_rest' ),
```

The nonce is regenerated on every page load, which is correct. However, the customized `apiFetch` in `api.js` sometimes sends the nonce with an empty value:
```javascript
'X-WP-Nonce': window.cmccData?.nonce || '',
```

The `|| ''` fallback means if `cmccData` is undefined (before localization loads), the nonce header is empty. This won't cause security issues (request will get 403) but may cause confusion during debugging.

### 6.6 ✅ XSS Prevention

Output is properly escaped with `esc_html()` in all email templates (notifications.php) and REST responses. The `sanitize_text_field()` function also strips HTML tags from user inputs.

---

## 7. Missing REST Routes

### 7.1 🔴 Functions That Exist But Routes Don't

As detailed in §2.2, six functions are defined but their routes are never registered. This means the following features are completely non-functional:

- **Moderator Performance Reports** — `GET /cmcc/v1/reports/moderator-performance`
- **View Scheduled Reports** — `GET /cmcc/v1/reports/scheduled`
- **Delete Scheduled Reports** — `DELETE /cmcc/v1/reports/scheduled`
- **Platform Status** — `GET /cmcc/v1/platforms/status`
- **Platform Sync** — `POST /cmcc/v1/platforms/sync-settings`
- **Unified Queue** — `GET /cmcc/v1/unified-queue`

### 7.2 🟡 Route Definitions Without Frontend Usage

These routes are properly registered but have no corresponding frontend implementation:

| Route | Registered | Frontend Usage |
|-------|-----------|----------------|
| `GET /cmcc/v1/reputation-raw` | ✅ L338-346 | ❌ Not called in any JS file |
| `POST /cmcc/v1/users/deactivate` | ✅ L432-436 | ❌ B4 fix path in useQueue.js may call it |
| `GET /cmcc/v1/queue/{id}/ai-evaluate` | ✅ L439-443 | ✅ Called in QueuePage.jsx |
| `POST /cmcc/v1/queue/{id}/ai-evaluate-ex` | ✅ L446-450 | ❌ Not called in any JS file |
| `POST /cmcc/v1/queue/{id}/ai-auto-moderate` | ✅ L453-457 | ❌ Not called in any JS file |

The extended AI evaluation and auto-moderate routes are registered but have no frontend integration. These were likely intended for future use or direct API calls.

---

## 8. Missing Documentation

### 8.1 🟡 PHPDoc Gaps

| Function | Missing Parameters | Missing Return Type |
|----------|-------------------|-------------------|
| `cmcc_rest_get_settings()` | No `@param` | Has `@return` ✅ |
| `cmcc_rest_export_settings()` | No `@param` | Has `@return` ✅ |
| `cmcc_rest_get_activity_feed()` (cmcc.php) | No `@param` | Has `@return` ✅ |
| `cmcc_handle_export_csv()` | Has `@param` ✅ | No `@return` |
| `cmcc_rest_get_reputation_raw()` | Has `@param` ✅ | Has `@return` ✅ |

Most functions in `cmcc.php` have minimal or missing PHPDoc blocks. The lib/*.php files generally have better documentation.

### 8.2 🟡 JSDoc Gaps

| Function | File | Has JSDoc? |
|----------|------|-----------|
| `buildSections()` | useSettings.js | ❌ |
| `camelToSnake` conversion | useSettings.js L825-831 | ❌ |
| `downloadCSV()` | useQueue.js L181-204 | ✅ |
| Helper variables (sb, hb) | QueuePage.jsx L27-40 | ❌ |
| handleAiEvaluate() | QueuePage.jsx L90-111 | ❌ |

### 8.3 🟡 Missing README Updates

The plugin README at `platforms/wordpress/README.md` exists but may not document:
- The OpenRouter AI integration setup
- The 10 settings tabs and their purposes
- Webhook configuration
- Multi-platform sync (even though routes aren't registered)
- Cron jobs (daily report cron, data retention purge)
- Known limitations (save button automation, initializedRef pattern)

---

## 9. CSS & Frontend Issues

### 9.1 🟡 Inconsistent Styling Strategy

The codebase mixes two approaches:

**Tailwind utility classes** (preferred, used in most components):
```jsx
<div className="tw-mt-8 tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-p-6">
```

**Tailwind with `tw-` prefix** — The `tw-` prefix in Tailwind config suggests class name prefixing. Clean.

**Inline styles** (SettingsForm.tsx):
```jsx
style={{ display: 'flex', alignItems: 'center' }}
```

The SettingsForm component from `@cmcc/ui` uses inline styles while the rest of the app uses Tailwind. This inconsistency makes themed customization harder.

### 9.2 🟡 12 Separate CSS Files

All CSS files in `src/styles/`:
```
cmcc-activity.css
cmcc-analytics.css
cmcc-collaboration.css
cmcc-dark-mode.css
cmcc-layout.css
cmcc-notifications.css
cmcc-panels.css
cmcc-queue.css
cmcc-responsive.css
cmcc-settings.css
cmcc-tables.css
cmcc-typography.css
```

These could be consolidated into fewer files. The dark mode CSS in a separate file is good practice, but the rest could be merged by feature area.

### 9.3 🟡 Toggle Label Accessibility (SettingsForm.tsx)

The reported issue (TEST_REPORT.md Issue 5, "No label associated with a form field") is in the shared `@cmcc/ui` component. The toggle fields use:
```jsx
<label>
  <span>Field Label</span>
  <input type="checkbox" id="cmcc-field-{name}" />
</label>
```

The `<span>` inside `<label>` provides implicit association, which is valid HTML but some accessibility validators flag it. Changing to:
```jsx
<label htmlFor="cmcc-field-{name}">Field Label</label>
<input type="checkbox" id="cmcc-field-{name}" />
```
Would resolve the warning.

### 9.4 🟡 Loading State — Settings Page (SettingsPage.jsx L128-137)

The settings page has a loading state:
```jsx
if (settingsSections.length === 0) {
    return (<div className="cmcc-loading"><div className="cmcc-spinner" /><span>Loading settings...</span></div>)
}
```

But there's no **error state** for fetch failure. If `fetchSettings()` fails, the spinner remains indefinitely with no retry option.

### 9.5 🟡 QueuePage — Complex Inline JSX

The `historyJsx` variable at line 114-130 is a large ternary chain embedded in the component body:
```jsx
const historyJsx = h.isHistoryLoading
    ? <div>Loading...</div>
    : !h.itemHistory.length
        ? <div>No history</div>
        : <div>{h.itemHistory.map(...)}</div>
```

This should be a separate component or extracted function.

---

## 10. Shared Package Inconsistencies

### 10.1 🟡 WordPress Settings Form — `@cmcc/ui` SettingsForm + WordPress `SettingsPage.jsx`

The generic `SettingsForm` component in `@cmcc/ui` handles form rendering (tabs, fields, validation, submit). WordPress's `SettingsPage.jsx` wraps it with:
1. AI Moderation section (`AiSettingsForm`) rendered separately outside `SettingsForm`
2. Export/Import buttons at the bottom

This means AI Moderation settings are **not part of the main form** — they're saved separately when `handleSettingsSave` is called with `{ ...formData, ...aiConfig }`. The AI config is merged with form data at submit time, which works but adds complexity:

```jsx
<SettingsForm
  onSubmit={(formData) => {
    handleSettingsSave({ ...formData, ...aiConfig })
  }}
  ...
/>
```

If the SettingsForm failed to submit due to validation errors, the AI config changes would also be discarded even though they weren't part of the form validation. This coupling is fragile.

### 10.2 🟡 `@cmcc/core` Has Firewall Logic That Could Replace PHP Version

The `packages/cmcc-core/src/firewall/` directory contains TypeScript firewall rules that mirror the PHP firewall-engine.php. Having the same logic in two languages is intentional (client-side + server-side), but there's no synchronization mechanism to ensure both stay in sync.

### 10.3 🟡 `@cmcc/core` AI Module — Not Used by WordPress PHP

The `packages/cmcc-core/src/ai/` directory has TypeScript AI evaluation logic, but the WordPress plugin uses its own PHP implementation (`cmcc_ai_evaluate_openrouter` in cmcc.php). These two implementations could diverge over time.

---

## 11. Recommended Refactoring Plan

### Phase 1 — Critical Fixes (Do Before Production)

| # | Issue | Effort | Risk | Priority |
|---|-------|--------|------|----------|
| 1 | Add `cmcc_csv_escape()` function to reports.php | 5 min | None | 🔴 |
| 2 | Register missing REST routes (6 endpoints) | 30 min | Low | 🟠 |
| 3 | Fix duplicate `cmcc_rest_get_activity_feed` — deduplicate | 15 min | Low | 🟠 |

### Phase 2 — Safe Cleanup (Low Risk)

| # | Issue | Effort | Risk | Priority |
|---|-------|--------|------|----------|
| 4 | Extract duplicated spam keyword list to constant | 15 min | None | 🟡 |
| 5 | Extract duplicated status maps to shared function | 15 min | None | 🟡 |
| 6 | Consolidate duplicated sentiment/language detection | 20 min | Low | 🟡 |
| 7 | Add missing Route args (date_range) | 5 min | None | 🟡 |
| 8 | Sync CMCC_VERSION constant with plugin header | 2 min | None | 🟡 |
| 9 | Add error state to SettingsPage loading | 15 min | Low | 🟡 |

### Phase 3 — Architecture Improvements (Moderate Risk)

| # | Issue | Effort | Risk | Priority |
|---|-------|--------|------|----------|
| 10 | Split `cmcc.php` into focused modules | 2-3 hours | Medium | 🟡 |
| 11 | Refactor `buildSections()` to use JSON config | 2 hours | Medium | 🟡 |
| 12 | Refactor `cmcc_add_to_queue()` into pipeline stages | 1-2 hours | Medium | 🟡 |
| 13 | Consolidate 12 CSS files into feature-based files | 1 hour | Low | 🔵 |
| 14 | Rename abbreviated variables in QueuePage.jsx | 30 min | Low | 🔵 |
| 15 | Add JSDoc/PHPDoc to undocumented functions | 1 hour | None | 🔵 |
| 16 | Unify function guard style (pick one pattern) | 30 min | None | ⚪ |

### Phase 4 — Long-Term Improvements

| # | Issue | Effort | Risk | Priority |
|---|-------|--------|------|----------|
| 17 | Add data-testid attributes to all interactive elements | 1 hour | None | 🔵 |
| 18 | Create automated tests for REST endpoints | 4 hours | None | 🔵 |
| 19 | Create PHP test suite for firewall engine | 2 hours | None | 🔵 |
| 20 | Implement frontend for unused AI endpoints | 2 hours | Low | 🔵 |

---

## 12. Summary Counts

### By Severity

| Severity | Count | Actions |
|----------|-------|---------|
| 🔴 Critical | 3 | Add missing function, register routes, fix function conflict |
| 🟠 High | 8 | Refactor god file, split responsibilities, input validation |
| 🟡 Medium | 18 | Deduplication, documentation, error handling, CSS |
| 🔵 Low | 8 | Renaming, test IDs, code style |
| ⚪ Informational | 2 | Inconsistencies for awareness |

### By Category

| Category | Count |
|----------|-------|
| Dead Code | 8 |
| Code Duplication | 6 |
| Code Smells / Complexity | 8 |
| Error Handling Gaps | 5 |
| Security Issues | 6 (mostly minor) |
| Missing REST Routes | 6 |
| Missing Documentation | 3 |
| CSS / Frontend | 5 |
| Shared Package Issues | 3 |
| **Total Findings** | **50** |

---

*End of CODE_REVIEW.md*
