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
- **Real-time Analytics** – Queue statistics, spam ratios, content type
  breakdowns, and activity heatmaps.
- **Activity Log** – Full audit trail of all moderation actions.
- **Bulk Actions** – Approve, reject, or export multiple items at once.
- **Settings** – General, spam firewall, and notification configuration.

## Installation

1. Download the plugin and place the `cmcc` folder in `/wp-content/plugins/`.
2. Activate the plugin from the WordPress admin **Plugins** page.
3. The **CMCC** menu will appear in the admin sidebar with Queue, Analytics,
   and Settings submenu pages.

### Requirements

- WordPress 6.0+
- PHP 8.0+
- Node.js 18+ (for development/build)

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

## Usage

1. Navigate to **CMCC → Queue** to view and moderate pending items.
2. Use the **Analytics** tab to review moderation statistics and activity
   heatmaps.
3. Configure spam firewall rules and notification preferences under
   **Settings**.

## REST API

The plugin registers the following REST endpoints under `cmcc/v1`:

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| GET    | `/cmcc/v1/queue`               | List queue items           |
| POST   | `/cmcc/v1/queue/:id/action`    | Moderate a single item     |
| POST   | `/cmcc/v1/queue/bulk-action`   | Perform bulk actions       |
| GET    | `/cmcc/v1/analytics`           | Get analytics data         |
| GET    | `/cmcc/v1/activity-log`        | Get activity log entries   |
| GET    | `/cmcc/v1/settings`            | Get plugin settings        |
| POST   | `/cmcc/v1/settings`            | Update plugin settings     |

## Support

- **Website:** [https://cmcc.dev](https://cmcc.dev)
- **License:** GPL-2.0-or-later
