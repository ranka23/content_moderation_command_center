# CMCC — Deep Code Audit & Comprehensive Todo Report

**Generated:** 2026-06-15T23:45
**Based on:** Full codebase audit of all 5 platforms + 3 shared packages + PHP backend, plus MASTER_PLAN.md, manual test findings, and prior implementation reports.

---

## Table of Contents

1. [Current Test Status](#1-current-test-status)
2. [🔴 Critical / Blocking Issues](#2--critical--blocking-issues)
3. [🟡 Phase 1: Backend & API Bugs](#3--phase-1-backend--api-bugs)
4. [🟡 Phase 1: Core UI Functionality Bugs](#4--phase-1-core-ui-functionality-bugs)
5. [🟡 Phase 1: Analytics Data Accuracy Bugs](#5--phase-1-analytics-data-accuracy-bugs)
6. [🎨 Phase 2: Design Overhaul Remaining](#6--phase-2-design-overhaul-remaining)
7. [🧩 Phase 3: UX Improvements Remaining](#7--phase-3-ux-improvements-remaining)
8. [🌐 Phase 4: Cross-Platform Parity — Detailed Gaps](#8--phase-4-cross-platform-parity--detailed-gaps)
9. [🧪 Phase 5: Testing & QA](#9--phase-5-testing--qa)
10. [🏗️ Architecture & Technical Debt](#10-architecture--technical-debt)
11. [⚡ Pre-Existing Test Failures](#11-pre-existing-test-failures)
12. [📋 Recommended Sprint Plan](#12-recommended-sprint-plan)

---

## 1. Current Test Status

| Package/Platform | Tests Passing | Status |
|-----------------|---------------|--------|
| `@cmcc/ui` | 176/176 | ✅ |
| `@cmcc/server-core` | 74/74 | ✅ |
| WordPress | 57/57 | ✅ |
| Shopify | 59/59 | ✅ |
| Strapi | 117/119 | ⚠️ (2 server test failures) |
| Storyblok | 4/23 | ❌ Pre-existing Babel/mock issues |
| Wix | 0/10 | ❌ Pre-existing component resolution |
| **Total** | **483+** | ✅ |

---

## 2. 🔴 Critical / Blocking Issues

### CRIT-1: `cmcc_rest_deactivate_users` is a no-op (B4)
- **File:** `platforms/wordpress/cmcc.php` L1440-1442
- **Code:** `function cmcc_rest_deactivate_users() { return new WP_REST_Response(array('success' => true), 200); }`
- **Impact:** The "Deactivate User Accounts" bulk action returns `{ success: true }` without actually calling `wp_deactivate_user()` or any equivalent. Moderators think users are deactivated when they're not.
- **Fix:** Add actual WordPress user deactivation logic: look up the user by `author_id`, call `wp_deactivate_user()` or update `wp_usermeta`.

### CRIT-2: `cmcc_rest_ai_evaluate` returns hardcoded dummy data
- **File:** `platforms/wordpress/cmcc.php` L1454-1461
- **Code:** Returns `{ spamScore: 0.15, language: 'en', sentiment: 'neutral', categories: [] }` regardless of input
- **Impact:** AI evaluation always shows the same mock result, never actually analyzes content.
- **Fix:** Wire to an actual AI engine (OpenAI, Claude, or local keyword analysis).

### CRIT-3: Wix keyboard shortcuts only register 2 of 8 (A, D, S, R, V, Esc missing)
- **File:** `platforms/wix/src/App.jsx` L223-239
- **Code:** `useKeyboardShortcuts` only receives `?` and `f` handlers. The `KEYBOARD_SHORTCUTS` array has all 8 but they're not wired as actual handlers.
- **Impact:** Users can't use A=Approve, R=Reject, S=Spam, D=Defer, V=View, Esc=Close on Wix.
- **Fix:** Add all 8 shortcut entries to the `useKeyboardShortcuts` array in Wix App.jsx, matching the WordPress pattern.

### CRIT-4: Wix QueueTable filters are completely non-functional
- **File:** `platforms/wix/src/App.jsx` L750-761
- **Code:** `QueueTable` receives `onFilterChange={() => {}}` (no-op) and hardcoded `filters={{ contentType: 'all', status: 'all', dateRange: 'all', search: '' }}`.
- **Impact:** Changing filters in the QueueTable toolbar does nothing — no state update, no re-render.
- **Fix:** Wire `onFilterChange` to update Wix's `searchQuery`/`filters` state and pass real filter state.

### CRIT-5: Wix uses `renderQueueTab()` inner function pattern — re-created every render
- **File:** `platforms/wix/src/App.jsx` — all tab content rendered via `renderQueueTab()`, `renderAnalyticsTab()`, `renderActivityTab()` (inner functions defined inside App)
- **Impact:** Every state change re-creates these function closures, causing all tab content to unmount/remount. Lost scroll position, flash of white, poor performance.
- **Fix:** Extract each tab's render function to a proper component (e.g., `function QueueTab(props)` outside App) or use `useCallback`.

---

## 3. 🟡 Phase 1: Backend / API Bugs

### P1.1-A: `/export-csv` returns JSON, not CSV
- **File:** `platforms/wordpress/cmcc.php` L1169-1173
- **Description:** The `cmcc_handle_export_csv()` function constructs a CSV array but wraps it in `WP_REST_Response` as `{ data: [...], filename: '...' }`. The actual CSV download logic lives in the client (`useQueue.js` `downloadCSV`).
- **Impact:** Can't directly download CSV from API tools (curl, Postman). The client-side workaround works but is fragile.
- **Fix (two options):**
  - **Option A (Recommended):** Change PHP to return real CSV with `Content-Type: text/csv` header and `Content-Disposition` attachment, bypassing the REST JSON wrapper entirely.
  - **Option B:** Keep current client-side CSV construction but use `cmcc_handle_export_csv` directly as a non-REST endpoint.

### P1.1-B: `/reputation-raw` function guard — already fixed
- **Status:** ✅ **Already correctly guarded** in its own `function_exists` block (L1022-1085). The MASTER_PLAN.md L1569 line reference was incorrect.

### P1.1-C: Data model alignment — partial (`snake_case` vs `camelCase`)
- **Files:** `platforms/wordpress/cmcc.php` returns `snake_case`, `useQueue.js` maps to `camelCase`, `useReports.js` maps to `camelCase` in `fetchUserReputation`
- **Issue:** The mapping is done ad-hoc in each hook. Not all endpoints and not all platforms consistently map.
- **Specific gaps:**
  - `useAnalytics.js` line 214-258 does its own `ctCounts` computation assuming `content_type` from raw items — this is fragile
  - Wix App.jsx uses raw API responses without consistent mapping
  - Strapi/Shopify have their own normalization functions but may miss fields

### P1.1-D: Nonce refresh mechanism doesn't exist (B5)
- **File:** `platforms/wordpress/src/lib/api.js`
- **Issue:** WordPress REST API nonces have a 12-hour half-life. After expiration, all API calls silently fail. No nonce refresh/renewal mechanism exists.
- **Impact:** App stops working after ~12 hours of continuous use. Requires page reload.
- **Fix:** Add nonce refresh: catch `rest_cookie_invalid_nonce` errors and refresh via AJAX call to WP nonce endpoint, then retry the failed request.

---

## 4. 🟡 Phase 1: Core UI Functionality Bugs

### P1.2-A: Shopify saved filters use custom implementation (not `useSavedFilters`)
- **File:** `platforms/shopify/src/App.jsx` L161-178
- **Issue:** Uses manual `localStorage` get/set with `JSON.parse` instead of `useSavedFilters` from `@cmcc/ui`. This means:
  - Different filter schema than other platforms
  - Missing `deleteSavedFilter` support
  - Inconsistent with WordPress/Wix/Strapi pattern
- **Fix:** Replace with `useSavedFilters('shopify-queue', filters)`.

### P1.2-B: Storyblok QueuePage saveFilter is a no-op
- **File:** `platforms/storyblok/src/pages/QueuePage.jsx` L6
- **Code:** `const { saveFilter } = React.useMemo(() => ({ saveFilter: () => {} }), [])`
- **Impact:** The "Save Filter" button does absolutely nothing.
- **Fix:** Import and use `useSavedFilters` from `@cmcc/ui`.

### P1.2-C: Storyblok QueuePage missing critical QueueTable props
- **File:** `platforms/storyblok/src/pages/QueuePage.jsx` L143-151
- **Missing Props:**
  - `onReadItem` — no item detail view possible
  - `onSearch` / `onFilterChange` — QueueTable's built-in search toolbar doesn't work
  - `onSort` / `sortField` / `sortDirection` — sorting doesn't work
  - `onBulkAction` — bulk actions not wired
  - `totalCount` / `page` / `onPageChange` / `perPage` — these are passed client-side but QueueTable's built-in ones aren't
- **Fix:** Pass all missing props properly.

### P1.2-D: Wix QueueTable filters are hardcoded (repeats of CRIT-4 but more detail)
- **File:** `platforms/wix/src/App.jsx` L750-761
- **Detail:** `onFilterChange` is a no-op, `filters` are hardcoded `{contentType: 'all', status: 'all', dateRange: 'all', search: ''}`. Also missing: `onSearch`, `onPerPageChange` (perPage is hardcoded at L133: `const perPage = 25`).

### P1.2-E: Shopify onboarding wizard doesn't use shared `OnboardingOverlay` component
- **File:** `platforms/shopify/src/components/OnboardingWizard.jsx`
- **Issue:** While WordPress was recently refactored to use a dedicated `OnboardingOverlay` component, Shopify has its own custom implementation that's different.

### P1.2-F: Wix toast notifications (inline, not `ToastContainer`)
- **File:** `platforms/wix/src/App.jsx` L1085-1108
- **Issue:** Toasts are rendered inline with inline styles rather than using the extracted `ToastContainer` component. Same pattern applies to the shortcuts modal (L1124-1156).

---

## 5. 🟡 Phase 1: Analytics Data Accuracy Bugs

### P1.3-A: Activity Heatmap shows 0 items (U4)
- **Files:** `useAnalytics.js`, `processAnalytics()` in `@cmcc/core`
- **Issue:** The heatmap data shows zeros for most time slots. Possible causes:
  - Client-side processing in `useAnalytics.js` doesn't compute heatmap data at all (the heatmap comes from `analyticsData.heatmap` which could be from server fallback)
  - The server-side `/analytics` endpoint may not return proper `activity_heatmap` data
- **Fix:** Investigate the heatmap data source chain from PHP to client.

### P1.3-B: "No status data available" / "No moderation volume available" (U5)
- **Files:** `StatusPieChart.tsx`, `ModerationLineChart.tsx` in `@cmcc/ui`
- **Issue:** Charts show empty state messages even when analytics data exists. Likely null/empty label arrays being passed.
- **Fix:** Check default values in `useAnalytics.js` and ensure `statusDistribution`/`moderationVolume` are non-null.

### P1.3-C: Spam Ratio shows 0/0 (U6)
- **File:** `useAnalytics.js` L340-348
- **Issue:** `spamRatioData` defaults to `{ spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 }`. The actual values depend on client-side computation from queue items, which may fail before the data is ready.
- **Fix:** Ensure spamRatio computation waits for queue data to load.

### P1.3-D: Content Breakdown table shows single type with wrong percentages
- **File:** `useAnalytics.js` L234-258
- **Issue:** `ctCounts` aggregation groups by `content_type` or `contentType`. If the field name is inconsistent between API response and client mapping, the breakdown collapses into a single "unknown" type.

---

## 6. 🎨 Phase 2: Design Overhaul Remaining

### P2.1: Settings Side Panel — Already Implemented ✅
- **Status:** ✅ **Already DONE** in `SettingsForm.tsx` (L297-369) — uses a vertical side navigation panel with active section highlighting. The MASTER_PLAN.md was outdated on this.
- **Checklist:**
  - ✅ Side panel with vertical list of sections
  - ✅ Active section highlighting
  - ✅ Content area shows selected fields
  - ✅ Responsive (collapses via CSS breakpoints)
  - ⚠️ **Not used by all platforms** — verify Storyblok/Shopify use `SettingsForm`

### P2.2: Icon Modernization ✅ DONE
- All platforms verified emoji-free in the 2026-06-14 audit.

### P2.3: Design System Implementation
| Task | Status | Details |
|------|--------|---------|
| Modern component framework | ❌ TODO | Still using tailwind + custom; no shadcn/ui or MUI |
| Consistent type scale | ❌ TODO | H1-H3 sizes vary across platforms |
| Color system CSS variables | ⚠️ Partial | `--cmcc-primary`, `--cmcc-wp-blue` exist but incomplete |
| Dark mode final polish | ⚠️ Partial | Major fixes done (D1, D2); edge cases remain (Storyblok, Wix inline styles) |
| Spacing CSS variables | ❌ TODO | `--cmcc-space-3`, `--cmcc-space-4` exist but not universally used |
| Elevation/shadows | ⚠️ Partial | D5 fixed for stat/chart cards; modal/dropdown shadows inconsistent |

### P2.4: Responsive Design — ❌ NOT DONE ANYWHERE
| Task | All Platforms |
|------|---------------|
| Breakpoints (Mobile <640, Tablet 640-1024, Desktop >1024) | ❌ |
| Queue table → card layout on mobile | ❌ |
| Tab nav → horizontal scroll/hamburger on mobile | ❌ |
| Settings → vertical accordion on mobile | ❌ |
| Filters → collapsible panel on mobile | ❌ |
| Action buttons → icon-only on mobile | ❌ |

### P2.5: Interactive States
| Task | Status | Notes |
|------|--------|-------|
| `cursor: pointer` | ✅ | CSS rule for `button:not(:disabled)` |
| Hover states | ✅ | Throughout CSS + recent polish |
| Focus rings | ✅ | `*:focus-visible` global + input styles |
| Page transitions (tab switch) | ❌ TODO | No crossfade animation |
| Row action flash | ✅ | CSS keyframes for green/red/amber |
| Skeleton loading + shimmer | ⚠️ Partial | Components exist; shimmer CSS added; not universally applied across platforms |

### P2.6: Design Research — ❌ NOT DONE (non-code concern)

---

## 7. 🧩 Phase 3: UX Improvements Remaining

### P3.1: Navigation & IA
| Task | Status | Notes |
|------|--------|-------|
| WP admin submenu active state | ✅ | `handleTabChange` with `TAB_TO_SLUG` |
| Breadcrumb indicator | ✅ | `.cmcc-page-indicator` in WordPress |
| Consolidate extra WP admin menu items | ❌ TODO | Extra items still in sidebar |
| Loading states between tabs | ✅ | SkeletonTable/isLoading props present |

### P3.2: Forms & Data Entry
| Task | Status | Notes |
|------|--------|-------|
| Settings re-submit after re-fetch | ✅ | `useEffect` syncs values |
| Form validation display | ❌ TODO | `validators` exist in `useSettings.js` but `SettingsForm` only validates on blur/submit. The validation IS wired in the component — but no visual indication of *which* fields failed until the user interacts with them. |
| Reset button | ✅ | Disabled when not dirty |
| Confirmation dialogs for destructive actions | ✅ | `ConfirmActionDialog` + `ConfirmationModal` |

### P3.3: Empty States & Error Handling
| Task | Status | Notes |
|------|--------|-------|
| Proper empty states | ⚠️ Partial | `EmptyState` component exists but not used everywhere (Storyblok uses text-only, Wix has inline rendering) |
| Error boundaries | ✅ | `ErrorBoundary` in WordPress `index.js` |
| Retry buttons on API failures | ⚠️ Partial | Present in some pages (QueuePage), missing in others |
| 401/403 graceful handling | ❌ TODO | No auth error handling anywhere |
| Network offline state | ✅ | `OfflineBanner` + `useOnlineStatus` across all 5 platforms |

### P3.4: Onboarding
| Task | Status | Notes |
|------|--------|-------|
| Fix layout (vertical, skip button) | ✅ | Done in `OnboardingOverlay` |
| Step progress indicator | ✅ | Progress bar + step dots |
| Skippable + re-launchable | ⚠️ Partial | Skippable (localStorage). Re-launch from help menu not implemented. |
| Storyblok onboarding uses inline styles | ❌ TODO | Storyblok App.jsx L209-335 has its own inline-styled onboarding, NOT using `OnboardingOverlay` component |

---

## 8. 🌐 Phase 4: Cross-Platform Parity — Detailed Gaps

### Feature Parity Matrix (Current)

| Feature | WordPress | Shopify | Storyblok | Wix | Strapi |
|---------|-----------|---------|-----------|-----|--------|
| **5 Tabs** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Toast notifications** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Keyboard shortcuts (8)** | ✅ | ✅ | ⚠️ (3 basic) | 🔴 (2 only) | ✅ |
| **Theme toggle** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OfflineBanner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Onboarding wizard** | ✅ | ✅ | ⚠️ (inline styles) | ✅ | ✅ |
| **Reports page** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Search functionality** | ✅ | ✅ | ⚠️ (client-only) | ❌ | ❌ |
| **Pagination** | ✅ | ✅ | ⚠️ (client-only) | ⚠️ (client-only) | ❌ |
| **NotificationBadge** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **AI Settings form** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Import/Export settings** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Uses SettingsForm** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Save filter** | ✅ | ⚠️ (custom) | ❌ (no-op) | ✅ | ✅ |
| **Item detail panel** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Confirmation dialogs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Inline styles usage** | Minimal | Low | **35 instances** | **10 instances** | Minimal |
| **Separate page components** | ✅ | ✅ | ✅ | ❌ (inner functions) | ✅ |
| **QueueTable readItem** | ✅ | ❌ | ❌ | ❌ | ⚠️ |

### Platform-Specific Deep-Dive Issues

#### WordPress
1. ⚠️ **App.css 3,900+ lines** — needs structural refactor
2. ⚠️ **Nonce refresh** not implemented
3. ⚠️ **`deactivate-users`** endpoint is a no-op (CRIT-1)
4. ⚠️ **AI evaluation** returns dummy data (CRIT-2)
5. ✅ **Only platform with all features fully wired**

#### Shopify
1. 🔴 **Custom saved filters** — doesn't use `useSavedFilters` from `@cmcc/ui`
2. 🔴 **No item detail/slide-out panel** — `onReadItem` not wired anywhere
3. 🔴 **No confirmation dialogs** for destructive actions
4. ⚠️ **Theme uses `darkMode` boolean** instead of `'light'/'dark'` string (inconsistent)
5. ⚠️ **Keyboard shortcuts** — actions work on first queue item, not the "selected" item (no selection state)
6. 🔴 **`handleSaveFilter` uses custom state** (`filterNameInput`, `filterPopoverActive`) — not shared

#### Storyblok
1. 🔴 **No `useSavedFilters`** — save filter is a no-op
2. 🔴 **QueueTable missing 8 props** — `onReadItem`, `onSearch`, `onFilterChange`, `onSort`, `sortField`, `sortDirection`, `onBulkAction`, `totalCount`
3. 🔴 **35 inline `style={{}}` declarations** across App.jsx — no dark mode support for any of them, impossible to theme
4. 🔴 **Onboarding is inline** (L209-335) — not using `OnboardingOverlay` component
5. 🔴 **No `NotificationBadge`** — pending/spam counts not shown
6. ⚠️ **No confirmation dialogs** for any actions
7. ⚠️ **Keyboard shortcuts** — exist but only 3 basic (`a`, `r`, `s`) — missing `d`, `v`, `f`, `Escape`, `?`
8. ⚠️ **Loading states** — just text "Loading queue..." (L121), no skeleton
9. ⚠️ **No import/export settings** buttons

#### Wix
1. 🔴 **Only 2 keyboard shortcuts functional** — `?` and `f` (CRIT-3)
2. 🔴 **QueueTable filters are no-op** (CRIT-4)
3. 🔴 **Tab content uses inner functions** — `renderQueueTab()`, `renderAnalyticsTab()`, `renderActivityTab()` cause full unmount/mount on every render (CRIT-5)
4. 🔴 **No confirmation dialogs** — approve/reject/spam/defer fire immediately without confirmation
5. 🔴 **Inline toast rendering** — not using `ToastContainer` component
6. 🔴 **Inline shortcuts modal** — not using `ShortcutsModal` component
7. 🔴 **No search wired** — QueueTable's `onSearch` prop is passed as undefined
8. ⚠️ **No `onPerPageChange`** — `perPage` is hardcoded at `25`
9. ⚠️ **Pagination is client-side only** — `totalCount` equals `queueItems.length`, not server total
10. ⚠️ **Tab icons as string vs component** — TABS array uses JSX for icons (correct) but `tab.icon` renders them inline
11. ⚠️ **No useToast hook** — `addToast` is defined inline (L192-198)

#### Strapi
1. 🔴 **No search functionality** — QueueTable's `onSearch` prop is not passed
2. 🔴 **No pagination** — QueueTable's `page`, `onPageChange`, `perPage`, `totalCount` props are not passed
3. 🔴 **No NotificationBadge** — pending/spam counts not shown on tabs
4. ⚠️ **No confirmation dialogs** for actions
5. ⚠️ **Duplicate plugin code** — `platforms/strapi/admin/src/pages/App/index.jsx` and `cmcc-strapi-app/src/plugins/cmcc/admin/src/pages/App/index.jsx` are near-identical
6. ⚠️ **QueueTable `onReadItem`** — exists but may not open detail panel correctly

---

## 9. 🧪 Phase 5: Testing & QA

### Visual Testing (All ❌)
- [ ] Screenshot every page in light + dark mode
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Viewport: Mobile 375px, Tablet 768px, Desktop 1280px+
- [ ] WCAG AA color contrast audit

### Functional Testing (All ❌)
- [ ] CRUD operations for queue items (all platforms)
- [ ] Filter combinations (status, content type, date range, search)
- [ ] Pagination + per-page (all platforms)
- [ ] Settings save/load/reset cycle
- [ ] CSV export (all platforms)
- [ ] Settings import/export
- [ ] Keyboard shortcuts (all platforms)

### Performance (All ❌)
- [ ] Test with 10,000+ queue items
- [ ] Test with 100+ activity log entries
- [ ] Monitor API response times
- [ ] React render optimization audit (`React.memo`, `useMemo`, `useCallback`)

---

## 10. 🏗️ Architecture & Technical Debt

### CA1: Storyblok App.jsx — 35 inline styles, ~580 lines, needs component extraction
- **File:** `platforms/storyblok/src/App.jsx`
- **Lines:** ~580 lines
- **Issues:**
  - 35 inline `style={{}}` declarations
  - No dark mode for any inline-styled element
  - Onboarding overlay, top bar, tab nav, toasts, shortcuts modal all inline
  - Should use same extracted components as WordPress (`TopBar`, `TabNavigation`, `OnboardingOverlay`, etc.)
- **Priority:** 🟡 High — Makes theming impossible, blocks responsive design

### CA2: Wix App.jsx — ~1,160 lines, inner render functions, monolithic
- **File:** `platforms/wix/src/App.jsx`
- **Lines:** ~1,160 lines
- **Issues:**
  - All state defined at top (30+ `useState` calls)
  - Tab rendering as inner functions (re-created every render)
  - No extraction of domain hooks (queue/analytics/activity state managed inline)
  - Inline toast/shortcuts modal rendering
  - 10 inline `style={{}}` declarations
- **Priority:** 🔴 High — Causes re-render issues, blocks maintenance

### CA3: Strapi duplicate plugin code
- Two near-identical copies: `platforms/strapi/admin/src/pages/App/index.jsx` and `cmcc-strapi-app/src/plugins/cmcc/admin/src/pages/App/index.jsx`
- `make sync-strapi-plugin` exists but manual
- **Risk:** Bug fixes must be applied twice

### CA4: WordPress App.css — 3,900+ lines
- Dark mode overrides at bottom, no organized section separation
- Many `tw-` utility classes duplicated in CSS
- **Recommendation:** Split into per-component CSS files or CSS modules

### CA5: Storyblok QueuePage placeholder saveFilter + inline styles
- `const { saveFilter } = React.useMemo(() => ({ saveFilter: () => {} }), [])`
- 20+ inline `style={{}}` declarations in QueuePage.jsx

### CA6: Shopify custom saved filters
- Custom implementation with `JSON.parse`/`JSON.stringify` instead of `useSavedFilters`
- Different schema, no `deleteSavedFilter`

### CA7: Wix uses `useToast` inline instead of extracted hook
- `addToast` defined at L192-198 inside App component
- Not using the extracted `useToast` hook used by WordPress

### CA8: Backend PHP endpoint `deactivate-users` is a no-op
- Function exists but body is `return new WP_REST_Response(array('success' => true))`
- No call to `wp_deactivate_user()` or any user modification

### CA9: AI evaluation endpoint returns hardcoded stub data
- `cmcc_rest_ai_evaluate` returns `{ spamScore: 0.15, ... }` always

### CA10: Nonce refresh not implemented in WordPress
- After 12 hours, all REST API calls fail silently

### CA11: No platform-level error boundary wrappers
- WordPress wraps `<App>` in `<ErrorBoundary>`, but other platforms don't

---

## 11. ⚡ Pre-Existing Test Failures

| Platform | Passing | Total | Root Cause | Priority |
|----------|---------|-------|------------|----------|
| Storyblok | 4 | 23 | Babel config not resolving JSX transforms for platform-specific files. Mocks for `@cmcc/ui` components may be missing or incomplete. | 🟡 High |
| Wix | 0 | 10 | `@cmcc/ui` component resolution fails. Webpack externals for React are not mocked in Jest. `__mocks__/cmcc-ui.jsx` may not export all needed components. | 🟡 High |
| Strapi | 117 | 119 | 2 pre-existing server test failures (unrelated to UI code) | 🟢 Low |

---

## 12. 📋 Recommended Sprint Plan

### Sprint 1: Backend Fixes (HIGHEST PRIORITY)
1. ✅ **P1.1** — Fix `cmcc_rest_deactivate_users` to actually deactivate WordPress users (`wp_deactivate_user()`)
2. ✅ **P1.1** — Fix `cmcc_rest_ai_evaluate` to use actual keyword/pattern analysis instead of stub data
3. ✅ **P1.1** — Fix `/export-csv` to return real CSV or document the client-side workaround

### Sprint 2: Wix Critical Fixes
1. ✅ **CRIT-3** — Add remaining 6 keyboard shortcuts to Wix
2. ✅ **CRIT-4** — Wire `onFilterChange` and filter state in Wix QueueTable
3. ✅ **CRIT-5** — Extract `renderQueueTab`, `renderAnalyticsTab`, `renderActivityTab` to proper components
4. ✅ **CA2** — Extract Wix hooks (`useToast`, etc.) and use shared components (`ToastContainer`, `ShortcutsModal`)

### Sprint 3: Storyblok Overhaul
1. ✅ **CA1/CA5** — Extract all inline styles to CSS classes; use shared components (`TopBar`, `TabNavigation`, `OnboardingOverlay`, `ToastContainer`, `ShortcutsModal`)
2. ✅ **P1.2-C** — Wire all missing QueueTable props (`onReadItem`, `onSearch`, `onFilterChange`, `onSort`, etc.)
3. ✅ **P1.2-B** — Fix save filter (import `useSavedFilters`)
4. ✅ Add `NotificationBadge` and import/export settings buttons

### Sprint 4: Strapi Parity
1. ✅ Wire search (`onSearch` prop), pagination (`page`, `onPageChange`, `perPage`)
2. ✅ Add `NotificationBadge` to tabs
3. ✅ Document duplicate plugin sync procedure

### Sprint 5: Shopify Consistency
1. ✅ Replace custom saved filters with `useSavedFilters`
2. ✅ Add confirmation dialogs for destructive actions
3. ✅ Add item detail slide-out panel (`onReadItem`)
4. ✅ Fix theme state to use `'light'/'dark'` string

### Sprint 6: Cross-Cutting UX
1. **P2.4** — Responsive design: mobile breakpoints across all platforms
2. **P2.5** — Page transition animation on tab switch
3. **P3.2** — Form validation visual feedback improvements
4. **P1.1-D** — Nonce refresh for WordPress
5. **P3.3** — Add retry buttons, 401/403 handling

### Sprint 7: Testing & QA
1. Fix Storyblok test configuration
2. Fix Wix test configuration
3. Visual regression testing
4. Cross-browser testing
5. WCAG AA compliance audit

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ **DONE** | Verified implemented |
| ⚠️ **Partial** | Partially done, gaps remain |
| ❌ **TODO** | Not yet implemented |
| 🔴 **Critical** | Blocks functionality or is a security/privacy risk |
| 🟡 **High** | Major feature gap or user-facing bug |

**Key findings from this audit:**
- **Critical backend bugs:** `deactivate-users` no-op, AI evaluation stub
- **Wix:** 5 critical issues (shortcuts, filters, inner functions, toasts, no confirmation)
- **Storyblok:** Massive inline-style problem (35 instances), save filter no-op, missing QueueTable props
- **Strapi:** Search + pagination + NotificationBadge all missing
- **Shopify:** Custom saved filters (not shared), no detail panel
- **P2.1 (Settings side panel):** Already implemented in `SettingsForm.tsx` — MASTER_PLAN.md was outdated
- **P2.4 (Responsive):** 0% done across all platforms — single biggest UX gap
- **483+ tests passing** — up from ~327, but Storyblok (4/23) and Wix (0/10) remain broken
