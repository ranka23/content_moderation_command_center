# Contributing to CMCC

Content Moderation Command Center — multi-platform moderation dashboard.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [Project Structure](#3-project-structure)
4. [Automated Tests](#4-automated-tests)
5. [Manual Testing](#5-manual-testing)
   - [5.1 Backend API Stub](#51-backend-api-stub)
   - [5.2 WordPress](#52-wordpress)
   - [5.3 Strapi](#53-strapi)
   - [5.4 Storyblok](#54-storyblok)
   - [5.5 Wix](#55-wix)
   - [5.6 Shopify](#56-shopify)
   - [5.7 HTTPS Tunnels](#57-https-tunnels)
6. [Code Style](#6-code-style)
7. [Build & Publish](#7-build--publish)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime for all packages and platform builds |
| npm | 10+ | Package manager (uses npm workspaces) |
| Docker | 24+ | WordPress and Strapi test environments |
| ngrok | latest | HTTPS tunnels for Shopify / Storyblok / Wix testing *(optional)* |
| Shopify CLI | latest | Shopify app tunnel and config *(optional — Shopify only)* |

**Install ngrok (recommended for all developers):**

```bash
# macOS (Homebrew)
brew install ngrok

# Other platforms
# See https://ngrok.com/download
```

---

## 2. Quick Start

```bash
# Install all dependencies (monorepo root)
npm install

# Build all packages and platforms
npm run build

# Run all automated tests
npm test
```

### Per-platform quick commands (via Makefile)

```bash
make serve-api           # Mock backend API on port 3000
make docker-wordpress    # Build + test WordPress (Docker, port 8080)
make docker-strapi       # Build + test Strapi (Docker, port 1337)
make serve-storyblok     # Build + serve locally on port 5000
make serve-wix           # Build + serve locally on port 5000
make serve-shopify       # Build + start Express on port 3000
make tunnel PORT=5000    # Expose localhost via ngrok
```

---

## 3. Project Structure

```
cmcc/
├── packages/
│   ├── cmcc-core/       # Shared logic: queues, firewall, analytics, reputation
│   └── cmcc-ui/         # Shared React components: QueueTable, HeatmapChart, etc.
├── platforms/
│   ├── shopify/         # Shopify embedded app (Express + React + Polaris)
│   ├── storyblok/       # Storyblok iframe app (React + SB SDK)
│   ├── strapi/          # Strapi plugin (server + admin)
│   ├── wix/             # Wix dashboard iframe app (React)
│   └── wordpress/       # WordPress PHP plugin + React admin UI
├── tools/
│   └── test-api-stub/   # Mock backend API for front-end testing
├── docs/
│   ├── developer-guide.md
│   ├── user-guide.md
│   └── audit-report.md
├── docker-compose.yml   # WordPress / Strapi / API stub environments
├── Makefile             # Convenience targets for build, serve, tunnel, etc.
└── CONTRIBUTING.md      # This file
```

---

## 4. Automated Tests

```bash
# All tests via Turborepo
npm test

# Specific workspace
npm --workspace=@cmcc/core test
npm --workspace=@cmcc/server-core test
npm --workspace=@cmcc/ui test

# Via Makefile
make test
```

**Coverage areas (14 test files total):**

### `@cmcc/core` (10 test files)
- `firewall/__tests__/rules.test.ts` — All rule checkers, simhash, CIDR, evaluateFirewallRules, stats
- `concurrency/__tests__/concurrency.test.ts` — InMemoryLockManager acquisition, rejection, release, force-release, expiry
- `queues/__tests__/queues.test.ts` — QueueManager FIFO, peek, update, remove, autoClassify
- `reputation/__tests__/reputation.test.ts` — Pure utility functions (score changes, decay, risk classification)
- `sla/__tests__/sla.test.ts` — SlaEngine SLA checks, EscalationManager rules
- `collaboration/__tests__/collaboration.test.ts` — TeamManager, AssignmentManager, ConflictDetector
- `config/__tests__/config.test.ts` — Platform and options registries
- `src/__tests__/setup.test.ts`, `ai-adapters.test.ts`, `integration.test.ts`, `reputation-integration.test.ts`

### `@cmcc/server-core` (9 test files)
- All services tested: FirewallService, EmailService, WebhookService, RetentionService, UndoService,
  ContentHookService, ScheduledReportService, SyncReceiver, WebSocketEventBus

### `@cmcc/ui` (2 test files)
- `src/__tests__/components.test.tsx` — Button, Badge, Card, Input, Select, Pagination, Skeleton, EmptyState
- `src/__tests__/additional-components.test.tsx` — ActionButton, NotificationBadge, SlideOutPanel, ProgressBar, ConfirmationModal

**Platform tests** — `jest --passWithNoTests` (extend as needed)

---

## 5. Manual Testing

Each platform integrates into its host CMS/app in a different way. Below are the step-by-step workflows.

### 5.1 Backend API Stub

The Storyblok and Wix apps require a backend API. Use the included stub:

```bash
make serve-api
# → http://localhost:3000
#    GET  /api/health
#    GET  /api/queue          → returns mock queue items
#    POST /api/queue/:id/moderate
#    POST /api/queue/bulk
#    GET  /api/analytics       → returns mock analytics with heatmap
#    GET  /api/activity        → returns mock activity log
#    GET  /api/settings
#    PUT  /api/settings
```

### 5.2 WordPress

**Local testing with Docker (recommended):**

```bash
# Build the React UI first
npm run build

# Start WordPress + MySQL
make docker-wordpress
# WordPress:  http://localhost:8080
# MySQL:      localhost:3307 (user=wordpress, pass=wordpress, db=wordpress)
```

Then in WordPress:
1. Complete the installation wizard at `http://localhost:8080`
2. Go to **Plugins → Installed Plugins**
3. Activate **CMCC**
4. The **CMCC** menu appears in the admin sidebar

**What to test:**
- [ ] Plugin activates without PHP errors
- [ ] Database tables created (`wp_cmcc_queue`, `wp_cmcc_activity_log`)
- [ ] REST API responds: `GET /wp-json/cmcc/v1/queue`
- [ ] Queue page renders with filters, pagination, bulk actions
- [ ] Analytics page renders with heatmap and stats
- [ ] Activity log page renders with filters
- [ ] Settings save and persist
- [ ] Uninstall cleans up tables

**Without Docker:** Copy `platforms/wordpress` to `wp-content/plugins/cmcc` in any local WordPress install (MAMP, Local, etc.).

### 5.3 Strapi

**Local testing with Docker (recommended):**

```bash
# Start Strapi (first run scaffolds a new Strapi project — takes ~5 min)
make docker-strapi
# → http://localhost:1337/admin
```

The plugin is mounted at `src/plugins/cmcc` inside the container.

After Strapi starts:
1. Create your admin account at `http://localhost:1337/admin`
2. The CMCC plugin should appear in the admin sidebar
3. Explore queue, analytics, and settings pages

**What to test:**
- [ ] Plugin registers without errors
- [ ] Content types (`cmcc_queue_items`, `cmcc_activity_logs`, `cmcc_settings`) are created
- [ ] API endpoints respond: `GET /cmcc/queue`
- [ ] Admin UI renders all tabs
- [ ] Settings save and persist
- [ ] Queue item actions work
- [ ] Activity log entries are created

**Without Docker:** Copy `platforms/strapi` into any Strapi v4/v5 project as `src/plugins/cmcc`, then run `npm run build && npm run develop`.

### 5.4 Storyblok

Storyblok apps run inside an iframe in the Storyblok dashboard. You need a publicly accessible HTTPS URL.

```bash
# Terminal 1 — Start the backend API stub
make serve-api

# Terminal 2 — Build and serve the app
make serve-storyblok
# → http://localhost:5000

# Terminal 3 — Create an HTTPS tunnel
make tunnel PORT=5000
# → https://abc123.ngrok.io
```

In Storyblok:
1. Go to your space → **Settings → Apps**
2. Click **Add App → Custom App**
3. Set **Name** to "CMCC Moderation"
4. Set **App URL** to `https://your-ngrok.ngrok.io` (the tunnel URL)
5. Save and navigate to the app in the sidebar

**What to test:**
- [ ] App loads in iframe (check browser console for CSP / mixed-content errors)
- [ ] Storyblok SDK initializes (loading state shows first)
- [ ] Error state shows when API is unreachable (stop the API stub and refresh)
- [ ] Queue tab shows items from the API stub
- [ ] Analytics tab renders heatmap and stats
- [ ] Activity log tab shows entries with filters
- [ ] Settings tab saves values to the API stub
- [ ] Tab badges show pending/spam counts
- [ ] Approve/reject/spam/defer actions on queue items
- [ ] Bulk actions work

### 5.5 Wix

Wix dashboard apps also run inside an iframe and require HTTPS.

```bash
# Terminal 1 — Start the backend API stub
make serve-api

# Terminal 2 — Build and serve the app
make serve-wix
# → http://localhost:5001

# Terminal 3 — Create an HTTPS tunnel
make tunnel PORT=5001
# → https://abc123.ngrok.io
```

In the [Wix Developers Console](https://dev.wix.com):
1. Create a new **Dashboard App**
2. Set **App URL** to `https://your-ngrok.ngrok.io/index.html`
3. Install the app on a Wix site

**What to test:**
- [ ] App loads in Wix dashboard iframe
- [ ] Wix passes `instance`/`token` via URL hash params (check browser console logs)
- [ ] Context validation works (try with missing/invalid params)
- [ ] Backend URL resolves (from localStorage, env, or default)
- [ ] All four tabs render with data from the API stub
- [ ] Queue actions call the API stub
- [ ] Settings persist
- [ ] Activity log "load more" pagination

### 5.6 Shopify

Shopify apps are embedded in the Shopify admin and require a Shopify Partners account + development store.

```bash
# Terminal 1 — Build and start the Express server
make serve-shopify
# → http://localhost:3001

# Terminal 2 — Create an HTTPS tunnel
make tunnel PORT=3001
# → https://abc123.ngrok.io
```

In [Shopify Partners](https://partners.shopify.com):
1. Create a new app (or use existing)
2. Set **App URL** to `https://your-ngrok.ngrok.io`
3. Set **Allowed redirection URLs** to `https://your-ngrok.ngrok.io/auth/callback`
4. Add OAuth scopes: `read_products, write_products, read_customers, read_content, write_content`

Configure environment variables:

```bash
cd platforms/shopify
cp .env.example .env
# Edit .env with your Shopify API key and secret
```

Start the OAuth flow:

```bash
open "https://your-ngrok.ngrok.io/auth?shop=your-dev-store.myshopify.com"
```

**What to test:**
- [ ] OAuth flow redirects correctly
- [ ] App loads inside Shopify admin iframe
- [ ] HTML shell loads Polaris/React/App Bridge from Shopify CDN
- [ ] All tabs render (queue, analytics, activity log, settings)
- [ ] API proxy responds at `/api/*`
- [ ] App Bridge navigation works

### 5.7 HTTPS Tunnels

Shopify, Storyblok, and Wix all require HTTPS to load the app in an iframe.

**Using ngrok (recommended):**

```bash
make tunnel PORT=5000
# → Provides a public HTTPS URL like https://abc123.ngrok.io
```

**Using Shopify CLI** (Shopify only):

```bash
cd platforms/shopify
shopify app tunnel start
```

---

## 6. Code Style

- **Prettier** — automatic formatting on save (config in `.prettierrc`)
- **ESLint** — `npm run lint:fix` to auto-fix
- **No semicolons** — configured in Prettier
- **Single quotes** — for strings
- **Trailing commas** — everywhere
- **TypeScript** — strict mode enabled in all packages

```bash
# Format all files
npm run format:fix

# Lint and fix
npm run lint:fix
```

### Design System

The app uses **shadcn-style components** from the `@cmcc/ui` package. All shared UI components live in `packages/cmcc-ui/src/components/ui/`.

- **Tailwind CSS** is used for all styling with the `tw-` prefix for utility classes (e.g. `tw-flex`, `tw-text-lg`)
- The `cn()` utility from `@cmcc/ui` is used to merge Tailwind classes conditionally
- **Dark mode** is supported via Tailwind's `dark` class on `<html>`. Toggle with the 🌙/☀️ button in the top bar
- All new reusable components **must** be added to `@cmcc/ui/src/components/ui/` so they can be shared across platforms

### Keyboard Shortcuts

The app registers a global keyboard shortcut system via the `useKeyboardShortcuts` hook. Registered shortcuts:

| Key | Action |
|-----|--------|
| `A` | Approve selected item |
| `R` | Reject selected item |
| `S` | Mark as Spam |
| `D` | Defer selected item |
| `V` | View item details |
| `F` | Focus search field |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close panel / Cancel |

To add a new shortcut, call `useKeyboardShortcuts` with an array of shortcut objects:

```jsx
useKeyboardShortcuts([
  {
    key: 'n',
    description: 'New item',
    handler: () => handleNewItem(),
  },
])
```

Shortcuts only fire when no input/textarea/select is focused.

### Adding New Features

Follow the established pattern:

1. **Component** — Create the component in `@cmcc/ui/src/components/ui/`
2. **Platform integration** — Import and use it in the platform's `App.jsx`
3. **Saved filters** — Use the `useSavedFilters` hook to persist and restore filter combinations
4. **Toast notifications** — Call `addToast({ type: 'success'|'error', message: '...' })` to show a notification
5. **Slide-out panels** — Use the `SlideOutPanel` component for side panels and modals
6. **Data fetching** — Use the `apiFetch` wrapper (auto-handles nonce refresh, error handling, etc.)

---

## 7. Build & Publish

### Packages (npm)

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@cmcc/ui
npm run build --workspace=@cmcc/wordpress

# Publish individually
npm publish --workspace=@cmcc/core
npm publish --workspace=@cmcc/ui
```

### Platforms (marketplace)

| Platform | Build Output | What to Ship |
|----------|-------------|--------------|
| WordPress | `npm run build` in `platforms/wordpress` | `dist/` + PHP files → zip for WordPress.org |
| Strapi | No build step | Source files → npm package |
| Storyblok | `npm run build` in `platforms/storyblok` | `dist/` → upload to CDN, use URL in Custom App config |
| Wix | `npm run build` in `platforms/wix` | `dist/` + `index.html` → upload to CDN, use URL in App config |
| Shopify | `npm run build` in `platforms/shopify` | `dist/` + `server.js` → deploy as Node.js app |

---

## Need Help?

- Read the full [Developer Guide](docs/developer-guide.md)
- Read the [User Guide](docs/user-guide.md)
- Read the [User Guide (New)](docs/USER_GUIDE.md)
- Check the [Audit Report](docs/audit-report.md)
