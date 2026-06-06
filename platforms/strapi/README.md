# CMCC - Content Moderation Command Center

A Strapi v4/v5 plugin that provides centralized content moderation with
analytics, queue management, and automated spam detection.

## Features

- **Moderation Queue** - Review and moderate pending content items with
  pagination, search, and status filters
- **Bulk Actions** - Approve, reject, or mark multiple items as spam
- **Analytics Dashboard** - Visualize moderation metrics with status
  breakdowns and activity heatmaps
- **Activity Log** - Complete audit trail of all moderation actions
- **Configurable Settings** - Auto-moderation rules, keyword blacklists,
  link limits, and duplicate detection
- **Role-Based Access** - Granular permissions for queue, analytics,
  settings, and activity log access

## Installation

```bash
# From your Strapi project root
cd src/plugins
git clone <repo-url> cmcc
# or copy the @cmcc/strapi package into your plugins directory
```

Then install dependencies and rebuild the admin panel:

```bash
# In your Strapi project root
npm run build
# or
yarn build
```

## Configuration

### Plugin Config (`config/plugins.js`)

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
})
```

### Settings

| Setting              | Type    | Default | Description                          |
| -------------------- | ------- | ------- | ------------------------------------ |
| `autoModerate`       | Boolean | `false` | Automatically moderate detected spam |
| `moderationBehavior` | Enum    | `flag`  | Action: `flag`, `spam`, `discard`    |
| `maxLinks`           | Number  | `5`     | Maximum allowed links per post       |
| `blacklistedKeywords`| Array   | `[]`    | Keywords that trigger moderation     |
| `duplicateDetection` | Boolean | `true`  | Detect duplicate content             |
| `notifyOnSpam`       | Boolean | `true`  | Send notifications for spam items    |

## Permissions

The plugin registers the following permissions:

| Permission                           | Description              |
| ------------------------------------ | ------------------------ |
| `plugin::cmcc.queue.read`            | View moderation queue    |
| `plugin::cmcc.queue.moderate`        | Moderate individual items|
| `plugin::cmcc.queue.bulk`            | Perform bulk moderation  |
| `plugin::cmcc.analytics.read`        | View analytics dashboard |
| `plugin::cmcc.settings.read`         | Read plugin settings     |
| `plugin::cmcc.settings.update`       | Update plugin settings   |
| `plugin::cmcc.activity-log.read`     | View activity log        |

## API Endpoints

### Queue

| Method | Path                         | Description          |
| ------ | ---------------------------- | -------------------- |
| GET    | `/cmcc/queue`                | List queue items     |
| POST   | `/cmcc/queue/:id/moderate`   | Moderate an item     |
| POST   | `/cmcc/queue/bulk`           | Bulk moderate items  |

### Analytics

| Method | Path                 | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/cmcc/analytics`    | Get analytics data   |

### Activity Log

| Method | Path                    | Description          |
| ------ | ----------------------- | -------------------- |
| GET    | `/cmcc/activity-log`    | Get activity log     |

### Settings

| Method | Path               | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/cmcc/settings`   | Get plugin settings  |
| PUT    | `/cmcc/settings`   | Update settings      |

## Content Types

The plugin registers three content types:

- **Queue Item** (`cmcc_queue_items`) - Stores moderation queue entries
  with status, spam score, and content metadata
- **Activity Log** (`cmcc_activity_logs`) - Records all moderation
  actions for audit trails
- **Settings** (`cmcc_settings`) - Single-entry plugin configuration

## Development

```bash
# Build the admin panel
cd platforms/strapi
npm install
npm run build
```

## Dependencies

- `@cmcc/core` - Analytics, queue management, and moderation engine
- `@cmcc/ui` - React UI components (QueueTable, HeatmapChart, etc.)
- `@strapi/design-system` - Strapi design system components
- `@strapi/helper-plugin` - Strapi admin panel helpers

## License

MIT
