# CMCC - Content Moderation Command Center

**Enterprise content moderation for WordPress** with AI-powered spam detection,
queue management, analytics, and multi-platform support.

## Description

CMCC (Content Moderation Command Center) brings enterprise-grade content
moderation to your WordPress site. It provides a unified moderation queue,
real-time analytics, spam firewall rules, and detailed activity logging—all
from a modern React-based admin interface.

### Features

- **Unified Moderation Queue** – Review, approve, reject, or mark items as spam
  from a single interface.
- **Spam Firewall** – Configurable rules including link limits, keyword
  blacklists, duplicate detection, and more.
- **AI-Powered Moderation** – Integrated with OpenRouter API for automated
  content classification, spam detection, sentiment analysis, and language detection.
- **Real-time Analytics** – Queue statistics, spam ratios, content type
  breakdowns, and activity heatmaps.
- **Activity Log** – Full audit trail of all moderation actions.
- **Bulk Actions** – Approve, reject, or export multiple items at once.
- **10 Settings Tabs** – General, Spam Firewall, Notifications, Appearance & Display,
  Integrations, Advanced Auto Moderation, Moderator Management, Data Retention,
  API & Webhooks, and Backup & Restore.
- **Multi-Platform Support** – Extensible architecture for WordPress, Shopify,
  Storyblok, Strapi, and Wix.
- **Webhooks** – Real-time notifications for new items, approvals, and spam detection.
- **Collaboration** – Internal notes, item assignment, activity feed, and history timeline.

## Installation

1. Download the plugin and place the `cmcc` folder in `/wp-content/plugins/`.
2. Activate the plugin from the WordPress admin **Plugins** page.
3. The **CMCC** menu will appear in the admin sidebar with Queue, Analytics,
   Settings, and Reports submenu pages.

### Requirements

- WordPress 6.0+
- PHP 8.0+
- Node.js 18+ (for development/build)

## AI Moderation (OpenRouter)

CMCC integrates with OpenRouter to provide AI-powered content moderation:

1. Go to **CMCC → Settings** and scroll to the **AI Moderation** section.
2. Set **Engine** to **OpenAI**.
3. Enter your OpenRouter API key (starts with `sk-or-v1-...`).
4. Select a model (GPT-4o, GPT-4o Mini, or o1-mini).
5. Enable **Auto-moderation** to automatically classify content.
6. Adjust the **Spam Threshold** slider (0-100) to control sensitivity.
7. Enable **Language Detection** and/or **Sentiment Analysis** as needed.

> **Note:** Using AI moderation requires an OpenRouter account and API key.
> The API key is stored in your WordPress database and sent to OpenRouter
> for each content evaluation.

## Webhooks

Configure webhooks under **CMCC → Settings → API & Webhooks** tab:

| Webhook | Trigger |
|---------|---------|
| New Items Webhook | Fires when new content enters the queue |
| Approvals Webhook | Fires when content is approved |
| Spam Webhook | Fires when content is marked as spam |

Webhooks send a JSON payload with content type, status, spam score, and
moderation details to the configured URL.

## Cron Jobs

The plugin schedules the following cron events automatically:

| Event | Schedule | Description |
|-------|----------|-------------|
| `cmcc_daily_digest` | Daily | Sends moderation digest email |
| `cmcc_data_purge` | Per settings | Purges old activity log entries |
| `cmcc_scheduled_reports` | Per settings | Generates and sends scheduled reports |

## REST API

The plugin registers the following REST endpoints under `cmcc/v1`:

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/cmcc/v1/queue` | List queue items with filtering/pagination |
| POST | `/cmcc/v1/queue/:id/action` | Moderate a single item |
| POST | `/cmcc/v1/queue/bulk-action` | Perform bulk actions |
| GET | `/cmcc/v1/analytics` | Get analytics data |
| GET | `/cmcc/v1/activity-log` | Get activity log entries |
| GET | `/cmcc/v1/settings` | Get plugin settings |
| POST | `/cmcc/v1/settings` | Update plugin settings |
| POST | `/cmcc/v1/settings/export` | Export settings as JSON |
| POST | `/cmcc/v1/settings/import` | Import settings from JSON |
| GET | `/cmcc/v1/activity-feed` | Get recent moderation activity feed |
| GET | `/cmcc/v1/raw-events` | Get raw events for client-side analytics |
| GET | `/cmcc/v1/reports/moderator-performance` | Get moderator performance analytics |
| POST | `/cmcc/v1/reports/moderation-activity` | Generate moderation activity CSV |
| POST | `/cmcc/v1/reports/compliance-audit` | Export compliance audit log |
| POST | `/cmcc/v1/reports/scheduled` | Schedule a report |
| GET | `/cmcc/v1/reports/scheduled` | List scheduled reports |
| DELETE | `/cmcc/v1/reports/scheduled` | Delete a scheduled report |
| GET | `/cmcc/v1/queue/:id/history` | Get item history |
| GET | `/cmcc/v1/queue/:id/ai-evaluate` | AI evaluate a queue item |
| POST | `/cmcc/v1/queue/:id/ai-evaluate-ex` | Extended AI evaluation with OpenRouter |
| POST | `/cmcc/v1/queue/:id/ai-auto-moderate` | AI evaluate + auto-moderate |
| GET | `/cmcc/v1/users/reputation` | Get author reputation |
| GET | `/cmcc/v1/reputation-raw` | Get raw reputation data |
| POST | `/cmcc/v1/users/deactivate` | Deactivate users |
| GET | `/cmcc/v1/platforms/status` | Get connected platform health |
| POST | `/cmcc/v1/platforms/sync-settings` | Sync firewall rules across platforms |
| GET | `/cmcc/v1/unified-queue` | Get combined queue from all platforms |
| POST | `/cmcc/v1/queue/:id/note` | Add a note to a queue item |
| GET | `/cmcc/v1/queue/:id/notes` | Get notes for a queue item |
| POST | `/cmcc/v1/queue/:id/assign` | Assign item to a moderator |

### API Authentication

All endpoints require WordPress admin capabilities (`manage_options`) and
a valid WordPress REST nonce sent via the `X-WP-Nonce` header.

## Known Limitations

- **Form Save Button:** The Save Settings button uses React's synthetic event
  system. Direct API calls to `POST /wp-json/cmcc/v1/settings` always work.
  Manual browser testing is recommended for UI validation.
- **Settings Re-fetch After Import:** After importing settings via the Import
  button, the page must be reloaded to see updated values in the form.
- **Number Inputs:** When using browser automation (`type=number` fields),
  values may be appended rather than replaced. This is a React behavior
  limitation and does not affect manual browser usage.

## Development

### Build the React app

```bash
npm install
npm run build
```

### Development mode (with watch)

```bash
npm run dev
```

The compiled assets will be output to `dist/cmcc-app.js` and
`dist/cmcc-app.css`.

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Usage

1. Navigate to **CMCC → Queue** to view and moderate pending items.
2. Use the **Analytics** tab to review moderation statistics and activity
   heatmaps.
3. Configure spam firewall rules and notification preferences under
   **Settings**.
4. View detailed reports and export compliance data under **Reports**.
5. Review the **Activity Log** for a complete audit trail.

## Support

- **Website:** [https://cmcc.dev](https://cmcc.dev)
- **License:** GPL-2.0-or-later
