# CMCC User Guide

**Content Moderation Command Center** | Version 1.0.0

---

## Overview

CMCC (Content Moderation Command Center) is a unified, cross-platform content moderation system that helps you manage, review, and take action on user-generated content across your website or application. Whether you're running a WordPress blog, a Strapi CMS, a Storyblok-powered site, a Wix store, or a Shopify shop, CMCC gives you a single, consistent moderation experience.

### What problem does it solve?

Content moderation at scale is hard. Comments, reviews, forum posts, form entries, and other user-generated content can quickly become overrun with spam, abusive language, or malicious links. CMCC brings together:

- **A centralized queue** — All pending, spam, and flagged content in one place, regardless of content type.
- **Automated filtering** — The Spam Firewall catches suspicious content before it reaches your queue.
- **Data-driven insights** — See exactly what's happening with analytics dashboards, heatmaps, and anomaly detection.
- **Full audit trail** — Every moderation action is logged for accountability.
- **User reputation tracking** — Automatically score and classify users based on their behavior.

### Supported Platforms

| Platform | Integration Type | Design System |
|---|---|---|
| WordPress 5.0+ (6.0+ recommended) | Native plugin | WP Admin styles |
| Strapi v4 / v5 | Plugin (`src/plugins/cmcc`) | Strapi Design System |
| Storyblok | Custom App (iframe) | Storyblok theme |
| Wix | Dashboard App | Wix coral theme |
| Shopify | Admin App (embedded) | Shopify Polaris |

### Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                    CMCC Backend Layers                            │
│  Queue Management │ Spam Firewall │ Reputation System             │
│  Analytics Engine │ Activity Logger │ Webhook Engine              │
├──────────────────────┬───────────────────────────────────────────┤
│      @cmcc/core      │          @cmcc/ui                         │
│  Shared business     │  Headless React components                │
│  logic & data        │  with platform-adapted theming            │
│  processing          │                                           │
├──────────┬───────────┴──────────┬──────────┬─────────────────────┤
│ WordPress│ Strapi   │ Storyblok │   Wix    │  Shopify            │
│ Plugin   │ Plugin   │ Express   │   Velo   │  App (with         │
│          │          │ Middleware│  Modules │  Express server)    │
│          │          │ (mount on │ (built-  │                     │
│          │          │  existing │  into    │                     │
│          │          │  server)  │  Wix)    │                     │
└──────────┴──────────┴───────────┴──────────┴─────────────────────┘
```

**Key differences from previous architecture:**

| Platform | Before (separate server) | After (embedded) |
|---|---|---|
| **Storyblok** | `node server/index.js` runs a standalone Express server on port 3002 | Embeddable Express middleware — mount on your existing Next.js/Nuxt/Express server with `app.use('/api/cmcc', cmccModeration({...}))` |
| **Wix** | `node server/index.js` runs a standalone Express server on port 3003 | Wix Velo modules using `wix-data`, `wix-cron`, and `wix-http-functions` — no separate server needed |
| **Strapi** | Strapi plugin (unchanged) | ✅ Already correct |
| **Shopify** | Shopify App (unchanged) | ✅ Already correct |
| **WordPress** | WordPress plugin (unchanged) | ✅ Already correct |

---

## Common Features (Across All Platforms)

All CMCC installations share the same core set of features and interaction patterns. The visual styling adapts to each platform's design system, but the workflows are identical.

> **First-time users:** When you open CMCC for the first time, an onboarding tutorial overlay appears highlighting key areas of the interface — the queue, quick filters, and main actions. You can dismiss the tutorial at any time, or re-trigger it from the Help menu. Your progress is saved locally so you won't see it again once completed.

---

### Moderation Queue

The Moderation Queue is the heart of CMCC. It displays all incoming user-generated content that needs review.

#### Content Types Shown

The queue aggregates content from multiple sources. Depending on your platform and integrations, you may see:

| Content Type | Icon | Example |
|---|---|---|
| Comments | 💬 | Blog comments, article replies |
| Posts / Pages | 📝 | User-submitted posts, forum threads |
| Media | 🖼️ | Image uploads, file submissions |
| Users | 👤 | New user registrations, profile updates |
| Form Entries | 📋 | Contact form submissions, survey responses |
| Product Reviews | 🛒 | WooCommerce / Shopify product reviews |
| Forum Replies | 💬 | bbPress, Discourse, or custom forum replies |

#### Statuses

Every item in the queue has one of three statuses:

| Status | Indicator | Meaning |
|---|---|---|
| **Pending** | ⏳ Yellow | Awaiting moderator review |
| **Spam** | 🚫 Red | Identified as spam (by firewall or moderator) |
| **Flagged** | ⚠️ Orange | Suspicious but not confirmed spam |

#### Taking Actions

Each queue item has inline quick actions:

| Action | Description | Keyboard Shortcut |
|---|---|---|
| **Approve** ✅ | Publish or allow the content | `A` |
| **Reject** ❌ | Discard the content | `R` |
| **Mark as Spam** 🚫 | Move to spam and penalize the author | `S` |
| **Defer** ⏸️ | Postpone decision (keeps in queue) | `D` |
| **Deactivate** 🔒 | Deactivate the submitting user account | — |

When you take an action:

1. The item updates **optimistically** — it disappears from the queue immediately with a fade-out animation.
2. A success toast confirms the action (e.g., "Item approved").
3. The analytics dashboard and activity log update in real time.
4. If the action fails (network error, server issue), the item reverts to its previous state with an error message.

#### Bulk Actions

Select multiple items using checkboxes (use Shift-click to select a range), then choose an action from the bulk actions dropdown:

- **Approve All** — Approve all selected items
- **Reject All** — Trash or discard all selected items
- **Mark as Spam** — Flag all selected items as spam
- **Deactivate Users** — Deactivate the accounts of selected items' authors
- **Export to CSV** — Download selected items as a CSV file

A confirmation modal appears before bulk actions are executed. You'll receive a summary toast when complete (e.g., "15 items approved").

#### Filtering & Searching

| Filter | Options |
|---|---|
| **Content Type** | All, Comments, Posts, Media, Users, Form Entries, Reviews |
| **Status** | All, Pending, Spam, Flagged |
| **Date Range** | Today, Yesterday, Last 7 Days, Last 30 Days, Custom |
| **Search** | Free-text search across title/excerpt, author name, and content body |

Filters persist in the URL so you can bookmark specific views. The queue table is sortable by any column.

When no items match your filters: "No items match your filters. Try adjusting criteria."

#### Quick Filter Bar

The Quick Filter Bar is located at the top of the Queue tab (Design Modernization, Section 8). It provides one-click preset filters for rapid queue filtering:

| Preset | Icon | Description |
|---|---|---|
| **All** | — | Clear all filters, show full queue |
| **Last Hour** | 🕐 | Items submitted in the last 60 minutes |
| **Today** | 📅 | Items submitted today |
| **This Week** | 📆 | Items submitted this week |
| **Pending Only** | ⏳ | Show only items needing review |
| **High Spam Score** | 🚫 | Items with high spam probability |
| **Flagged** | ⚠️ | Items that have been flagged |

Click a preset to apply its filter combination. Click it again or click **All** to clear. Quick filters can be combined with the standard filter controls below.

#### Bulk Operations Progress

When performing bulk actions on multiple queue items, a **Progress Bar** appears showing the operation status (in progress, completed) with a percentage indicator. This provides visual feedback for large bulk operations (Section 8 - Modern UI Patterns).

#### Keyboard Shortcuts

CMCC provides keyboard shortcuts for power users to moderate content quickly without reaching for the mouse. Press `?` at any time to toggle the keyboard shortcuts help modal.

| Key | Action | Context |
|-----|--------|---------|
| `A` | **Approve** the selected/focused item | Queue item row or detail panel |
| `R` | **Reject** the selected/focused item | Queue item row or detail panel |
| `S` | **Mark as Spam** the selected/focused item | Queue item row or detail panel |
| `D` | **Defer** the selected/focused item | Queue item row or detail panel |
| `V` | **View** item details (open slide-out panel) | Queue item row |
| `F` | **Focus search** input | Anywhere in the Queue tab |
| `?` | **Toggle** keyboard shortcuts help modal | Anywhere |
| `Esc` | **Close** modal, panel, or dropdown | Any open overlay |

Shortcuts are only active when the CMCC interface has focus (not when typing in a text input or textarea). The `?` shortcut works in all contexts, including text inputs, so you can always bring up the help reference.

#### Saved Filters (Section 10.1 - Advanced Queue Management)

Save your frequently used filter combinations for quick access:

1. **Set your filters** — Choose Content Type, Status, Date Range, and enter a search term
2. **Name the filter** — Type a name in the "Name this filter..." input box below the filter controls
3. **Save** — Click the **+ Save Filter** button or press **Enter**
4. **Apply** — Select a saved filter from the **Saved Filters...** dropdown to restore the filter combination
5. **Delete** — Saved filters accumulate in the dropdown; they persist in your browser's local storage

Saved filters are stored locally in your browser (localStorage) and are scoped to the Queue page. Use them to:
- Switch between "Comments I need to review" and "High-priority flagged posts"
- Share filter combinations with team members by giving them the filter name + parameters
- Bookmark common moderation workflows

---

### Analytics Dashboard

The Analytics Dashboard provides visual insights into your moderation activity.

![Analytics Dashboard Layout](https://cmcc.dev/assets/docs/analytics-layout.png)

#### Activity Heatmap

A calendar-style grid that shows moderation activity intensity:

- **Y-axis**: Day of the week (Sunday–Saturday)
- **X-axis**: Hour of the day (0–23)
- **Color intensity**: Darker cells = more pending/spam items created during that time
- **Click** any cell to drill down into the queue filtered for that specific time period
- **Anomaly detection**: Cells exceeding a threshold show a red border with a notification icon — indicating unusual spikes

This helps you identify patterns like when spam bots are most active or when your moderators are busiest.

#### Spam Ratio Gauge

A semi-circular gauge showing the percentage of spam relative to total content:

| Ratio | Color | Action Suggested |
|---|---|---|
| < 10% | 🟢 Green | Healthy — no action needed |
| 10–25% | 🟡 Yellow | Warning — review firewall rules |
| > 25% | 🔴 Red | Critical — investigate and tighten rules |

Hover over the gauge for exact counts and percentage.

#### Content-Type Breakdown

A pie chart showing the distribution of pending items by content type. Hover over a slice for exact counts and percentages. Click any slice to jump to the queue filtered to that content type.

#### Moderator Performance

A horizontal bar chart showing approvals and rejections per moderator for the past week. Bars are sorted by activity level. Helpful for team leads to understand workload distribution.

#### Anomaly Alerts

CMCC automatically detects unusual patterns — such as a sudden spike in spam or a flood of new user registrations. Each alert shows:

- Description of the anomaly
- Timestamp of detection
- **Investigate** button that opens the queue pre-filtered to the relevant items and time range

Alerts are dismissible after investigation.

---

### Activity Log

Every moderation action is recorded in the Activity Log for a complete audit trail.

#### What Is Logged

Each entry records:

| Field | Description |
|---|---|
| **Timestamp** | When the action occurred (newest first by default) |
| **Moderator** | Who performed the action |
| **Action** | Approve, Reject, Mark as Spam, Defer, Deactivate |
| **Item Type** | Comment, Post, Media, User, Form Entry, etc. |
| **Item Title** | Title or excerpt of the moderated content |
| **Previous Status** | What status the item had before the action |
| **New Status** | What status it has after |
| **Notes** | Any moderator notes attached to the action |

#### Searching & Filtering

| Filter | Description |
|---|---|
| **Moderator** | Dropdown of all moderators |
| **Action** | Approve, Reject, Spam, Defer, Deactivate |
| **Item Type** | Same as queue content types |
| **Date Range** | Same as queue/analytics date picker |
| **Search** | Free-text against moderator name, item title, or notes |

#### Undo Actions

For the first **5 minutes** after an action, an **Undo** button is available directly in the log table. A countdown timer shows how much time remains. After 5 minutes, the action is considered final.

#### Retention

Activity log entries are automatically pruned based on the configured retention period (default: **90 days**). You can adjust this in **Settings > Advanced**. A notice at the top of the log shows: *"Entries older than X days are automatically deleted."*

---

### Settings

The Settings panel is organized into multiple collapsible sections. Each section contains related configuration fields.

#### General Settings

| Setting | Description | Default |
|---|---|---|
| **Auto Moderate** | Automatically moderate items based on firewall rules | Off |
| **Moderation Behavior** | How auto-moderated items are handled: Flag, Spam, or Discard | Flag |
| **Queue Page Size** | Number of items shown per page in the queue | 25 |
| **Language** | UI language | English |

#### Spam Firewall

The Spam Firewall automatically screens incoming content before it reaches the queue.

**Global Action:** When a rule triggers, choose what happens:
- **Flag for review** — Mark as "flagged" and keep in queue for moderator review
- **Mark as spam** — Move to spam folder
- **Discard silently** — Delete the content immediately

**Configurable Rules:**

| Rule | Description | Default |
|---|---|---|
| **Max links** | Maximum number of links allowed per submission | 5 |
| **Blacklisted keywords** | Keywords that auto-flag content. Supports wildcats (`*free*`, `*viagra*`). One per line. | Empty |
| **Blacklisted email domains** | Email domains (e.g., `spamdomain.com`) to block | Empty |
| **Minimum submit time** | Minimum seconds before a form can be submitted (honeypot) | 3 |
| **Duplicate detection** | Detect exact or near-duplicate submissions | On |
| **Duplicate lookback days** | How far back to check for duplicates | 7 |

#### Notifications

| Setting | Description | Default |
|---|---|---|
| **Email alerts** | Enable email notifications for queue activity | On |
| **Alert threshold** | Trigger notifications when pending items exceed this count | 10 |
| **Notify moderators** | Send notifications to moderators | On |

#### Appearance & Display

Customize the look and feel of the CMCC interface:

| Setting | Description | Options |
|---|---|---|
| **Theme** | UI color scheme | Light, Dark, System |
| **Queue View** | Layout style for the queue | Table, Cards, Compact |
| **Items Per Page** | Number of items per page | 10 / 25 / 50 / 100 |
| **Date Format** | How dates are displayed | Relative, Absolute, Both |
| **Timezone** | Timezone for logs and analytics | Multiple timezones |

#### Integrations

Configure which content sources are automatically imported into the moderation queue:

| Setting | Description |
|---|---|
| **Auto-Import Comments** | Automatically add new comments to the queue |
| **Auto-Import Posts** | Automatically add new posts to the queue |
| **Auto-Import WooCommerce Reviews** | Add WooCommerce product reviews |
| **Auto-Import bbPress** | Add bbPress topics and replies |
| **Auto-Import BuddyPress** | Add BuddyPress activity updates |
| **Auto-Import Gravity Forms** | Add Gravity Forms form entries |
| **Webhook URL** | Receive real-time moderation events via webhook |

#### Advanced Auto Moderation

Fine-tune the automatic moderation engine with granular controls:

**AI Detection:**
| Setting | Description |
|---|---|
| **AI Spam Detection Engine** | None, Local ML, OpenAI, Claude, or Custom API |
| **AI API Endpoint** | URL for custom AI moderation API |
| **AI API Key** | API key for the AI service |
| **Spam Score Threshold (Flag)** | Score above which items are flagged (0-100) |
| **Spam Score Threshold (Spam)** | Score above which items are marked as spam (0-100) |
| **Spam Score Threshold (Discard)** | Score above which items are silently discarded (0-100) |

**Link Settings:**
| Setting | Description |
|---|---|
| **Max Links Allowed** | Links before flagging |
| **Block All Links** | Automatically flag any content with links |
| **Allowlist Domains** | Domains exempt from link checks |
| **Block Shortened URLs** | Flag content with URL shorteners (bit.ly, tinyurl, etc.) |
| **Check Link Reputation** | Check links against external reputation services |

**Keyword & Pattern Settings:**
| Setting | Description |
|---|---|
| **Whitelisted Keywords** | Keywords that override blacklist matches |
| **Regex Patterns** | Custom regex for advanced matching |
| **ALL CAPS Detection** | Flag content with >70% capital letters |
| **Repeated Character Detection** | Flag content with excessive repetition |
| **Language Filter** | All, English Only, or Block Specific Languages |

**User Behavior Settings:**
| Setting | Description |
|---|---|
| **Min Account Age (Hours)** | Accounts younger than this get extra scrutiny |
| **Block Disposable Emails** | Auto-block content from disposable email domains |
| **Max Posts Per Hour** | Rate limiting per user |
| **Banned IP Ranges** | CIDR notation, one per line |
| **Banned Country Codes** | ISO country codes for geo-blocking |
| **VPN/Proxy Detection** | Flag content from known VPN/proxy IPs |

**Timing & Frequency:**
| Setting | Description |
|---|---|
| **Cooldown Between Posts (Seconds)** | Minimum time between posts from same user |
| **Duplicate Detection Window (Days)** | Lookback period for duplicate detection |
| **Duplicate Similarity Threshold** | Content similarity % for flagging (0-100) |
| **Weekend/Off-Hours Sensitivity** | Apply stricter rules during nights and weekends |

**Automated Actions:**
| Setting | Description |
|---|---|
| **Default Action** | Flag, Mark Spam, or Discard when rules triggered |
| **Auto-Approve Threshold** | Spam score below this auto-approves (default: 10) |
| **Notify on Auto-Discard** | Send alert when content is auto-discarded |
| **Auto-Ban After N Violations** | Automatically ban users after X spam submissions |
| **Ban Duration** | Temporary (24h, 7d, 30d) or Permanent |
| **Learning Mode** | Record all rule evaluations without taking action (audit mode) |

#### Moderator Management

| Setting | Description | Default |
|---|---|---|
| **Secondary Approval Required** | Require a second moderator for high-risk actions | Off |
| **Action Confirmation Required** | Show confirmation before approve/reject/spam | On |

#### Data Retention

| Setting | Description | Default |
|---|---|---|
| **Activity Log Retention (Days)** | Log entries older than this are purged | 90 |
| **Archived Item Retention (Days)** | Archived items older than this are purged | 365 |
| **Auto-Purge Schedule** | How often to run cleanup | Weekly |
| **Export Before Purge** | Auto-export data before deletion | On |

#### API & Webhooks

| Setting | Description |
|---|---|
| **Webhook URL for New Items** | POST new queue items to external URL |
| **Webhook URL for Approvals** | POST approved items |
| **Webhook URL for Spam** | POST spam items |
| **API Rate Limiting** | Requests per minute |
| **Custom API Secret** | For webhook verification |

#### Backup & Restore

- **Scheduled Backups**: None, Daily, or Weekly
- **Export Settings**: Download all settings as a JSON file
- **Import Settings**: Upload a JSON file to restore settings

---

### Reports & Compliance

The Reports tab provides a centralized hub for reporting, compliance, reputation management, and collaboration tools. It is organized into several sub-tabs:

| Sub-tab | Description |
|---------|-------------|
| **Activity Report** | Moderation activity CSV/PDF export with date range and action type filters |
| **Compliance Audit** | Full audit trail CSV export for regulatory compliance |
| **User Reputation** | Searchable user list with trust levels, spam ratios, and reputation history |
| **Moderator Performance** | Approval/rejection/spam metrics per moderator |
| **Activity Feed** | Real-time feed of all moderation actions across the team |
| **Multi-Platform Hub** | Connection status dashboard for all supported platforms |

#### Report Sub-tabs Overview

Each sub-tab provides a specific view into your moderation data:

| Sub-tab | Key Features |
|---------|-------------|
| **Activity Report** | Interactive sortable table of all moderation actions; CSV and PDF export with date range and action type filters; search by keyword, moderator, or content type |
| **Compliance Audit** | Immutable audit log with moderator details, timestamps, previous/new statuses, and notes; GDPR Article 30 compliant; CSV export |
| **User Reputation** | Filterable user table with trust levels, spam ratios, and click-through to reputation history timeline |
| **Moderator Performance** | Per-moderator metrics: total actions, approvals, rejections, spam marks; workload distribution visualization |
| **Activity Feed** | Real-time feed of all moderation events (actions, notes, assignments, escalations); WebSocket with polling fallback; auto-scroll |
| **Multi-Platform Hub** | Platform health indicators for WordPress, Shopify, Storyblok, Strapi, and Wix; cross-platform settings shortcuts |

Available exports and tools include:

- **Moderation Activity Report** — Full CSV download of all moderation actions with filters
- **Compliance Audit Log** — CSV download with complete audit trail for regulatory compliance
- **Scheduled Reports** — Automate recurring report generation and delivery

#### Moderation Activity Report

Export a full report of all moderation activity with date range and type filters:

- **CSV Export** — Click the **Export CSV** button above the report table to download a detailed CSV of all moderation actions
- **PDF Export** — Click the **Export PDF** button to generate a formatted PDF report suitable for compliance review
- **Filters** — Use the date range picker and action type dropdowns to narrow the report scope before exporting

The report table itself is interactive: sort by any column, search by keyword, or filter by moderator, action type, or date range.

#### Scheduled Reports

Automate recurring report generation to keep your team informed without manual effort:

| Setting | Description |
|---|---|
| **Frequency** | Daily, Weekly, or Monthly |
| **Report Type** | Moderation Activity or Compliance Audit Log |
| **Recipients** | One or more email addresses (comma-separated) |
| **Format** | CSV attachment delivered via email |
| **Last Sent** | Timestamp of the most recent delivery |

To set up a scheduled report, navigate to **Reports → Scheduled Reports** and click **Add Schedule**. Choose your report type, frequency, and recipients, then click **Save Schedule**.

#### Compliance Audit Log

Export the complete compliance audit trail as a CSV file for regulatory record-keeping:

- **CSV Download** — Click **Export Audit Log** to download the full audit trail
- **Moderator actions** with accurate timestamps
- **Item details** — Content type, title, previous status, and new status
- **Moderator notes** and metadata for each action
- **Immutable log** — Entries cannot be deleted or altered once created

The audit log is designed to satisfy regulatory requirements including GDPR Article 30 record-keeping.

#### User Reputation Dashboard

The User Reputation Dashboard provides a searchable, filterable table of all users with their reputation scores and trust levels. Access it from the **Reports → User Reputation** sub-tab.

| Column | Description |
|---|---|
| **User** | The user's identifier (click to view full reputation history) |
| **Trust Level** | Trusted, New, Regular, Suspicious, Verified, or Blocked |
| **Total Items** | Total content items submitted |
| **Spam** | Number of spam submissions |
| **Approved** | Number of approved submissions |
| **Spam Ratio** | Percentage of submissions flagged as spam |
| **Last Active** | Timestamp of the user's most recent activity |

Trust levels are auto-assigned based on spam ratio:

| Trust Level | Spam Ratio | Badge Color | Description |
|-------------|-----------|-------------|-------------|
| **Verified** | < 2% | Dark Green | Highly trusted users with long positive history |
| **Trusted** | < 5% | Green | Reliable users with consistent good behavior |
| **Regular** | 5-15% | Blue | Normal users, no major concerns |
| **New** | 5-20% | Yellow | Recently registered or low activity |
| **Suspicious** | 20-50% | Orange | Needs monitoring — elevated spam risk |
| **Blocked** | > 50% | Red | High-risk accounts, content auto-blocked |

Each user's trust level is displayed prominently in the dashboard with a color-coded badge. Click any user row to view their **Reputation History** — a timeline of reputation changes showing score adjustments, reasons, and the moderator who made changes.

The spam ratio is calculated automatically from the user's submission history and updates in real time as new content is moderated.

#### Moderator Performance

Track moderator effectiveness with performance analytics showing total actions, approvals, rejections, and spam marks per moderator. This helps team leads understand workload distribution and identify training needs.

#### Activity Feed

The Activity Feed shows real-time moderation actions as they happen, powered by a persistent WebSocket connection. All connected moderators see updates instantly without page refreshes (Section 10.6 - Collaboration Features):

- **Moderator actions** — Approve, reject, spam, flag, defer events (type: `action`)
- **Moderation notes** — Notes added to items (type: `note`)
- **Item assignments** — Items assigned to moderators (type: `assignment`)
- **Escalations** — Items escalated due to spam score or unreviewed time (type: `escalation`)
- **Team changes** — Moderator team membership updates (type: `team_change`)
- **Relative timestamps** — "2m ago", "1h ago", "3d ago"
- **Loading/error states** — Skeleton loading and retry on failure
- **Auto-scroll** — New entries appear at the top with a smooth animation

The feed is accessible from the **Reports** tab and updates automatically via WebSocket. If the connection drops, the feed falls back to periodic polling every 30 seconds.

**Conflict Detection:** The activity feed also powers conflict detection. If two moderators attempt to action the same item simultaneously, a warning modal appears notifying both users of the conflict, showing who actioned the item first and what action was taken.

#### Collaboration Features

##### Moderation Notes (Section 10.6)

Moderators can leave notes on individual queue items for internal communication:

| Feature | Description |
|---|---|
| **Note Types** | General, Question, Instruction, Resolution |
| **Internal Notes** | Visible only to moderators, not content authors |
| **Newest First** | Notes are displayed in reverse chronological order |
| **Persistent Storage** | Notes are stored server-side with 30-day retention |

To add a note, open the item detail panel (click the 👁️ icon) and scroll to the **Moderation Notes** section. Select the note type, mark it as internal if needed, and click **Add Note**.

#### Item Assignment (Section 10.1)

Queue items can be assigned to specific moderators with priority and due dates using the assignment UI in the detail slide-out panel:

- **Open the detail panel** — Click the 👁️ (eye) icon on any queue item to open the right-hand slide-out panel
- **Find the Assignment section** — Scroll down in the panel, below the action buttons and item details, to the **Assignment** card
- **Select a moderator** — The **Assign To** field provides a searchable dropdown of all active moderators on your team
- **Set a due date** — Use the date picker to set an SLA deadline; overdue assignments are highlighted in red
- **Set priority** — Choose Low, Normal, High, or Critical using the segmented button control
- **Save** — Click **Save Assignment** to submit; the panel refreshes to show the assignment details

The assignment card in the slide-out panel displays the current assignment status at a glance:

| Field | Description |
|---|---|
| **Assigned To** | Current assignee, or "Unassigned" |
| **Priority** | Displayed as a colored badge (gray for Low, blue for Normal, orange for High, red for Critical) |
| **Due Date** | Shown with days remaining; overdue items show "Overdue by X days" in red |
| **Assigned By** | The moderator who made the assignment |
| **Assigned At** | Timestamp of when the assignment was created |

All assignments are logged in the activity log with:
- Who assigned the item
- Who was assigned
- The priority level and due date
- A timestamp of the assignment

Use assignments to:
- Distribute workload across your moderation team with the visual workload view
- Track SLA compliance with color-coded due date indicators
- Prioritize critical content with priority levels
- Maintain an audit trail of responsibility

#### Multi-Platform Hub

The Multi-Platform Hub provides a central dashboard showing the connection status of all supported platforms:

- **WordPress** — Always connected as the host platform
- **Shopify** — Connect via the Shopify app (see Shopify section)
- **Storyblok** — Connect via the Storyblok app
- **Strapi** — Connect via the Strapi plugin
- **Wix** — Connect via the Wix app

The hub displays each platform's health status and provides quick access to cross-platform moderation settings.

---

## WordPress Plugin

The WordPress plugin integrates CMCC directly into the WordPress admin dashboard. It's the most feature-complete platform integration with custom database tables and full REST API support.

### Installation

#### Requirements

- WordPress **5.0+** (6.0+ recommended)
- PHP **7.4+** (8.0+ recommended)
- MySQL **5.7+** or MariaDB **10.3+**

#### Step-by-Step

1. **Download** the plugin ZIP from the [CMCC website](https://cmcc.dev) or your purchase source.
2. In your WordPress admin, go to **Plugins → Add New → Upload Plugin**.
3. Choose the ZIP file and click **Install Now**.
4. Activate the plugin labeled **"CMCC — Content Moderation Command Center"**.
5. A new **CMCC** menu item appears in the admin sidebar with submenus: **Queue**, **Analytics**, and **Settings**.

On activation, CMCC automatically creates its custom database tables and sets sensible default settings.

#### Setup Wizard

Upon first activation, a welcome notice appears: *"Welcome to CMCC! Run the Setup Wizard to configure your moderation center."*

Click **Launch Setup Wizard** for a 3-step guided setup:

1. **Welcome** — Brief overview of CMCC features and benefits.
2. **Initial Configuration** — Enable/disable Spam Firewall (default: on), set notification threshold (default: 50 pending items), choose queue refresh interval (default: 30 seconds).
3. **Complete** — Success message with buttons to go to the Moderation Center or explore Settings.

You can skip the wizard and configure everything later via the Settings page.

### REST API

The WordPress plugin registers the following REST API endpoints under the `cmcc/v1` namespace:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wp-json/cmcc/v1/queue` | List queue items (paginated, filterable) |
| `POST` | `/wp-json/cmcc/v1/queue/:id/action` | Moderate a single item |
| `POST` | `/wp-json/cmcc/v1/queue/bulk-action` | Perform bulk actions |
| `GET` | `/wp-json/cmcc/v1/queue/:id/history` | Get item history/timeline |
| `GET` | `/wp-json/cmcc/v1/queue/:id/notes` | Get notes for a queue item |
| `POST` | `/wp-json/cmcc/v1/queue/:id/note` | Add a note to a queue item |
| `POST` | `/wp-json/cmcc/v1/queue/:id/assign` | Assign item to a moderator |
| `GET` | `/wp-json/cmcc/v1/analytics` | Get analytics data |
| `GET` | `/wp-json/cmcc/v1/activity-log` | Get activity log entries |
| `GET` | `/wp-json/cmcc/v1/activity-feed` | Get recent moderation activity |
| `GET` | `/wp-json/cmcc/v1/users/reputation` | Get user reputation data |
| `GET` | `/wp-json/cmcc/v1/settings` | Get current settings |
| `POST` | `/wp-json/cmcc/v1/settings` | Update settings |
| `POST` | `/wp-json/cmcc/v1/settings/export` | Export settings as JSON |
| `POST` | `/wp-json/cmcc/v1/settings/import` | Import settings from JSON |

### Using the Queue

Navigate to **CMCC → Queue** in the WordPress admin sidebar.

1. Review items in the queue table — each row shows content type, title/excerpt, author, date, status, and spam score.
2. Use the **quick action buttons** (Approve, Reject, Mark Spam, Defer) on each row.
3. Select multiple items with checkboxes and use the **Bulk Actions** dropdown for batch operations.
4. Use the **filters** (Content Type, Status, Date Range) and **search bar** to narrow down results.
5. The table is **sortable** — click any column header to sort.
6. Navigate pages using the **pagination controls** at the bottom.

### Analytics

Navigate to **CMCC → Analytics**.

- View the **Activity Heatmap** to understand when content is being submitted.
- Check the **Spam Ratio Gauge** for a quick health indicator.
- Review the **Content-Type Breakdown** pie chart.
- Monitor **Moderator Performance** (if you have multiple moderators).
- Respond to **Anomaly Alerts** by clicking the **Investigate** button.

Use the **Date Range Picker** to adjust the time window. Click **Refresh** to pull the latest data.

### Settings

Navigate to **CMCC → Settings**.

Settings are organized into five tabs: **General**, **Spam Firewall**, **Notifications**, **Advanced**, and **About**. See the [Common Settings](#settings) section above for full details on each tab.

When you modify a setting, an "unsaved change" indicator appears on the field. Click **Save Changes** to persist. On success, the button briefly shows a checkmark and all unsaved indicators disappear. Changes apply immediately — no page reload needed.

### Database

CMCC creates the following custom tables on activation:

- `wp_cmcc_queue` — Stores moderation queue items with status, spam score, and content metadata.
- `wp_cmcc_activity_log` — Records all moderation actions for the audit trail.

Settings are stored as a WordPress option (`cmcc_settings`).

### Multi-Site Support (Section 9 - Missing Features)

CMCC fully supports WordPress Multisite networks:

- **Network Activation** — When activated network-wide, CMCC creates its tables on every site in the network
- **Per-Site Data** — Each site maintains its own queue, activity log, and settings (using `$wpdb->prefix`)
- **Network Admin** — A **CMCC** submenu is available under **Settings** in the Network Admin for network-wide configuration
- **Plugin Management** — Activate or deactivate CMCC on individual sites via the **Network Admin → Plugins** screen

> **Note:** When using multisite, each site's moderator queue and analytics are independent. There is no cross-site aggregation of data in the current version.

### Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| **Queue not loading** | REST API conflict or permalink issue | Go to **Settings → Permalinks** and click **Save Changes** to flush rewrite rules |
| **Settings not saving** | REST API blocked by security plugin | Whitelist `/wp-json/cmcc/v1/*` in your security or firewall plugin |
| **Analytics showing no data** | No items have been moderated yet | Submit test content and moderate it to generate data |
| **Spam Firewall not triggering** | Firewall disabled or rules not configured | Go to **Settings → Spam Firewall** and verify enabled status and rule thresholds |
| **White screen after activation** | PHP version too low or plugin conflict | Check PHP 7.4+ requirement, disable other plugins temporarily |
| **"Sorry, you are not allowed" error** | Insufficient user permissions | Ensure you have administrator privileges or the `manage_options` capability |

**Debug Log:** Enable debug logging in **Settings → Advanced**, then download the log file. Check your WordPress `debug.log` (in `/wp-content/`) for PHP errors.

**Support:** Visit [https://cmcc.dev/support](https://cmcc.dev/support) or open an issue on the GitHub repository.

---

## Strapi Plugin

The Strapi plugin integrates CMCC as a native Strapi plugin with custom content types, controllers, services, and an admin panel built with the Strapi Design System.

### Installation

#### Requirements

- Strapi **v4** or **v5**
- Node.js **18+**

#### Step-by-Step

1. **Copy the plugin** into your Strapi project:
   ```bash
   cd src/plugins
   git clone <repo-url> cmcc
   # or copy the @cmcc/strapi package into your plugins directory
   ```

2. **Install dependencies and rebuild** the Strapi admin panel:
   ```bash
   cd your-strapi-project
   npm run build
   # or
   yarn build
   ```

3. **Enable the plugin** in `config/plugins.js`:
   ```js
   module.exports = ({ env }) => ({
     // ...
     cmcc: {
       enabled: true,
       config: {
         autoModerate: false,
         moderationBehavior: 'flag',
         maxLinks: 5,
         blacklistedKeywords: [],
         duplicateDetection: true,
         notifyOnSpam: true,
       },
     },
   });
   ```

### Setup

On Strapi bootstrap, CMCC automatically creates the following content types:

| Content Type | Collection / Single | Purpose |
|---|---|---|
| `cmcc_queue_items` | Collection | Stores moderation queue entries with status, spam score, and content metadata |
| `cmcc_activity_logs` | Collection | Records all moderation actions for audit trails |
| `cmcc_settings` | Single type | Single-entry plugin configuration |

### Role-Based Access Control

The plugin registers granular permissions. Assign them to roles in **Strapi Admin → Settings → Roles**:

| Permission | Description |
|---|---|
| `plugin::cmcc.queue.read` | View the moderation queue |
| `plugin::cmcc.queue.moderate` | Moderate individual items |
| `plugin::cmcc.queue.bulk` | Perform bulk moderation actions |
| `plugin::cmcc.analytics.read` | View the analytics dashboard |
| `plugin::cmcc.settings.read` | Read plugin settings |
| `plugin::cmcc.settings.update` | Update plugin settings |
| `plugin::cmcc.activity-log.read` | View the activity log |

### Usage

1. Navigate to **CMCC** in the Strapi admin sidebar.
2. The interface has three main tabs: **Queue**, **Analytics**, and **Settings**.
3. All features (queue management, analytics, activity log, settings) work identically to the [Common Features](#common-features-across-all-platforms) described above.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/cmcc/queue` | List queue items |
| `POST` | `/cmcc/queue/:id/moderate` | Moderate a single item |
| `POST` | `/cmcc/queue/bulk` | Bulk moderate items |
| `GET` | `/cmcc/analytics` | Get analytics data |
| `GET` | `/cmcc/activity-log` | Get activity log entries |
| `GET` | `/cmcc/settings` | Read settings |
| `PUT` | `/cmcc/settings` | Update settings |

### Troubleshooting

| Issue | Solution |
|---|---|
| **Plugin not appearing in sidebar** | Ensure `enabled: true` in `config/plugins.js` and rebuild the admin with `npm run build` |
| **Queue empty when content exists** | Verify that the content types you want to moderate are configured in CMCC settings |
| **Permission errors** | Check role permissions under **Settings → Roles** in Strapi admin |
| **API 404 errors** | Confirm the Strapi server is running and routes are registered (check server logs) |

---

## Storyblok App

The Storyblok app runs CMCC as a custom app inside your Storyblok workspace, rendered in an iframe. It connects to a configurable backend API.

### Prerequisites

- A Storyblok space with **Custom Apps** enabled
- A running CMCC backend API instance (self-hosted or provided service)

### Installation

#### 1. Build the App

```bash
cd platforms/storyblok
npm install
npm run build
```

This produces the following files in `dist/`:

- `index.js` — The bundled React application
- `styles.css` — Self-contained application styles

#### 2. Deploy the App

Upload the entire `dist/` folder to your hosting provider. Options include:

- **Static hosting** (Netlify, Vercel, AWS S3 + CloudFront, GitHub Pages)
- **CDN** (Cloudflare, Fastly)
- **Self-hosted** (any web server)

#### 3. Add the App to Storyblok

1. In your Storyblok space, go to **Settings → Apps**.
2. Click **Add App → Custom App**.
3. Fill in the details:
   - **Name**: `CMCC Moderation`
   - **App URL**: The URL where `index.js` and `styles.css` are hosted (e.g., `https://your-domain.com/cmcc/`)
4. Save the app configuration.

### Configuration

After installation, configure the app by navigating to its **Settings** tab (inside the app):

| Setting | Description |
|---|---|
| **API Endpoint URL** | The base URL of your CMCC backend API |
| **API Key** | Authentication key for the CMCC API |
| **Spam Score Threshold** | Items above this score (0–1) are auto-flagged |
| **Auto-approve** | Automatically approve items below the threshold |
| **Alert on volume spikes** | Notify when queue volume exceeds normal levels |
| **Alert on high spam** | Notify when spam ratio exceeds configured thresholds |
| **Queue Poll Interval** | How often to poll for new items (5–300 seconds) |

### Usage

1. Open the **Storyblok app drawer** and click the **CMCC Moderation** app icon.
2. The app interface loads in an iframe within Storyblok.
3. Manage the queue, review analytics, and configure settings using the same workflows described in [Common Features](#common-features-across-all-platforms).

### Troubleshooting

| Issue | Solution |
|---|---|
| **App shows blank iframe** | Verify the App URL is correct and the hosted files are accessible (check for CORS issues) |
| **API connection fails** | Confirm the backend API URL and API key in Settings; check CORS configuration on your backend |
| **No items in queue** | Ensure user-generated content is reaching your CMCC backend |
| **Styling looks off** | The app uses the Storyblok theme by default; ensure you're using a supported browser |

---

## Wix App

The Wix Dashboard App embeds CMCC directly into the Wix site dashboard, using the Wix coral theme (`#ff6b6b`).

### Prerequisites

- A Wix site with [Wix Developers](https://dev.wix.com) dashboard enabled
- Node.js **18+**
- A running CMCC backend service (Node.js/Express or compatible)

### Installation

#### 1. Build the App

```bash
cd platforms/wix
npm install
npm run build
```

This produces `dist/app.js` and `dist/app.css`.

#### 2. Prepare the HTML Host Page

Create an `index.html` that loads the app:

```html
<!-- index.html -->
<div id="cmcc-wix-app-root"></div>
<link rel="stylesheet" href="/path/to/app.css" />
<script
  crossorigin
  src="https://unpkg.com/react@18/umd/react.production.min.js"
></script>
<script
  crossorigin
  src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
></script>
<script src="/path/to/app.js"></script>
```

> **Note:** React and ReactDOM are excluded from the webpack bundle. They must be loaded from a CDN (or hosted alongside the app).

#### 3. Upload as Wix App

1. Go to the [Wix Developers Console](https://dev.wix.com).
2. Create a new **Dashboard App** (or edit an existing one).
3. Under **App Settings → App URL**, provide the URL where your `index.html` is hosted.
4. Configure the app permissions to access site data via the Wix SDK.

### Configuration

The app requires a CMCC backend API. Set the API URL either:

- **At build time:** Set the `CMCC_API_URL` environment variable.
- **At runtime:** Enter the URL in the app's **Settings** tab.
- **Via Wix secrets:** Store the URL in Wix's Secrets Manager and inject it into the iframe.

#### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/queue` | List all queue items |
| `PATCH` | `/api/queue/:id` | Perform action on a single item |
| `POST` | `/api/queue/bulk` | Perform bulk action on multiple items |
| `GET` | `/api/analytics` | Fetch analytics data |
| `GET` | `/api/activity` | Fetch activity log entries |
| `PUT` | `/api/settings` | Save settings |

### Usage

1. Open your Wix site dashboard.
2. Click the **CMCC** app icon in the dashboard sidebar.
3. The full moderation interface loads — **Queue**, **Analytics**, **Activity Log**, and **Settings** tabs.
4. Manage content moderation using the same workflows described in [Common Features](#common-features-across-all-platforms).

### Troubleshooting

| Issue | Solution |
|---|---|
| **App does not render** | Ensure the `<div id="cmcc-wix-app-root">` container exists in your HTML and React/ReactDOM globals are loaded |
| **API connection fails** | Verify the backend URL in Settings. Check CORS configuration on your backend — it must allow requests from the Wix dashboard origin |
| **No items appear** | Ensure content (comments, reviews, form entries, etc.) is being submitted to your Wix site and the CMCC backend is actively monitoring it |
| **Styling seems off** | The app uses the Wix coral theme. Verify you're on a supported browser version |

---

## Shopify App

The Shopify App embeds CMCC as an Admin App using **Shopify Polaris** for UI and **Shopify App Bridge** for admin embedding and navigation.

### Prerequisites

- A **Shopify store** with custom app installation permissions
- A **Shopify Partners account** (for creating and managing apps)
- Node.js **18+**
- **Shopify CLI** installed

### Required API Scopes

Configure these OAuth scopes in your Shopify Partners dashboard under **Configuration → Scopes**:

| Scope | Reason |
|---|---|
| `read_products` | Access product data for content association |
| `write_products` | Moderate product reviews and content |
| `read_customers` | Look up customer information |
| `read_content` | Read shop content |
| `write_content` | Moderate shop content |

### Installation

#### 1. Build the App

```bash
cd platforms/shopify
npm install
npm run build
```

Output is written to `dist/app.js` and `dist/app.css`.

#### 2. Set Up Environment Variables

Configure these in your Shopify Partners dashboard:

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_API_KEY` | Yes | API key from Shopify Partners dashboard |
| `SHOPIFY_API_SECRET` | Yes | API secret from Shopify Partners |
| `SHOPIFY_APP_URL` | Yes | Public HTTPS URL serving the app |
| `SCOPES` | Yes | Comma-separated OAuth scopes (see above) |
| `CMCC_API_URL` | No | Backend CMCC API base URL (default: `/api`) |
| `PORT` | No | Local development server port (default: `3000`) |

#### 3. Set Up the App with Shopify CLI

1. Create an app entry in your **Shopify Partners** dashboard.
2. Run Shopify CLI to scaffold the app tunnel:
   ```bash
   shopify app tunnel start
   ```
3. Set the app URL and allowed redirection URLs to the tunnel URL (or your deployed URL).
4. Serve the built assets from your app server or a CDN.

#### 4. Install on Your Store

1. Go to your Shopify admin → **Apps** → **Custom apps**.
2. Click **Create custom app** and follow the prompts.
3. Grant the required API scopes.
4. Install the app to your store.

### Usage

1. Open your **Shopify admin** dashboard.
2. Find **CMCC** in the left navigation under **Apps** (or wherever you've configured it).
3. The app loads as an embedded Polaris interface within your admin.
4. Use the **Queue** tab to review and moderate content.
5. Switch to **Analytics** for insights and **Settings** for configuration.

All workflows match the [Common Features](#common-features-across-all-platforms) described earlier.

### Troubleshooting

| Issue | Solution |
|---|---|
| **App does not load in admin** | Ensure the app URL is HTTPS and accessible. Check Shopify App Bridge is not being blocked |
| **OAuth errors** | Verify the scopes in your Partners dashboard match what the app requests. Reinstall the app if scopes changed |
| **API data not appearing** | Confirm `CMCC_API_URL` is correctly set and the backend is running. Check CORS/network configuration |
| **Polaris components look broken** | Polaris and React are loaded as externals from the Shopify CDN — verify they are not blocked by content security policies |
| **"Access denied" errors** | Ensure required OAuth scopes are granted. Re-authenticate if needed |

---

## Common Troubleshooting

### Queue Not Loading

- **Check network connectivity** — Is your server reachable? Open browser DevTools → Network tab to see if API calls are failing.
- **Check authentication** — Are you logged in with sufficient permissions? Some platforms require specific roles.
- **Flush cache** — If using WordPress, go to **Settings → Permalinks** and click **Save Changes** (this flushes rewrite rules).
- **Check the REST API** — Manually visit the queue API endpoint in your browser (e.g., `/wp-json/cmcc/v1/queue`) to verify it returns data.

### Settings Not Saving

- **Check for JavaScript errors** — Open browser DevTools → Console tab.
- **Verify permissions** — Ensure your user role has permission to update settings.
- **Check for conflicting plugins/modules** — Security plugins or custom middleware may block API requests.
- **Server timeout** — Very large keyword lists or IP blocklists may cause save requests to time out. Try reducing the list size.

### Analytics Showing No Data

- **Has any moderation activity occurred?** — Analytics are generated from queue and moderation data. If no items have been moderated, there's nothing to display.
- **Is the date range correct?** — Try expanding to "Last 30 Days" or "Custom" with a wider range.
- **Data may be cached** — Analytics are cached for up to 5 minutes. Wait and refresh.
- **Check the backend** — Ensure the analytics endpoint is returning data.

### Firewall Rules Not Triggering

- **Is the Spam Firewall enabled?** — Check the master toggle in **Settings → Spam Firewall**.
- **Are the rules configured with appropriate thresholds?** — For example, "Max links" defaults to 3. If your test content has 2 links, it won't trigger.
- **Is the global action set to something visible?** — If set to "Silently discard", items won't appear in the queue at all. Try "Flag for review" temporarily to see if rules are working.
- **Check your server error logs** — The firewall logs warnings when rules can't be processed (e.g., GeoLite2 database missing).

### Performance Issues

- **Reduce page size** — Lower "Items per page" in General settings from 100 to 25.
- **Disable auto-refresh** — Turn off auto-refresh in General settings if the queue is polling too frequently.
- **Prune the activity log** — Reduce the retention period in Advanced settings to clear old entries.
- **Optimize database tables** — Use the **Optimize Tables** button in Advanced settings.
- **Enable compact view** — Compact queue view reduces rendering complexity.

---

## FAQ

### How does the Spam Firewall work?

The Spam Firewall evaluates every piece of incoming content against a configurable set of rules. Each rule has an enable toggle and threshold:

1. Content is submitted to your site (comment, review, form entry, etc.).
2. CMCC intercepts the submission and runs it through all enabled firewall rules.
3. If **any** rule triggers, the content is actioned according to the global action setting:
   - **Flag for review** — Content is marked as "flagged" and appears in the queue for manual review.
   - **Silently discard** — Content is deleted immediately and never enters the queue.
   - **Send to spam** — Content is moved to the spam folder (comments only).
4. If **no** rules trigger, the content passes through to the queue as "pending" (or auto-approved if auto-moderation is enabled).

Rules are checked in order: max links → keywords → IP/email blocklist → country block → submit time → duplicate detection. All applicable rules are evaluated before any action is taken.

### What is the User Reputation System?

The reputation system automatically scores users based on their content submission history:

- **Approved content**: +1 point per approved item
- **Rejected/spam content**: −2 points per rejected or spam item
- **Auto-deactivation threshold**: When a user's score drops to −10, their account is automatically deactivated
- **Score decay**: After 30 days of inactivity, users regain 1 point every 7 days (up to a maximum of 0)

Users are classified into risk levels:

| Score Range | Risk Level | Label |
|---|---|---|
| 10+ | Low | Trusted User |
| 0–9 | Low | Regular User |
| −1 to −9 | Medium | Watchlisted |
| −10 or below | High | Deactivated |

You can adjust all scoring values in **Settings → General**.

### How is data stored?

Data storage depends on the platform:

- **WordPress**: Two custom database tables (`wp_cmcc_queue`, `wp_cmcc_activity_log`) plus a WordPress option (`cmcc_settings`). All tables use the configured WordPress table prefix.
- **Strapi**: Three custom content types (`cmcc_queue_items`, `cmcc_activity_logs`, `cmcc_settings`) stored in the Strapi database (SQLite, PostgreSQL, or MySQL depending on your Strapi configuration).
- **Storyblok / Wix / Shopify**: These platforms run as apps and rely on a **CMCC backend API** for data storage. The backend uses its own database (typically PostgreSQL or MySQL). Queue items, activity logs, and settings are stored server-side.

In all cases, content data (the actual comment text, author info, etc.) remains in your primary CMS database. The CMCC queue stores only references and metadata needed for moderation.

### Can I customize moderation rules?

Yes. The **Spam Firewall** settings allow full customization of all rules:

- Toggle each rule on/off independently.
- Adjust thresholds (link counts, submission time limits, lookback periods, etc.).
- Manage keyword, IP, email, and country blocklists.
- Change the global action for when rules trigger.

Additionally, the **General** settings let you control:

- Whether auto-moderation is enabled (automatically approve content that passes all firewall rules).
- The moderation behavior when the firewall triggers (flag, spam, or discard).

### How do I add support for new content types?

CMCC monitors content types registered with your CMS. To add a new content type:

- **WordPress**: The plugin automatically detects standard content types (comments, posts, pages, media, users). For custom post types or third-party plugins (WooCommerce reviews, bbPress, BuddyPress), CMCC hooks into WordPress's standard moderation filters. If a custom post type registers the appropriate WordPress hooks, CMCC will detect it automatically.
- **Strapi**: Any collection type can be configured for moderation via the plugin settings. You may need to extend the plugin's configuration to map new content types.
- **Storyblok / Wix / Shopify**: Content type detection is handled by your CMCC backend API. Configure the backend to monitor additional content sources.

> **V2 Enhancement:** Future versions will include a drag-and-drop content type mapping interface.

### How does the Analytics heatmap work?

The heatmap visualizes moderation activity intensity on a day-of-week (vertical) × hour-of-day (horizontal) grid:

- Each cell represents a specific hour on a specific day (e.g., "Monday at 3 PM").
- Cell color intensity reflects the volume of pending/spam items created during that time slot.
- Lighter cells = low activity; darker cells = high activity.
- Cells exceeding a volume threshold are highlighted with a **red border** and notification icon — these are anomalies worth investigating.

Click any cell to jump to the queue filtered to that exact time period.

### Can I undo a moderation action?

Yes, within **5 minutes** of taking the action:

1. Go to the **Activity Log**.
2. Find the entry you want to undo — it will have an **Undo** button with a countdown timer.
3. Click **Undo** to revert the item to its previous status.

After 5 minutes, the action is considered final and the Undo button is no longer available.

### Is there a dark mode?

Yes. CMCC provides full dark mode support with multiple access methods:

- **🌙/☀️ Theme Toggle**: Click the moon/sun icon in the top bar (right side) of any CMCC page to switch between Light and Dark themes instantly.
- **Settings**: Navigate to **Settings → Appearance & Display → Theme** and select Light, Dark, or System.
- **System-aware**: When set to "System", CMCC follows your OS-level theme preference automatically.

The theme preference is persisted in `localStorage`, so it survives page reloads and works across all browser tabs — changing the theme in one tab automatically updates all other open CMCC tabs.

Dark mode covers all CMCC components including tables, charts, modals, settings forms, slide-out panels, activity feed, and the queue table. All Tailwind utility classes (`tw-bg-white`, `tw-text-gray-900`, `tw-border-gray-200`, etc.) are overridden for dark theme with smooth CSS transitions between themes.

The dark palette uses a deep navy/charcoal scheme (#1a1a2e backgrounds, #2a2a4a borders, #e0e0e0 text) for reduced eye strain during extended moderation sessions.

### What happens to my data if I uninstall?

- **WordPress**: An uninstall hook removes the custom database tables and settings option. All CMCC data (queue items, activity logs, settings) is permanently deleted. Your existing WordPress content (comments, posts, etc.) is **not** affected.
- **Strapi**: Uninstalling the plugin and removing the plugin files leaves the content types in the database. You can delete them manually via the Strapi Content Manager if desired.
- **Storyblok / Wix / Shopify**: Data remains in the CMCC backend database. The app connection is removed from the platform, but the backend retains the data.

---

## Support & Community

### Issue Tracker

Found a bug or have a feature request? Open an issue on the official CMCC GitHub repository. Please include:

- Your platform and version (WordPress 6.4, Strapi 4.25, etc.)
- CMCC version (see Settings → About)
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots or error messages (if applicable)

### Documentation

- **Official Website:** [https://cmcc.dev](https://cmcc.dev)
- **This User Guide:** Located in `docs/user-guide.md` in the repository
- **UI/UX Specification:** See `docs/design/ui-ux-spec.md` for design details
- **API Reference:** Platform-specific API endpoints are documented in each platform's README

### Contributing

CMCC is an open-source project. Contributions are welcome:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -am 'Add my feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

See the repository `CONTRIBUTING.md` (if available) for detailed guidelines.

### License

| Component | License |
|---|---|
| WordPress Plugin | GPL-2.0-or-later |
| Strapi Plugin | MIT |
| Storyblok App | MIT |
| Wix App | MIT |
| Shopify App | Proprietary |
| `@cmcc/core` package | MIT |
| `@cmcc/ui` package | MIT |

The WordPress plugin is licensed under GPL-2.0-or-later to comply with WordPress plugin distribution requirements. All shared packages (`@cmcc/core`, `@cmcc/ui`) are MIT. Platform-specific integrations carry permissive or proprietary licenses as indicated.

---

*CMCC — Content Moderation Command Center v1.0.0*
*Documentation last updated: June 2026 (Sections 8–10 implemented)*
