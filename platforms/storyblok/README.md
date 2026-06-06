# CMCC Content Moderation App for Storyblok

A content moderation dashboard for Storyblok spaces. The CMCC
(Content Moderation Command Center) app helps you manage,
review, and moderate user-generated content across your
Storyblok-powered projects.

## Features

- **Moderation Queue** – Review, approve, reject, or mark items
  as spam directly from your Storyblok dashboard
- **Analytics** – Visualize moderation activity with heatmaps,
  spam ratio tracking, content type breakdowns, and anomaly
  detection
- **Activity Log** – Complete audit trail of all moderation
  actions
- **Settings** – Configurable API connection, moderation rules,
  and notification preferences

## Installation

### Prerequisites

- A Storyblok space with **Custom Apps** enabled
- A running CMCC backend API instance

### Adding the App to Storyblok

1. In your Storyblok space, navigate to **Settings > Apps**
2. Click **Add App** and select **Custom App**
3. Configure the app:
   - **Name**: CMCC Moderation
   - **App URL**: The URL where the `dist/index.js` and
     `dist/styles.css` are hosted
4. Save the app configuration

### Self-hosting the App

1. Clone the repository and navigate to the Storyblok platform
   directory:

   ```bash
   cd platforms/storyblok
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the app:

   ```bash
   npm run build
   ```

4. Deploy the `dist/` folder to your hosting provider (CDN,
   static hosting, etc.)

5. Use the deployed URL as the **App URL** in Storyblok

## Configuration

### Environment Variables / Settings

The app requires a connection to a CMCC backend API. Configure
these in the **Settings** tab inside the app:

| Setting               | Description                                      |
|-----------------------|--------------------------------------------------|
| API Endpoint URL      | The base URL of your CMCC backend API            |
| API Key               | Authentication key for the CMCC API              |
| Spam Score Threshold  | Items above this score are auto-flagged (0–1)    |
| Auto-approve          | Automatically approve items below the threshold  |
| Alert on volume spikes| Notify when queue volume exceeds normal levels   |
| Alert on high spam    | Notify when spam ratio exceeds thresholds        |
| Queue Poll Interval   | How often to check for new items (5–300 seconds) |

### Backend API Endpoints

The app expects the following endpoints on the CMCC backend:

| Method   | Endpoint              | Description                |
|----------|-----------------------|----------------------------|
| GET      | `/api/queue`          | List queue items           |
| PATCH    | `/api/queue/:id`      | Act on a single item       |
| POST     | `/api/queue/bulk`     | Bulk action on items       |
| GET      | `/api/events`         | Moderation events data     |
| GET      | `/api/activity`       | Activity log entries       |

## Development

### Running Locally

```bash
npm run dev
```

This starts webpack in watch mode. The built files are written
to `dist/`. You can serve them locally for development:

```bash
npx serve dist
```

### Project Structure

```
platforms/storyblok/
  src/
    index.js        – App entry point / SDK initialization
    App.jsx         – Main React application component
    styles.css      – Self-contained application styles
  webpack.config.js – Build configuration
  package.json
  README.md
```

## Tech Stack

- **React 18** – UI rendering
- **@storyblok/app-sdk** – Storyblok app authentication and
  space context
- **@cmcc/core** – Analytics processing, queue management,
  reputation system
- **@cmcc/ui** – Shared UI components (QueueTable, HeatmapChart,
  SettingsForm, etc.)
- **Webpack 5** – Build tooling with Babel for JSX

## License

MIT – see the root `LICENSE` file for details.
