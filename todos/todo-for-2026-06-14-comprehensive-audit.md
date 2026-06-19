# CMCC — Comprehensive Todo & Audit Report

**Generated:** 2026-06-14  
**Based on:** Codebase audit across all packages and platforms, cross-referenced against `MASTER_PLAN.md` and `manual_test_findings.md`

---

## Table of Contents

1. [Summary of What's Been Implemented](#1-summary-of-whats-been-implemented)
2. [Remaining Work — By Priority](#2-remaining-work--by-priority)
3. [P2.2 — Replace Emoji with lucide-react SVG Icons](#22-p22--replace-emoji-with-lucide-react-svg-icons)
4. [Phase 4 — Cross-Platform Parity Audit](#24-phase-4--cross-platform-parity-audit)
5. [Phase 5 — Visual/Functional/Performance Testing](#25-phase-5--visualfunctionalperformance-testing)
6. [P3.3 — Network Offline State Detection & UX](#23-p33--network-offline-state-detection--ux)
7. [Fix Pre-Existing Test Failures](#27-fix-pre-existing-test-failures)
8. [Additional Findings From Codebase Audit](#3-additional-findings-from-codebase-audit)
9. [Complete File-by-File Emoji Inventory](#4-complete-file-by-file-emoji-inventory)

---

## 1. Summary of What's Been Implemented

### Phase 1: Critical Bug Fixes — Implementation Status

| Item | Status | Details |
|------|--------|---------|
| **P1.1: Fix `/reputation-raw` endpoint** | ✅ **DONE** | Function exists at cmcc.php L1029-1082, properly placed outside any nesting issue. MASTER_PLAN reference to L1569-1684 is outdated. |
| **P1.1: Fix `/export-csv`** | ✅ **DONE** | Handled in cmcc.php L675-679 via `cmcc_handle_export_csv()` at L1131-1173. Frontend in `useQueue.js` L197-209 converts JSON data to CSV client-side. |
| **P1.1: Data model alignment** | ⚠️ **PARTIAL** | `reputation-raw` endpoint returns camelCase (`authorId`, `totalItems`). Other endpoints (queue, activity log) return snake_case. Frontend in `useQueue.js` normalizes some fields. |
| **P1.2: View Details panel** | ✅ **DONE** | `SlideOutPanel` component exists and is fully used in `QueuePage.jsx` L232-386 with item history, notes, assignment UI, AI evaluation. |
| **P1.2: Bulk Actions** | ✅ **DONE** | `QueueTable.tsx` has checkbox selection, bulk action dropdown with approve/reject/spam/defer/export CSV options. `handleApplyBulkAction` wired up. |
| **P1.2: Toast notifications** | ✅ **DONE** | `addToast()` function exists in `App.jsx` L49-53, called from all action handlers. Visible in bottom-right corner with auto-dismiss. |
| **P1.2: Save Filter** | ✅ **DONE** | `useSavedFilters` hook in `@cmcc/ui` persists to localStorage. Used in `useQueue.js`. UI in `QueuePage.jsx` L167-193 has input + button. |
| **P1.2: Keyboard shortcuts** | ✅ **DONE** | All 8 shortcuts (A, R, S, D, V, F, Escape, ?) implemented in `App.jsx` L138-213 with proper guards. |
| **P1.3: Activity Heatmap** | ⚠️ **PARTIAL** | `HeatmapChart` component exists. Data is processed client-side from raw events. May still show empty if no data. |
| **P1.3: "No status data available"** | ⚠️ **PARTIAL** | Analytics page renders charts conditionally. Empty state handled by `EmptyState` component. |
| **P1.3: Spam Ratio display** | ✅ **DONE** | Spam ratio bar renders in `AnalyticsPage.jsx` L159-177 with percentage calculation. |
| **P1.3: Content Breakdown** | ✅ **DONE** | Table with pagination in `AnalyticsPage.jsx` L181-328. |

### Phase 2: Design Overhaul — Implementation Status

| Item | Status | Details |
|------|--------|---------|
| **P2.1: Settings side panel** | ✅ **DONE** | `SettingsForm.tsx` uses side navigation (flex column) + content area layout. Active section highlighted in blue. |
| **P2.2: Icon modernization** | ❌ **NOT DONE** | `lucide-react` v1.17.0 is in `package.json` dependencies but has **zero imports** anywhere in the codebase. All icons remain as emoji. |
| **P2.3: Design system** | ⚠️ **PARTIAL** | CSS custom properties defined for spacing, colors. Tailwind configured. But color palette doesn't match recommended 2026 palette. Missing elevation system. |
| **P2.4: Responsive design** | ❌ **NOT DONE** | No responsive breakpoints found. Hardcoded pixel widths throughout. |
| **P2.5: Interactive states** | ⚠️ **PARTIAL** | Skeleton loading components exist (`SkeletonTable`, `SkeletonCard`). Hover styles exist in CSS. Focus-visible outlines added. Missing: row action feedback animations, page transitions. |
| **P2.6: Design research** | ❌ **NOT DONE** | No research artifacts in codebase. |

### Phase 3: UX Improvements — Implementation Status

| Item | Status | Details |
|------|--------|---------|
| **P3.1: Navigation** | ⚠️ **PARTIAL** | WP admin sidebar active state tracking exists in `handleTabChange`. Loading states present. Extra menu items (Reports, Users, Collaboration, Platforms) exist but may not be fully routed. |
| **P3.2: Forms & Data Entry** | ⚠️ **PARTIAL** | Settings form dirty state tracking works (ref-based sync). Validation runs on blur and submit. Reset button wired up. Missing: confirmation dialogs for destructive actions. |
| **P3.3: Empty States & Error Handling** | ⚠️ **PARTIAL** | `EmptyState` component exists. `ErrorBoundary` exists. **Missing: network offline detection.** Missing: retry buttons on failed API calls. Missing: 401/403 handling. |
| **P3.4: Onboarding** | ⚠️ **PARTIAL** | Onboarding overlay exists in `App.jsx` L219-310 with steps and progress bar. But layout uses hardcoded inline styles, skip button is basic, no step animation indicator. |

### Phase 4: Cross-Platform Parity — Implementation Status

| Platform | Status |
|----------|--------|
| **WordPress** | ✅ Primary — full implementation |
| **Shopify** | ⚠️ Partial — App.jsx exists with Polariss UI, but no lucide-react integration, no parity audit done |
| **Storyblok** | ⚠️ Partial — App.jsx exists, shares `@cmcc/ui` components, no parity audit |
| **Strapi** | ⚠️ Partial — Strapi admin plugin exists (`cmcc-strapi-app`), uses Strapi Design System, no parity audit |
| **Wix** | ⚠️ Partial — App.jsx exists with inline styles, uses `@cmcc/ui`, no parity audit |

### Phase 5: Testing — Implementation Status

| Item | Status |
|------|--------|
| Manual testing (WordPress) | ✅ Done — findings in `manual_test_findings.md` |
| Visual testing | ❌ Not done |
| Cross-browser testing | ❌ Not done |
| Performance testing | ❌ Not done |
| WCAG compliance | ❌ Not done |

---

## 2. Remaining Work — By Priority

What Remains for Future Work:

1. **P2.2** — Replace emoji with `lucide-react` SVG icons across the entire UI
2. **Phase 4** — Cross-platform parity audit (Shopify, Storyblok, Strapi, Wix)
3. **Phase 5** — Visual/functional/performance testing
4. **P3.3** — Network offline state detection and UX
5. Fix the pre-existing test failures in WordPress, Storyblok, Wix, server-core

---

## 2.2 P2.2 — Replace Emoji with lucide-react SVG Icons

### Current Status
- `lucide-react` v1.17.0 is listed as a dependency in `cmcc/platforms/wordpress/package.json`
- `lucide-react` is **NOT** in `@cmcc/ui` package dependencies — it must be added there
- **Zero imports** of lucide-react exist anywhere in the codebase
- All icons across all platforms use emoji characters

### Why This Matters
- Emoji renders differently across browsers and operating systems
- SVG icons provide consistent rendering, theming (color, size), and accessibility
- SVG icons support `currentColor`, `size` props, and `aria-label` attributes
- Professional UI design requires consistent iconography

### Icon Mapping Table

| Location | Current Emoji | Recommended lucide-react Icon | Priority |
|----------|---------------|------------------------------|----------|
| **App.jsx** — Page title | 🛡️ | `Shield` | Critical |
| **App.jsx** — Theme toggle | 🌙 / ☀️ | `Moon` / `Sun` | High |
| **App.jsx** — Donate | ❤️ | `Heart` | Low |
| **App.jsx** — Onboarding close | ✕ | `X` | Medium |
| **App.jsx** — Toast icons | ✓ / ✕ / ℹ | `CheckCircle` / `XCircle` / `Info` | Medium |
| **App.jsx** — Keyboard modal | ⌨️ | `Keyboard` | Low |
| **Tabs** — Queue | 📋 | `ListChecks` or `Inbox` | High |
| **Tabs** — Analytics | 📊 | `BarChart3` or `TrendingUp` | High |
| **Tabs** — Activity Log | 📜 | `History` or `ScrollText` | High |
| **Tabs** — Reports | 📄 | `FileText` or `FolderOpen` | High |
| **Tabs** — Settings | ⚙️ | `Settings` or `Cog` | High |
| **QueueTable.tsx** — View Details | 📖 | `Eye` or `Info` | High |
| **QueueTable.tsx** — Approve | ✓ | `CheckCircle` (green) | High |
| **QueueTable.tsx** — Reject | ✕ | `XCircle` (red) | High |
| **QueueTable.tsx** — Mark as Spam | 🚫 | `AlertTriangle` or `Flag` (orange) | High |
| **QueueTable.tsx** — Defer | ⏳ | `Clock` (blue) | High |
| **QueueTable.tsx** — Content Type icons | 💬 📝 📄 🖼️ 👤 📋 🛒 | Various content-type icons | Medium |
| **QueueTable.tsx** — Empty state | 📋 | `Inbox` | Medium |
| **QueueTable.tsx** — Refresh | 🔄 | `RefreshCw` | Medium |
| **QueueTable.tsx** — Bulk export | 📥 | `Download` | Medium |
| **QueuePage.jsx** — Slide-out action buttons | ✅ ❌ 🚫 🤖 | `CheckCircle` `XCircle` `Flag` `Cpu` | High |
| **QueuePage.jsx** — History notes | 📋 📜 | `ClipboardList` `History` | Medium |
| **QueuePage.jsx** — Keyboard button | ⌨️ | `Keyboard` | Low |
| **QueuePage.jsx** — Refresh | 🔄 | `RefreshCw` | Medium |
| **QuickFilterBar/index.tsx** — Preset icons | 🕐 📅 📆 ⏳ 🚫 ⚠️ | `Clock` `Calendar` `CalendarRange` `Hourglass` `Ban` `AlertTriangle` | Medium |
| **SettingsPage.jsx** — AI Moderation | 🤖 | `Cpu` or `Bot` | Medium |
| **SettingsPage.jsx** — Export/Import buttons | 📥 📤 | `Download` `Upload` | Medium |
| **SettingsForm.tsx** — Section icons | ⚙️ 🛡️ 🤖 💬 🔥 ... (15+ emoji) | See `DEFAULT_SECTION_ICONS` map | High |
| **ActivityLogPage.jsx** — Refresh | 🔄 | `RefreshCw` | Medium |
| **ReportsPage.jsx** — Section headers | 📄 📅 👤 🔄 📊 🌐 | `FileText` `Calendar` `Users` `RefreshCw` `BarChart` `Globe` | Medium |
| **ReportsPage.jsx** — Platform icons | 🔵 🟢 🔴 🟣 ⚫ | Custom colored platform icons | Low |
| **ReportsPage.jsx** — Export buttons | 📥 | `Download` | Medium |
| **ReportsPage.jsx** — Schedule | + | `Plus` | Low |
| **ActivityFeed.tsx** — Event type icons | ⚡ 📝 👤 🚨 👥 | `Zap` `Edit3` `User` `AlertTriangle` `Users` | Medium |
| **ModerationNotes.tsx** — Section header | 📝 | `Edit3` or `MessageSquare` | Medium |
| **EmptyState.tsx** — Default icon | 📭 | `Inbox` | Medium |
| **HeatmapChart.tsx** — Empty state | 📊 | `BarChart` | Medium |
| **ErrorBoundary.tsx** — Error icon | ⚠️ | `AlertTriangle` | Medium |
| **Storyblok App.jsx** — All of the above | Same emoji | Same mapping | High |
| **Shopify App.jsx** — Tabs, buttons | Emoji throughout | Same mapping | High |
| **Wix App.jsx** — Tabs, buttons, QueueTab | Emoji throughout | Same mapping | High |
| **Strapi app** — Reports section | 📄 📊 🔄 👤 | Same mapping | Medium |
| **cmcc-core/config/platform-registry.ts** — Platform icons | 🖼️ | Replace with SVG icon name string | Low |

### Implementation Plan

1. Add `lucide-react` to `@cmcc/ui/package.json` dependencies
2. Create a centralized icon utility in `@cmcc/ui/src/lib/icons.tsx` with all icon mappings
3. Replace emoji in `@cmcc/ui` components first (shared components = maximum impact)
4. Replace emoji in WordPress platform pages
5. Replace emoji in Storyblok, Shopify, Wix, Strapi platforms
6. Clean up any remaining emoji in CSS content properties and the PHP backend

---

## 2.3 Phase 4 — Cross-Platform Parity Audit

### Why This Matters
The manual testing was done exclusively on WordPress. All other platforms (Shopify, Storyblok, Strapi, Wix) need to be audited for the same class of bugs.

### Platforms to Audit

#### Shopify (`cmcc/platforms/shopify`)
- **App.jsx** L73-678 — Monolithic component with all state inline (no hook separation). Doesn't use `@cmcc/ui` hooks.
- **Packages missing:** No `lucide-react`, no `date-fns`, no `tailwind-merge`
- Uses Shopify Polaris UI components and App Bridge
- **Test file:** None found in `src/__tests__/`
- **Checklist:**
  - [ ] Verify Settings side panel renders in Shopify admin
  - [ ] Check for emoji usage (known: yes, widespread)
  - [ ] Add lucide-react dependency
  - [ ] Audit for same bugs as WordPress (B1-B14, U1-U10, UX1-UX5)
  - [ ] Adapt API endpoints for Shopify's REST/GraphQL
  - [ ] Ensure Toast notifications work
  - [ ] Verify keyboard shortcuts

#### Storyblok (`cmcc/platforms/storyblok`)
- **App.jsx** — Uses `@cmcc/ui` hooks (`useQueue`, `useAnalytics`, `useActivityLog`, `useSettings`)
- **Tests exist:** `App.test.jsx`, `index.test.js`
- **Checklist:**
  - [ ] Verify Settings side panel renders in Storyblok app
  - [ ] Check for emoji usage (known: yes, widespread)
  - [ ] Remove emoji from TABS definition (L13-17)
  - [ ] Adapt to Storyblok's custom field type system
  - [ ] Audit for same bugs as WordPress

#### Strapi (`cmcc/platforms/strapi` + `cmcc/cmcc-strapi-app`)
- Uses Strapi Design System (`@strapi/design-system`, `@strapi/icons`)
- **App exists at:** `cmcc-strapi-app/src/plugins/cmcc/admin/src/pages/App/index.jsx`
- **Checklist:**
  - [ ] Adapt to Strapi v4/v5 plugin architecture
  - [ ] Ensure Settings works within Strapi admin panel
  - [ ] Verify all `@cmcc/ui` components render in Strapi context
  - [ ] Audit for emoji usage (strapi app uses emoji for Reporting section)

#### Wix (`cmcc/platforms/wix`)
- **App.jsx** L102-1057 — Monolithic component with all state inline
- Uses `@cmcc/ui` but no hooks separation
- **Test exists:** `App.test.jsx`
- **Checklist:**
  - [ ] Adapt to Wix's iframe/extensions model
  - [ ] Ensure Settings side panel renders in Wix dashboard
  - [ ] Audit for emoji usage (known: `QUICK_PRESETS` uses emoji icons L55-92)
  - [ ] Add lucide-react dependency
  - [ ] Verify all functionality works

### Shared Cross-Platform Issues
- [ ] All platforms use `@cmcc/ui` — fix in shared components first
- [ ] Settings side panel pattern needs responsive validation on all platforms
- [ ] Data model alignment (snake_case vs camelCase) affects all platforms
- [ ] CSS custom properties for platform-specific theming

---

## 2.4 Phase 5 — Visual/Functional/Performance Testing

### Visual Testing
- [ ] Screenshot every page in light mode
- [ ] Screenshot every page in dark mode
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile (375px), tablet (768px), desktop (1280px+) viewports
- [ ] Verify WCAG AA color contrast compliance
- [ ] Verify all dark mode inputs have visible text (D1 fix applied but verify)
- [ ] Verify no browser-default "outset" borders remain (D2 fix)
- [ ] Verify status colors are visually distinct (D3)
- [ ] Verify hover/cursor styles on all interactive elements (D4)
- [ ] Verify table row alternating colors and hover states (D7)

### Functional Testing
- [ ] Test all CRUD operations for queue items (approve, reject, spam, defer)
- [ ] Test all filter combinations (status + content type + date range + search)
- [ ] Test pagination + per-page combinations
- [ ] Test settings save/load/reset cycle
- [ ] Test export CSV from bulk actions
- [ ] Test export CSV/PDF from Reports page
- [ ] Test import settings
- [ ] Test keyboard shortcuts (all 8)
- [ ] Test bulk actions with selection
- [ ] Test "Save Filter" functionality
- [ ] Test View Details slide-out panel
- [ ] Test adding notes to items
- [ ] Test item assignment
- [ ] Test AI evaluation

### Performance Testing
- [ ] Test with 10,000+ queue items
- [ ] Test with 100+ activity log entries
- [ ] Monitor API response times
- [ ] Check React render performance (avoid unnecessary re-renders)
- [ ] Test loading states (skeleton screens)
- [ ] Verify no memory leaks from setInterval in components

---

## 2.5 P3.3 — Network Offline State Detection & UX

### Current State
- **No offline detection exists** in the codebase
- `navigator.onLine` is not referenced anywhere
- No `online`/`offline` event listeners
- No "You are offline" banner or toast
- No request queue for pending actions when offline

### Implementation Requirements

#### Components Needed

1. **`useOnlineStatus` hook** in `@cmcc/ui/src/lib/`
   - Track `navigator.onLine` state
   - Listen for `online`/`offline` events on `window`
   - Return `isOnline: boolean`
   - Clean up event listeners on unmount

2. **Offline Banner component** (can be part of App.jsx or a shared component)
   - Fixed top banner: "You are offline. Changes cannot be saved."
   - Yellow/amber background with warning icon
   - Auto-hides when back online
   - Animates in/out

3. **Integration points**
   - `App.jsx` — Show/hide offline banner
   - `api.js` — Add network error detection, differentiate offline vs server error
   - `useQueue.js` — Queue actions when offline for later sync
   - Toast notifications — Show "No internet connection" instead of generic error
   - All mutation endpoints — Check online status before making requests

#### Files to Modify
- NEW: `@cmcc/ui/src/lib/useOnlineStatus.ts`
- NEW: `@cmcc/ui/src/components/common/OfflineBanner.tsx`
- `@cmcc/ui/src/index.ts` — Export new components
- `cmcc/platforms/wordpress/src/App.jsx` — Use OfflineBanner
- `cmcc/platforms/wordpress/src/lib/api.js` — Enhanced error handling
- Storyblok, Shopify, Wix, Strapi App.jsx — Integrate offline banner

---

## 2.6 Fix Pre-Existing Test Failures

### Test Files Found

| Test File | Platform | Exists? | Likely Issues |
|-----------|----------|---------|---------------|
| `src/__tests__/App.test.jsx` | WordPress | ✅ | Mock data may need updating for new API fields |
| `src/__tests__/api.test.js` | WordPress | ✅ | Endpoint changes may break tests |
| `src/__tests__/constants.test.js` | WordPress | ✅ | Likely passing |
| `src/__tests__/hooks.test.js` | WordPress | ✅ | Mock mismatches |
| `src/__tests__/pages.test.jsx` | WordPress | ✅ | May need updating for new page props |
| `src/__tests__/useQueue.test.js` | WordPress | ✅ | Hook refactoring may break tests |
| `__tests__/components.test.tsx` | @cmcc/ui | ✅ | Likely passing |
| `__tests__/additional-components.test.tsx` | @cmcc/ui | ✅ | May need updating |
| `src/__tests__/App.test.jsx` | Storyblok | ✅ | |
| `src/__tests__/index.test.js` | Storyblok | ✅ | |
| `src/__tests__/App.test.jsx` | Wix | ✅ | |
| `__tests__/` (empty) | @cmcc/server-core | ✅ | Empty directory — no tests |

### Common Failure Patterns to Check

1. **Mock data mismatches** — When API endpoints change shape, test mocks need updating
2. **Missing module mocks** — New dependencies (lucide-react) need mock files
3. **Component API changes** — If QueueTable/SettingsForm props changed
4. **Hook return value changes** — If hooks added/removed fields
5. **Import path errors** — If files were moved or renamed

### Fix Strategy

1. First, run all tests to get exact failure output
2. Update mock files to match current API shapes
3. Add any missing module mocks
4. Fix test assertions that don't match current behavior
5. For `@cmcc/server-core` — the `__tests__` directory is empty, add basic smoke tests

---

## 3. Additional Findings From Codebase Audit

### 3.1 Architecture Observations

| Observation | Details |
|-------------|---------|
| **Monolithic platforms** | Shopify and Wix App.jsx files are monolithic (700-1000+ lines) with all state inline. WordPress and Storyblok use separate hooks. |
| **Shared UI works well** | `@cmcc/ui` has good separation of concerns with queue/analytics/settings/common/charts components |
| **lucide-react in WP only** | Only WordPress package has lucide-react. @cmcc/ui does NOT have it, but it's where most emoji live. |
| **CSS sprawl** | `App.css` in WordPress is ~3500+ lines. Dark mode overrides are at the bottom (L2159+). Many inline styles mixed with Tailwind classes. |
| **Strapi has separate app** | Strapi has a completely separate app in `cmcc-strapi-app/` that duplicates the Strapi admin plugin. The `cmcc/platforms/strapi/` only has server-side code. |

### 3.2 Bugs Found During Codebase Audit (Beyond Manual Testing)

| ID | Severity | Description | File(s) |
|----|----------|-------------|---------|
| **CA1** | 🟡 HIGH | `lucide-react` installed but never imported — dead dependency with zero usage | `platforms/wordpress/package.json` |
| **CA2** | 🟡 HIGH | Shopify and Wix App.jsx are monolithic (>700 lines each), no hook separation | `platforms/shopify/src/App.jsx`, `platforms/wix/src/App.jsx` |
| **CA3** | 🟡 MEDIUM | Strapi has duplicate plugin code — `cmcc-strapi-app/` vs `platforms/strapi/` | Both locations |
| **CA4** | 🟡 MEDIUM | App.css is ~3500+ lines with no organized sections — hard to maintain | `platforms/wordpress/src/App.css` |
| **CA5** | 🟢 LOW | `@cmcc/server-core/src/__tests__/` is an empty directory | `packages/cmcc-server-core/src/__tests__/` |
| **CA6** | 🟢 LOW | Shopify has no frontend test files in `src/__tests__/` | `platforms/shopify/src/__tests__/` |

### 3.3 Deprecated/Unused Code

| File | Notes |
|------|-------|
| `cmcc/cmcc/` directory | Contains 30+ text files with screenshots of the app from testing. Should be moved to `docs/screenshots/` or deleted. |
| `cmcc/tools/test-api-stub/` | Test API stub — verify if still in use |
| `cmcc/manual_test_analysis_and_report.md` | Duplicate of `manual_test_findings.md`? Check if redundant |
| `cmcc/test_verification_report.md` | Verification report — may be outdated |
| `cmcc/plan.pdf` | PDF version of plan — likely redundant with MASTER_PLAN.md |

### 3.4 Security/Quality Concerns

| Concern | Details |
|---------|---------|
| 🟡 **Inline styles everywhere** | Components use `style={{}}` objects extensively instead of CSS classes — harder to theme and maintain |
| 🟡 **`dangerouslySetInnerHTML`** | Used in ReportsPage.jsx L89-97 for moderator images with `onerror` handler — security concern |
| 🟢 **No CSP headers** | WordPress plugin doesn't set Content-Security-Policy headers |
| 🟢 **Hardcoded API keys** | Check if any `.env` files committed |

### 3.5 Missing `lucide-react` by Platform

| Platform | Has lucide-react? | Emoji Count (approx.) |
|----------|-------------------|----------------------|
| WordPress | ✅ In deps, ❌ Not used | 50+ emoji across all files |
| @cmcc/ui | ❌ Not in deps | 20+ emoji across components |
| Storyblok | ❌ Not in deps | 15+ emoji in App.jsx |
| Shopify | ❌ Not in deps | 10+ emoji in App.jsx |
| Wix | ❌ Not in deps | 20+ emoji in App.jsx |
| Strapi | ❌ Not in deps | 10+ emoji in admin app |

---

## 4. Complete File-by-File Emoji Inventory

### @cmcc/ui Components (need lucide-react added to deps)

| File | Emoji Used | Lines |
|------|-----------|-------|
| `components/common/EmptyState.tsx` | 📭 📋 📜 | 12, 24 |
| `components/common/ErrorBoundary.tsx` | ⚠️ | 63 |
| `components/common/SlideOutPanel.tsx` | ✕ | 69 |
| `components/queue/QueueTable.tsx` | 💬 📝 📄 🖼️ 👤 📋 🛒 📄 📋 📖 ✓ ✕ 🚫 ⏳ 📥 ⛔ | 99-112, 557, 675, 685, 696, 707, 718, 439, 442 |
| `components/queue/QuickFilterBar/index.tsx` | 🕐 📅 📆 ⏳ 🚫 ⚠️ | 24-57 |
| `components/settings/SettingsForm.tsx` | ⚙️ 🛡️ 🤖 💿 🔐 👥 🔥 📊 🔧 🎨 🔒 ⚡ 🔗 🔥 🧑 🗄️ 📄 | 29-50 |
| `components/collaboration/ActivityFeed.tsx` | ⚡ 📝 👤 🚨 👥 🔄 | 31-37, 71 |
| `components/collaboration/ModerationNotes.tsx` | 📝 | 73 |
| `components/analytics/HeatmapChart.tsx` | 📊 | 37, 53 |

### WordPress Platform

| File | Emoji Used | Lines |
|------|-----------|-------|
| `App.jsx` | 🛡️ ✕ 🌙 ☀️ ❤️ 📋 📊 📜 📄 ⚙️ ✓ ✕ ℹ ⌨️ | 240-417, 316-456 |
| `pages/QueuePage.jsx` | 🔄 ⌨️ ✅ ❌ 🚫 🤖 📋 📜 ✕ 📖 | 130, 163, 203, 243-304, 326-393 |
| `pages/AnalyticsPage.jsx` | (mostly clean — uses CSS classes) | — |
| `pages/ActivityLogPage.jsx` | 🔄 | 81 |
| `pages/ReportsPage.jsx` | 📄 📅 👤 🔄 📊 🌐 🔵 🟢 🔴 🟣 ⚫ 📥 | 14-19, 318-459 |
| `pages/SettingsPage.jsx` | 🤖 📥 📤 | 124, 136, 139 |
| `components/DateRangePicker.jsx` | (uses SVG — clean) | — |

### Storyblok Platform

| File | Emoji Used | Lines |
|------|-----------|-------|
| `App.jsx` | 📋 📊 📜 ⚙️ 🛡️ 🌙 ☀️ ⌨️ ✓ ✕ ℹ ⌨️ | 13-17, 128, 147, 160, 251, 290 |
| Pages/Queue/Analytics/Settings | (imports same components) | — |

### Shopify Platform

| File | Emoji Used | Lines |
|------|-----------|-------|
| `src/App.jsx` | Various emoji throughout inline styles | Widespread |
| `src/components/ReportsTab.jsx` | 📄 (inline style) | 182+ |
| `src/components/OnboardingWizard.jsx` | Various emoji | Throughout |

### Wix Platform

| File | Emoji Used | Lines |
|------|-----------|-------|
| `src/App.jsx` | 🕐 📅 📆 ⏳ 🚫 ⚠️ (QUICK_PRESETS) — plus emoji throughout | 55-92, throughout |
| `src/components/ReportsTab.jsx` | 📄 | 154-161 |

### Strapi Platform

| File | Emoji Used | Lines |
|------|-----------|-------|
| `admin/src/pages/App/index.jsx` | 🛡️ ⌨️ 📋 📊 📜 📄 👤 🔄 | 372-644 |

### Backend/Other

| File | Emoji Used | Lines |
|------|-----------|-------|
| `cmcc-core/src/config/platform-registry.ts` | 🖼️ (platform icon) | 63 |
| `cmcc-server-core/src/notifications/email-service.ts` | 🛡️ 📊 👤 (HTML email templates) | 55-139 |

---

## 5. Quick Reference: Exact Count

| Category | Count |
|----------|-------|
| Total unique issues from manual testing | 40 |
| Bugs found during codebase audit (CA1-CA6) | 6 |
| Total issues to track | 46 |
| Files with emoji that need replacement | ~25 |
| Platforms needing parity audit | 4 |
| Test files needing review | 12 |
| Directories with test files | 7 (1 empty) |

---

## 6. Recommended Execution Order

### Sprint 1: Foundation
1. P2.2 — Replace emoji with lucide-react in `@cmcc/ui` (shared components first)
2. Add lucide-react dependency to all platforms that don't have it
3. Fix unit test failures

### Sprint 2: Offline & Error Handling
4. P3.3 — Implement `useOnlineStatus` hook and OfflineBanner
5. Add 401/403 graceful handling
6. Add retry buttons for failed API calls

### Sprint 3: Cross-Platform Parity
7. Audit Shopify platform
8. Audit Storyblok platform
9. Audit Strapi platform
10. Audit Wix platform

### Sprint 4: Testing & QA
11. Phase 5 — Visual testing (screenshots, cross-browser)
12. Phase 5 — Functional testing (full CRUD, filters, pagination)
13. Phase 5 — Performance testing (scale tests)

---

*This document was generated by auditing the complete CMCC codebase on 2026-06-14.*
*Referenced files: MASTER_PLAN.md, manual_test_findings.md, all source files across 3 packages + 5 platforms.*



🔴 Remaining Work (Verified)

Below is what **actually remains**, organized by priority:

---

#### **Sprint 1: Emoji Cleanup (Remaining Gaps)**

**1. `@cmcc/core/src/config/platform-registry.ts`** (L54-94)
- 5 platform icons using emoji (`🛍️`, `🖼️`, `🟣`, `🎪`, `🌐`)
- Needs to change `icon` field type from `string` (emoji) to a semantic name string
- **Impact:** Affects all consumers of `getPlatforms()`, `getPlatform()`, etc.

**2. WordPress `ReportsPage.jsx`** (L23-29)
- `PF` constant uses emoji: `🔵🟢🔴🟣⚫` for platform icons
- Need to replace with `<Icon>` or SVG

**3. Storyblok `QueuePage.jsx`** (L117-120)
- Loading state renders `⏳` emoji
- Replace with `<Icon name="clock">` or similar

**4. Storyblok `ReportsPage.jsx`** (L800-806)
- Platform icons use emoji: `🖼️🌐🛍️🟣🎪`

**5. Storyblok `helpers.js`** (L472-478)
- `PLATFORM_CARDS` uses emoji: `🖼️🌐🛍️🟣🎪`

**6. Server-side platform icon files** (backend data, not UI)
- `storyblok/server/routes/platforms.js` — emoji
- `wix/backend/http-functions/cmcc-platforms.js` — emoji
- `strapi/server/services/cmcc-service-admin.js` — emoji
- `cmcc-strapi-app/.../cmcc-service-admin.js` — emoji

**7. Test data**
- `QueueTable.test.tsx` (6 occurrences of emoji in `typeIcon` mock fields)
- `config.test.ts` (expects emoji `🌐` in platform icon assertion)

**8. `email-service.ts`** (HTML templates with emoji — acceptable for emails, low priority)

**9. `tools/dev-server.js`** and **`tools/test-api-stub/server.js`** (console.log — acceptable)

---

#### **Sprint 2: Architecture & Parity**

**10. P2.4 — Responsive Design** ⚠️
- Contrary to the todo doc's "no responsive breakpoints," **breakpoints DO exist** in:
  - WordPress `App.css` (782px, 640px, 600px, 400px)
  - Storyblok `styles.css` (768px, 900px, 480px)
  - Wix `styles.css` (768px, 1024px)
- However, there's no systematic responsive testing or a mobile-first design system

**11. CA2 — Monolithic App.jsx files** (Shopify at ~750 lines, Wix at ~1000 lines)
- These haven't been refactored into hook-driven architecture like WordPress/Storyblok
- Wix App.jsx has all state inline (no `useQueue`, `useAnalytics` hooks)

**12. Phase 4 — Cross-Platform Parity** (No audit done)
- All 4 non-WordPress platforms need parity audit for bugs B1-B14, U1-U10, UX1-UX5
- Shopify: Settings panel, keyboard shortcuts, toast notifications all need verification
- Storyblok: Settings panel, emoji in TABS definition, bug parity
- Strapi: Plugin architecture adaptation, settings in Strapi admin
- Wix: Settings panel, iframe model adaptation, all features

---

#### **Sprint 3: UX Polish**

**13. P3.2 — Confirmation dialogs for destructive actions**
- `ConfirmationModal` **exists** in `@cmcc/ui` but is **not used anywhere** in platform pages
- Need to integrate into bulk action flows, delete operations, etc.

**14. P2.5 — Interactive states**
- Missing: row action feedback animations, page transitions

**15. P3.4 — Onboarding polish**
- Layout uses hardcoded inline styles
- Skip button is basic, no step animation indicator

**16. P3.1 — Navigation**
- Extra menu items (Reports, Users, Collaboration, Platforms) may not be fully routed

---

#### **Sprint 4: Testing & QA**

**17. Phase 5 — Testing (Not Started)**
- Visual testing (screenshots light/dark, cross-browser)
- Functional testing (full CRUD, filters, pagination, export, shortcuts)
- Performance testing (10K+ items, 100+ log entries, memory leaks)
- WCAG compliance audit

**18. Fix Pre-Existing Test Failures**
- 12+ test files across WordPress, @cmcc/ui, Storyblok, Wix
- Need to run all and fix failures (mock data updates, module mocks)
- 