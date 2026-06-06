# CMCC Platform Audit Report

**Date:** 2026-06-06
**Scope:** All 5 platforms under `platforms/` + shared packages `packages/cmcc-core` and `packages/cmcc-ui`

---

## Executive Summary

The CMCC monorepo contains 5 platform integrations (WordPress, Strapi, Storyblok, Wix, Shopify) plus 2 shared packages. All platforms have been scaffolded with the correct directory structure, build config, and smoke tests. However, none of the platforms have reached production readiness. The projects are in a **functional prototype / early beta** state. Critical gaps exist in test coverage, production hardening, and platform-specific integration patterns.

---

## 1. Shared Packages

### `@cmcc/core` (TypeScript)

| Area | Status | Notes |
|------|--------|-------|
| Source code | ✅ Complete | Analytics, concurrency, firewall, queues, reputation modules all present |
| TypeScript build | ✅ Works | `dist/` has compiled `.js` and `.d.ts` files |
| Tests | ⚠️ Partial | 3 integration tests exist, but unit tests for individual modules are sparse |
| Exports | ✅ Proper | `index.ts` re-exports all modules |

**Issues:**
- No unit tests for `firewall/rules.ts`, `concurrency/index.ts`, `queues/index.ts`, `reputation/index.ts`
- Only `analytics/` has integration-level coverage, not per-module

### `@cmcc/ui` (TypeScript + React)

| Area | Status | Notes |
|------|--------|-------|
| Source code | ✅ Complete | QueueTable, HeatmapChart, SettingsForm, ActionButton, NotificationBadge all implemented |
| TypeScript build | ✅ Works | `dist/` has compiled output |
| Tests | ❌ None | `src/__tests__/` directory is empty |
| Style mock | ✅ Present | `src/__mocks__/styleMock.js` exists |

**Issues:**
- **Zero unit tests** for any of the 5 UI components
- No visual regression or snapshot tests

---

## 2. WordPress (`platforms/wordpress/`)

### Files

| File | Status | Size |
|------|--------|------|
| `cmcc.php` | ✅ Complete | 878 lines |
| `src/index.js` | ✅ Complete | React entry point |
| `src/App.jsx` | ✅ Complete | ~640 lines, 4-tab app |
| `src/App.css` | ✅ Complete | ~613 lines, scoped styles |
| `webpack.config.js` | ✅ Complete | Has correct WP externals |
| `jest.config.js` | ✅ Functional | jsdom environment, module mappers |
| `README.md` | ✅ Complete | Covers install, config, API, dev |
| `package.json` | ✅ Complete | All dependencies declared |
| `__mocks__/cmcc-core.js` | ✅ Present | Exports stubs |
| `__mocks__/cmcc-ui.jsx` | ✅ Present | React mock components |

### WordPress Plugin Best Practices

| Check | Status | Notes |
|------|--------|-------|
| Main plugin header (`cmcc.php`) | ✅ Present | Plugin name, URI, version, license, text domain |
| Activation/deactivation hooks | ✅ Present | `cmcc_activate()` creates DB tables, `cmcc_deactivate()` flushes rewrites |
| `uninstall.php` | ❌ **MISSING** | No cleanup on uninstall (should drop tables, remove options) |
| Upgrade routines | ❌ **MISSING** | No version comparison in `cmcc_activate()` - will fail on re-activation after updates |
| Sanitization callbacks | ✅ Present | `sanitize_text_field`, `sanitize_textarea_field`, `cmcc_sanitize_settings()` |
| Nonce verification | ⚠️ Partial | REST API uses `wp_create_nonce('wp_rest')` but no nonce verification on `$_GET['page']` |
| Capability checks | ✅ Present | `current_user_can('manage_options')` on all routes and render |
| i18n text domain | ✅ Present | `'cmcc'` text domain used with `esc_html__()`, `__()` |
| REST API | ✅ Complete | 7 endpoints registered under `cmcc/v1` |
| Admin menu | ✅ Present | Top-level menu + 3 submenu pages |

### Tests

- **File:** `src/__tests__/App.test.jsx`
- **Test count:** 7 tests
- **Type:** Smoke/rendering only
- **Coverage gaps:**
  - No API integration tests
  - No backend PHP unit tests
  - No database migration tests
  - No permission/security tests
  - No settings save/load tests
  - No activity log fetch tests

### Build Output

- `dist/cmcc-app.js` — 26 KB ✅
- `dist/cmcc-app.css` — 12 KB ✅
- External dependencies: React, ReactDOM, WordPress API packages

---

## 3. Strapi (`platforms/strapi/`)

### Files

| File | Status | Notes |
|------|--------|-------|
| `strapi-server.js` | ✅ Present | Entry → `./server` |
| `strapi-admin.js` | ✅ Present | Entry → `./admin/src` |
| `server/index.js` | ✅ Complete | Wires register, bootstrap, destroy, config, content-types, controllers, services, routes |
| `server/register.js` | ✅ Complete | Registers 7 permissions, logs content-type registration |
| `server/bootstrap.js` | ✅ Complete | Initializes default settings from config, verifies content types |
| `server/destroy.js` | ✅ Present | Placeholder cleanup |
| `server/config/index.js` | ✅ Complete | Default config with validator function |
| `server/content-types/index.js` | ✅ Complete | 3 content types: queue-item, activity-log, settings |
| `server/controllers/cmcc-controller.js` | ✅ Complete | 7 controller methods |
| `server/services/cmcc-service.js` | ✅ Complete | 10 service methods |
| `server/routes/index.js` | ✅ Complete | 7 routes with proper auth scopes |
| `admin/src/index.js` | ✅ Complete | Plugin registration with permissions |
| `admin/src/pluginId.js` | ✅ Correct | Reads from `package.json` |
| `admin/src/pages/App/index.js` | ✅ Complete | ~460 lines, full admin UI |
| `admin/src/components/Initializer/index.js` | ✅ Complete | Strapi initializer pattern |
| `admin/src/translations/en.json` | ✅ Complete | ~45 translation keys |
| `jest.config.js` | ✅ Functional | node environment |
| `README.md` | ✅ Complete | Covers install, config, permissions, API, content types, dev |
| `package.json` | ✅ Complete | Dependencies include @strapi/design-system, helper-plugin, icons |

### Strapi Patterns

| Check | Status | Notes |
|------|--------|-------|
| Proper v4/v5 plugin structure | ✅ Correct | `strapi-server.js` + `strapi-admin.js` pattern |
| Content-type schemas | ✅ Complete | 3 types with proper collection names |
| Controller patterns | ✅ Correct | Uses `ctx.send()`, `ctx.badRequest()` |
| Service patterns | ✅ Correct | Uses `strapi.entityService` |
| Route auth scopes | ✅ Complete | Each route has proper scope |
| Config validation | ✅ Present | Validator checks types and enum values |
| Bootstrap init | ✅ Complete | Creates default settings if missing |
| Destroy cleanup | ⚠️ Placeholder | Only logs, no actual cleanup |

### Tests

- **File:** `server/__tests__/cmcc-service.test.js`
- **Test count:** 12 tests across 7 describe blocks
- **Type:** Unit tests with mocked Strapi entity service
- **Coverage:** Good — covers getQueue, moderateItem, bulkAction, getActivityLog, getAnalytics, getSettings, updateSettings
- **Missing:**
  - No controller tests
  - No admin panel (React) tests
  - No integration tests
  - No route/permission tests

### Build

- **No webpack/build config** — correct for Strapi v4/v5 (admin panel built by Strapi CLI)
- Package.json has no build script, only `"test": "jest --passWithNoTests"`

---

## 4. Storyblok (`platforms/storyblok/`)

### Files

| File | Status | Notes |
|------|--------|-------|
| `src/index.js` | ✅ Complete | SDK init, getContext, React mount |
| `src/App.jsx` | ✅ Complete | Full 4-tab app with polling |
| `src/styles.css` | ✅ Complete | ~570 lines, self-contained |
| `webpack.config.js` | ✅ Functional | StoryblokSDK external |
| `jest.config.js` | ✅ Functional | jsdom environment, mappers |
| `README.md` | ✅ Complete | Covers install, config, API, dev, structure |
| `package.json` | ✅ Complete | Dependencies correct |
| `__mocks__/cmcc-core.js` | ✅ Present | |
| `__mocks__/cmcc-ui.jsx` | ✅ Present | |

### Storyblok-Specific Checks

| Check | Status | Notes |
|------|--------|-------|
| App SDK integration | ✅ Present | `new StoryblokApp()` + `getContext()` |
| SDK mock in tests | ⚠️ Not mocked | Tests render `<App />` without SDK prop, relying on undefined props |
| Standalone deployment | ⚠️ Partial | README says "host dist/ on CDN" but no `index.html` provided |
| Settings persistence | ✅ Present | localStorage-based settings |
| Polling mechanism | ✅ Present | Queue polling with configurable interval |
| Error states | ✅ Present | Loading spinner, error banner, retry button |

### Tests

- **File:** `src/__tests__/App.test.jsx`
- **Test count:** 9 tests
- **Type:** Smoke/rendering only
- **Issues:**
  - No SDK mock — tests create `<App />` without the `sdk`, `space`, `user`, `accessToken` props that `index.js` normally provides
  - Component handles missing props gracefully but this means the SDK integration path is never tested
  - No API fetch mocking (unlike Wix/Shopify tests which mock `global.fetch`)

### Build Output

- `dist/index.js` — 172 KB (includes all dependencies)
- `dist/styles.css` — 10 KB
- Source maps included

---

## 5. Wix (`platforms/wix/`)

### Files

| File | Status | Notes |
|------|--------|-------|
| `src/index.js` | ✅ Complete | Wix context reader, localStorage config, React mount |
| `src/App.jsx` | ✅ Complete | Full 4-tab app with polling |
| `src/styles.css` | ✅ Complete | ~335 lines, scoped |
| `webpack.config.js` | ✅ Functional | React/ReactDOM externals |
| `jest.config.js` | ✅ Functional | jsdom environment, mappers |
| `README.md` | ✅ Complete | Covers install, config, API, dev, troubleshooting |
| `package.json` | ✅ Complete | |
| `__mocks__/cmcc-core.js` | ✅ Present | |
| `__mocks__/cmcc-ui.jsx` | ✅ Present | |

### Wix-Specific Checks

| Check | Status | Notes |
|------|--------|-------|
| Wix SDK integration | ❌ **NOT INTEGRATED** | `@wix/sdk` is in devDependencies but never imported in source |
| Wix dashboard app pattern | ⚠️ Partial | Reads URL hash for `instance`, `token`, `siteOwnerId` but doesn't use Wix SDK for auth |
| Configuration source | ⚠️ Weak | Backend URL read from `localStorage`, fallback to env var or hardcoded localhost |
| Deployment docs | ✅ Present | README shows `index.html` template for hosting |
| Authentication flow | ❌ **MISSING** | No OAuth, no Wix session validation |

### Tests

- **File:** `src/__tests__/App.test.jsx`
- **Test count:** 10 tests
- **Type:** Smoke/rendering only
- **Coverage gaps:**
  - No Wix SDK integration path tested
  - No URL hash parsing tests
  - No localStorage interaction tests
  - No API error handling tests

### Build Output

- `dist/app.js` — 48 KB
- `dist/app.css` — 6 KB
- Clean, minimal bundle

---

## 6. Shopify (`platforms/shopify/`)

### Files

| File | Status | Notes |
|------|--------|-------|
| `src/index.js` | ✅ Complete | React mount, StrictMode |
| `src/App.jsx` | ✅ Complete | Full 4-tab app with Polaris |
| `src/styles.css` | ✅ Complete | ~90 lines of custom styles |
| `webpack.config.js` | ✅ Functional | Polaris, AppBridge, React externals |
| `jest.config.js` | ✅ Functional | jsdom environment, mappers |
| `package.json` | ✅ Complete | |
| `README.md` | ✅ Complete | Covers install, scopes, env vars, architecture |
| `__mocks__/cmcc-core.js` | ✅ Present | |
| `__mocks__/cmcc-ui.jsx` | ✅ Present | |

### Shopify-Specific Checks

| Check | Status | Notes |
|------|--------|-------|
| Polaris setup | ✅ Present | `AppProvider` with theme, proper component usage |
| App Bridge integration | ⚠️ Declared but unused | `@shopify/app-bridge-react` in package.json but NOT imported in App.jsx |
| Polaris externals | ✅ Configured in webpack | |
| CSS bundle size | ❌ **500 KB (CRITICAL)** | The `import '@shopify/polaris/build/esm/styles.css'` on line 19 of App.jsx pulls in ALL Polaris CSS |
| Data fetching | ✅ Present | Uses `fetch()` to `/api/*` endpoints |
| Theme customization | ⚠️ Hardcoded | Theme colors hardcoded, not using Polaris theming system |

### CSS Bundle Size Analysis

The `dist/app.css` is **500 KB** — this is a critical issue.

- **Root cause:** `import '@shopify/polaris/build/esm/styles.css'` in `App.jsx` (line 19)
- This imports the entire Polaris component library CSS (~489 KB)
- **Impact:** Slow page load, poor UX in Shopify admin
- **Fixes possible:**
  1. Remove the direct CSS import and use Polaris CDN-loaded CSS instead
  2. Use PurgeCSS/tree-shaking to strip unused Polaris styles
  3. Only import individual Polaris component CSS files if available
  4. Add `css-minimizer-webpack-plugin` to minimize the output

### Tests

- **File:** `src/__tests__/App.test.jsx`
- **Test count:** 8 tests
- **Type:** Smoke/rendering only
- **Notes:** Properly mocks all Polaris components. Good pattern.
- **Coverage gaps:**
  - No data interaction tests (queue actions, settings save)
  - No error state tests
  - No App Bridge integration tests

### Build Output

- `dist/app.css` — **500 KB** ❌ (critical issue)
- `dist/app.js` — 14 KB ✅ (small because Polaris is external)

---

## 7. Cross-Cutting Issues

### Issue A: No TODO/FIXME/HACK/XXX Comments
Zero instances found across all 5 platforms. While this could indicate clean code, in practice it suggests these are **scaffolded applications** that haven't been through iterative development where engineers leave notes. **Risk:** All known issues are undocumented.

### Issue B: Test Coverage is Surface-Level Only
All platform tests are **smoke tests** — they verify rendering and tab switching but never test:
- API interactions (success/failure)
- Data flow (queue item moderation, settings persistence)
- Error states
- Edge cases (empty data, missing config)
- Security (permissions, nonce validation)

### Issue C: All Dist Directories Are `.gitignore`d
The root `.gitignore` contains `dist`, meaning build artifacts are not committed. This is correct monorepo practice (Turborepo rebuilds), but means:
- First-time setup requires `npm install && npm run build` from root
- CI/CD must run `turbo run build` before deploying

### Issue D: i18n / Translations
- WordPress: `Text Domain: cmcc` with `Domain Path: /languages` — but **no `.mo`/`.po` files exist**
- Strapi: Has `en.json` with ~45 translation keys — **only English**
- Storyblok: No i18n
- Wix: No i18n
- Shopify: No i18n

### Issue E: Security Hardening

| Concern | WordPress | Strapi | Storyblok | Wix | Shopify |
|---------|-----------|--------|-----------|-----|---------|
| CSRF/XSS protection | ✅ nonce + sanitization | ✅ Strapi built-in | ❌ None | ❌ None | ❌ None |
| Auth/permissions | ✅ `manage_options` | ✅ RBAC scopes | ❌ None | ❌ None | ❌ None |
| Input sanitization | ✅ Server-side | ✅ Strapi built-in | ❌ Client-side only | ❌ Client-side only | ❌ Client-side only |

### Issue F: Missing Production Files

| Platform | Missing |
|----------|---------|
| WordPress | `uninstall.php`, `.pot` file for translations, upgrade routine |
| Strapi | No admin panel test |
| Storyblok | No `index.html` for hosting, no CDN deployment script |
| Wix | No server-side backend component, no Wix SDK usage |
| Shopify | No backend server (Node.js app needed for Shopify OAuth + App Bridge), PurgeCSS config |

---

## 8. Per-Platform Priority Recommendations

### WordPress (HIGHEST PRIORITY)
1. ✅ Add `uninstall.php` to clean up DB tables and options
2. ✅ Add version comparison in `cmcc_activate()` for upgrade routines
3. ✅ Add PHP unit tests (WP_Mock or PHPUnit)
4. ✅ Add `languages/cmcc.pot` for translations
5. ✅ Add nonce verification for `$_GET['page']` parameter

### Strapi
1. ✅ Add controller unit tests
2. ✅ Add admin panel (React) tests
3. ✅ Add e2e integration tests
4. ✅ Wrap admin panel with proper Strapi permission checks

### Storyblok
1. ✅ Provide `index.html` template for self-hosting
2. ✅ Add Storyblok SDK mock to tests
3. ✅ Test the SDK initialization path
4. ✅ Add API error handling tests

### Wix
1. ✅ **Integrate the Wix SDK properly** — currently just reading URL hash
2. ✅ Implement proper Wix authentication flow
3. ✅ Remove `@wix/sdk` from devDependencies if not used, or use it properly
4. ✅ Add tests for Wix context parsing

### Shopify (HIGH PRIORITY)
1. ✅ **Fix the 500 KB CSS bundle** — critical performance issue
2. ✅ Add `@shopify/app-bridge-react` usage (currently imported in App.jsx only via Polaris `AppProvider`, but `AppBridge` component not used)
3. ✅ Add a Shopify backend (Express.js app for OAuth + session)
4. ✅ Add CSS minimization to webpack config
5. ✅ Remove unused Polaris components from the bundle

---

## 9. Scorecard Summary

| Platform | Source Files | Build Config | README | Tests (meaningful) | Production Hardening | Overall |
|----------|-------------|-------------|--------|-------------------|---------------------|---------|
| **WordPress** | 🟢 Complete | 🟢 Complete | 🟢 Complete | 🟡 Smoke only | 🟡 Missing 2 files | **🟡 3.2/5** |
| **Strapi** | 🟢 Complete | 🟢 Correct (no build) | 🟢 Complete | 🟢 Good unit tests | 🟢 Proper patterns | **🟢 4.0/5** |
| **Storyblok** | 🟢 Complete | 🟢 Complete | 🟢 Complete | 🟡 Smoke only | 🟡 Missing index.html | **🟡 3.0/5** |
| **Wix** | 🟢 Complete | 🟢 Complete | 🟢 Complete | 🟡 Smoke only | 🔴 No SDK integration | **🟡 2.5/5** |
| **Shopify** | 🟢 Complete | 🟢 Complete | 🟢 Complete | 🟡 Smoke only | 🔴 500 KB CSS bundle | **🟡 2.5/5** |

---

## 10. Environment & Toolchain

| Tool | Status | Notes |
|------|--------|-------|
| Turborepo | ✅ Configured | `turbo.json` with build, dev, test, lint pipeline |
| ESLint (root) | ✅ Configured | Flat config with TypeScript + React plugins |
| Prettier | ✅ Configured | `.prettierrc` and `.prettierignore` |
| TypeScript (root) | ✅ Configured | `tsconfig.json` |
| Husky | ⚠️ Partial | `"prepare": "husky || true"` — silently fails if not installed |
| Workspaces | ✅ npm workspaces | `packages/*` and `platforms/*` |

---

*Report generated via automated audit of all files in `platforms/` and `packages/`.*
