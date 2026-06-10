# CMCC User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Moderation Queue](#moderation-queue)
4. [Analytics Dashboard](#analytics-dashboard)
5. [Activity Log](#activity-log)
6. [Reports & Compliance](#reports--compliance)
7. [Settings](#settings)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Dark Mode](#dark-mode)
10. [Saved Filters](#saved-filters)
11. [Item Assignment](#item-assignment)
12. [Exporting Data](#exporting-data)
13. [Troubleshooting](#troubleshooting)

## Getting Started

CMCC (Content Moderation Command Center) provides a centralized interface for managing all content moderation tasks across your WordPress site.

### Accessing the Plugin
1. Log in to your WordPress admin dashboard
2. Click on **CMCC** in the admin sidebar menu
3. The plugin dashboard will open with the **Queue** tab active

### Navigation
The plugin uses a tab-based navigation system:
- **Queue** — View and moderate pending content
- **Analytics** — View moderation statistics and charts
- **Activity Log** — Review all moderation actions
- **Reports** — Compliance reports, user reputation, and moderator performance
- **Settings** — Configure moderation rules and preferences

## Dashboard Overview

### Stats Cards
The top of the Analytics tab displays summary stats:
- **Pending** — Items awaiting review
- **Spam** — Items marked as spam
- **Flagged** — Items flagged for review
- **Total** — Total items in the queue

### Date Range Picker
In the Analytics tab, you can filter data by date range:
1. Click the date display button at the top right
2. Select a preset (Last 7, 14, 30, or 90 days)
3. Or use the calendar to select a custom range
4. All charts and stats update automatically

## Moderation Queue

The Queue tab shows all content awaiting moderation.

### Actions
Each item has action buttons:
- **✓ (Approve)** — Approve content
- **✕ (Reject)** — Reject content
- **🚫 (Spam)** — Mark as spam
- **⏳ (Defer)** — Defer decision
- **📖 (View)** — View full content details

### Bulk Actions
1. Select items using checkboxes
2. Choose a bulk action from the dropdown
3. Click **Apply** to execute

### Filters
Filter the queue by:
- **Status** — All, pending, spam, flagged, etc.
- **Content Type** — Comments, posts, reviews, etc.
- **Date Range** — All time, last 24 hours, last 7/30/90 days
- **Search** — Search by title or excerpt

### Sorting
Click any column header to sort by that field. Click again to toggle ascending/descending.

### Quick Filter Bar (Section 8 - Design Modernization)
One-click preset filters at the top of the Queue tab:
| Preset | Description |
|--------|-------------|
| **All** | Clear all filters |
| **Last Hour** 🕐 | Items from last 60 minutes |
| **Today** 📅 | Items from today |
| **This Week** 📆 | Items from this week |
| **Pending Only** ⏳ | Only items needing review |
| **High Spam Score** 🚫 | Items with high spam probability |
| **Flagged** ⚠️ | Items that have been flagged |

### Saved Filters (Section 10.1 - Advanced Queue Management)
Save your current filter combination for quick access:
1. Set your desired filters
2. Type a name in the "Name this filter..." input box
3. Click **+ Save Filter** or press **Enter**
4. Load saved filters from the **Saved Filters...** dropdown

### Bulk Operations Progress
When performing bulk actions, a progress bar shows the operation status with visual feedback.

## Analytics Dashboard

### Charts
The Analytics tab includes:
- **Activity Heatmap** — 7-day × 24-hour grid showing moderation activity
- **Status Distribution** (Donut Chart) — Breakdown by status
- **Moderation Volume** (Line Chart) — Daily moderation activity over time
- **Spam Content Types** (Bar Chart) — Which content types attract the most spam
- **Spam Ratio** — Percentage of spam items
- **Content Breakdown Table** — Per-content-type statistics with per-status breakdowns
- **Moderator Performance** — Per-moderator action counts and accuracy metrics
- **Anomaly Alerts** — Automated detection of unusual activity spikes

### Date Range
Use the date range picker to view analytics for specific periods. All charts update dynamically.

## Activity Log

The Activity Log shows a chronological record of all moderation actions.

Columns:
- **Date** — When the action occurred
- **Moderator** — Who performed the action
- **Action** — What was done (Approved, Rejected, etc.)
- **Type** — Content type
- **Item** — Content identifier
- **Previous/New Status** — Status changes
- **Notes** — Moderator comments on the action

## Reports & Compliance

The **Reports** tab provides compliance, auditing, and analytics tools (Sections 10.3, 10.4, 10.6):

### Moderation Activity Report
Export a comprehensive CSV report of all moderation activity for the selected date range. Includes item IDs, content types, actions taken, and timestamps.

### Compliance Audit Log
Export the full compliance audit trail with moderator details, timestamps, and status changes. Ideal for regulatory compliance and internal audits.

### Scheduled Reports (Section 10.4)
Schedule recurring reports to be auto-generated and emailed:
1. Select **Report Type** (Moderation Activity, Compliance Audit, Moderator Performance)
2. Choose **Frequency** (Daily, Weekly, Monthly)
3. Select **Format** (CSV, JSON)
4. Click **+ Schedule Report**

### User Reputation Dashboard (Section 10.3)
View all users and their trust levels:
- **Trust Levels** — Trusted, New, Suspicious, Blocked (auto-assigned based on spam ratio)
- **Total Items** — Number of items submitted by each user
- **Spam Count** — Number of items marked as spam
- **Approved Count** — Number of items approved
- **Spam Ratio** — Percentage of items that are spam
- Sortable columns for easy analysis

### Moderator Performance
View per-moderator metrics:
- **Total Actions** — Number of moderation actions performed
- **Approvals** — Number of content items approved
- **Rejections** — Number of content items rejected
- **Spam Marks** — Number of items marked as spam

### Activity Feed (Section 10.6)
Real-time feed of all moderator actions across the system:
- Shows actions, notes, assignments, and escalations
- Color-coded by event type
- Relative timestamps ("2m ago", "1h ago")
- Loading and error states with retry

### Collaboration Features (Section 10.6)

#### Moderation Notes
Add internal notes to queue items for team communication:
1. Open an item's detail panel (click the item row)
2. Scroll to the **Moderation Notes** section
3. Select note type: General, Question, Instruction, or Resolution
4. Toggle **Internal only** for notes not visible to content authors
5. Click **Add Note** to save

Notes are displayed newest-first with author name, timestamp, and type badge.

#### Item Assignment (Section 10.1 - Advanced Queue Management)
Assign queue items to specific moderators with deadlines:
1. Open an item's detail panel
2. Scroll to **Assignment** section
3. Enter the moderator's name
4. Set a **Due Date** for completion
5. Select **Priority**: Low, Normal, High, Critical
6. Click **Save Assignment**

Assigned items can be tracked with SLA monitoring and auto-escalation when deadlines are breached.

### Multi-Platform Hub (Section 10.5)
View the connection status of all CMS platforms:
- **WordPress** — Always connected (host platform)
- **Shopify** — Connect for e-commerce content moderation
- **Storyblok** — Connect for headless CMS content
- **Strapi** — Connect for Strapi-powered content
- **Wix** — Connect for Wix site content

Each platform card shows connection status and provides one-click connection setup.

## Settings

### General Settings
- **Auto Moderate** — Enable automatic moderation
- **Moderation Behavior** — How auto moderation handles items
- **Queue Page Size** — Items per page in the queue
- **Language** — Interface language

### Spam Firewall
- **Max Links** — Maximum links before flagging
- **Blacklisted Keywords** — Keywords that trigger moderation
- **Blacklisted Domains** — Domains that trigger moderation
- **Min Submit Time** — Minimum form submission time (anti-bot)
- **Duplicate Detection** — Detect duplicate content

### Notifications
- **Email Alerts** — Enable email notifications
- **Alert Threshold** — Spam score threshold for alerts
- **Notify Moderators** — Select which moderators get notified

### Appearance & Display
- **Theme** — Light, Dark, or System (follows OS preference)
- **Queue View** — Table, Cards, or Compact layout
- **Items Per Page** — Number of items per page
- **Date Format** — Relative ("2 hours ago"), Absolute ("Jan 15, 2026"), or Both
- **Timezone** — Display timezone selection

### Integrations
- **Auto-Import Comments** — Auto-add new comments to the queue
- **Auto-Import Posts** — Auto-add new posts to the queue
- **Auto-Import WooCommerce Reviews** — Auto-add WooCommerce product reviews
- **Auto-Import bbPress Topics/Replies** — Auto-add forum content
- **Auto-Import BuddyPress Activity** — Auto-add social activity
- **Auto-Import Gravity Forms Entries** — Auto-add form submissions
- **Webhook URL** — Receive real-time moderation events

### Advanced Auto Moderation (Section 12)
- **AI Spam Detection Engine** — Select None, Local ML, OpenAI, Claude, or Custom API
- **AI API Endpoint** — Configure AI API connection
- **AI API Key** — Authentication key for AI service
- **Spam Score Thresholds** — Configure Flag (default 60), Spam (80), Discard (95) thresholds
- **Content Hash Sensitivity** — Simhash Hamming distance for duplicate detection
- **Max Links Allowed** — Maximum links before action
- **Block All Links** — Flag any content with links
- **Allowlist/Blocklist** — Domain and keyword allow/block lists
- **All CAPS Detection** — Flag content with >70% capital letters
- **Repeated Character Detection** — Flag excessive character repetition
- **Language Filter** — Block specific languages
- **Min Account Age** — Extra scrutiny for new accounts
- **Block Disposable Emails** — Reject temporary email addresses
- **Rate Limiting** — Max posts per hour per user
- **Banned IP Ranges / Country Codes** — CIDR and ISO code blocking
- **VPN/Proxy Detection** — Flag content from anonymous networks
- **Cooldown Between Posts** — Minimum time between posts
- **Auto-Ban After N Violations** — Automatic user banning
- **Learning Mode** — Audit mode that records evaluations without taking action

### Moderator Management
- **Moderator Roles** — Select which WP roles can moderate
- **Secondary Approval Required** — Require second moderator for high-risk actions
- **Action Confirmation Required** — Confirm before approve/reject/spam actions

### Data Retention
- **Activity Log Retention** — Days before log entries are purged (default: 90)
- **Archived Item Retention** — Days before archived items are purged (default: 365)
- **Auto-Purge Schedule** — Daily, Weekly, Monthly, or Disabled
- **Export Before Purge** — Auto-export data before deletion

### API & Webhooks
- **Webhook URLs** — Separate URLs for new items, approvals, and spam events
- **API Rate Limiting** — Requests per minute (default: 60)
- **Custom API Secret** — For webhook verification

### Backup & Restore
- **Scheduled Backups** — None, Daily, or Weekly
- **Export Settings** — Download current settings as JSON
- **Import Settings** — Upload a JSON file to restore settings

## Keyboard Shortcuts

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

Keyboard shortcuts work when no input field is focused. Press `?` to see the full list of available shortcuts at any time.

## Dark Mode

Toggle between light and dark themes:
1. Click the 🌙/☀️ button in the top-right corner
2. The theme persists across sessions (saved in `localStorage`)
3. Dark mode reduces eye strain during extended moderation sessions
4. Configure the default theme in Settings → Appearance & Display

The dark palette uses a deep navy/charcoal scheme (#1a1a2e backgrounds, #e0e0e0 text) covering all components including tables, charts, modals, and forms.

## Item Assignment (Section 10.1)

Assign queue items to team members with priority and deadlines:
1. Click an item row to open the detail panel
2. Scroll to the **Assignment** section
3. Enter the assignee name
4. Set a due date
5. Select priority (Low / Normal / High / Critical)
6. Click **Save Assignment**

## Exporting Data

### Queue Export (CSV)
Select items in the queue and choose "Export to CSV" from the bulk actions dropdown.

### Settings Export
Go to Settings → Backup & Restore. Click **Export Settings** to download a JSON file.

### Reports Export
Go to the Reports tab:
- **Moderation Activity Report** — Export as CSV or PDF
- **Compliance Audit Log** — Export as CSV

## Troubleshooting

### Queue is Empty
- Make sure WordPress hooks are active (Settings → Integrations)
- Check that content exists (comments, posts, etc.)
- Try refreshing the queue
- Verify that auto-import is enabled for the content types you expect

### Analytics Show No Data
- Ensure there is moderation activity in the selected date range
- Try a different date range (e.g., "Last 30 days")
- Check that the activity log has entries
- Some views may need time to accumulate data

### Export Not Working
- Select at least one item before exporting
- Try a different browser if download doesn't start
- Check browser download permissions
- For reports, ensure you've selected a date range

### Plugin Doesn't Load
- Clear your browser cache
- Deactivate and reactivate the plugin
- Check the browser console for errors
- Ensure WordPress 5.0+ (6.0+ recommended)

### Dark Mode Not Working
- The theme toggle button (🌙/☀️) is in the top-right corner of the CMCC header
- If only specific areas are affected, try refreshing the page
- Check that your browser supports CSS custom properties and `prefers-color-scheme`
