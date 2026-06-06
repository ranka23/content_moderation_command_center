# CMCC Wix App

Content Moderation Command Center (CMCC) dashboard app for Wix.

Built with React and the CMCC shared libraries, this app provides a
full moderation dashboard directly within the Wix site dashboard.

## Features

- **Moderation Queue** — Review, approve, reject, flag, and defer
  content submitted to your Wix site.
- **Analytics Dashboard** — Visualize moderation activity with heatmaps,
  spam ratio tracking, and content type breakdowns.
- **Activity Log** — Full audit trail of every moderation action taken.
- **Settings** — Configure spam filter rules, notification preferences,
  and backend API connection.

## Installation

### 1. Prerequisites

- A Wix site with the [Wix Developers](https://dev.wix.com) dashboard
  enabled.
- Node.js 18+ and npm/yarn.
- A running CMCC backend service (Node.js/Express or compatible).

### 2. Build

```bash
cd platforms/wix
npm install
npm run build
```

This produces two files in `dist/`:

- `app.js` — The bundled React application (React/ReactDOM are loaded
  from the Wix CDN).
- `app.css` — Self-contained application styles.

### 3. Upload as Wix App

1. Go to the [Wix Developers Console](https://dev.wix.com).
2. Create a new **Dashboard App** (or edit an existing one).
3. Under **App Settings → App URL**, provide the URL where your
   built `index.html` with the app bundle is hosted.
4. Add the following HTML page that loads the assets:

```html
<!-- index.html -->
<div id="cmcc-wix-app-root"></div>
<link rel="stylesheet" href="/path/to/app.css">
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="/path/to/app.js"></script>
```

> **Note:** React and ReactDOM are excluded from the webpack bundle
> and must be loaded from Wix's CDN (or your own host).

5. Configure the app permissions to access site data via the Wix SDK.

## Configuration

### Backend API

The app requires a running CMCC backend. By default it connects to
`http://localhost:3000/api`. Configure the URL:

- **At build time:** Set the `CMCC_API_URL` environment variable.
- **At runtime:** Enter the URL in the app's Settings tab.
- **Via Wix secrets:** Store the URL in Wix's secrets manager and
  inject it into the iframe.

### API Endpoints

The app expects the following backend endpoints:

| Endpoint               | Method | Description                          |
| ---------------------- | ------ | ------------------------------------ |
| `/api/queue`           | GET    | List all queue items                 |
| `/api/queue/:id`       | PATCH  | Perform action on a single item      |
| `/api/queue/bulk`      | POST   | Perform bulk action on multiple items |
| `/api/analytics`       | GET    | Fetch analytics data                 |
| `/api/activity`        | GET    | Fetch activity log entries           |
| `/api/settings`        | PUT    | Save settings                        |

### Environment Variables

| Variable         | Default                    | Description                     |
| ---------------- | -------------------------- | ------------------------------- |
| `CMCC_API_URL`  | `http://localhost:3000/api` | URL of the CMCC backend service |

## Development

```bash
npm run dev
```

Starts webpack in watch mode. The bundle is rebuilt on every change.

### Project Structure

```
platforms/wix/
├── src/
│   ├── index.js        # Entry point – mounts the React app in the Wix iframe
│   ├── App.jsx         # Main application component with all tabs
│   └── styles.css      # Self-contained scoped styles
├── dist/               # Built output (app.js + app.css)
├── webpack.config.js   # Webpack configuration
├── package.json
└── README.md
```

## Wix SDK Integration

This app currently uses the **iframe hash-param approach** to receive Wix context
(`instance`, `token`, `siteOwnerId`) from the Wix dashboard. This is a stable,
well-supported pattern for Wix dashboard apps and avoids an unnecessary runtime
dependency.

### When to use @wix/sdk

If you need features beyond what hash params provide — such as:

- **Wix Data API** — query and mutate Wix site collections directly
- **Wix Events API** — subscribe to Wix site lifecycle events
- **Wix OAuth integration** — more granular permission scopes
- **Wix Secrets API** — read app secrets without exposing them in the bundle

Install the SDK as a runtime dependency:

```bash
npm install @wix/sdk
```

Then update `src/index.js` to initialize the SDK and pass it to the app:

```javascript
import { createClient, OAuthStrategy } from '@wix/sdk'

const wixClient = createClient({
  auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID }),
})

// Add wixClient to the App props
root.render(
  <App wixContext={wixContext} wixClient={wixClient} backendUrl={backendUrl} />
)
```

Refer to the [Wix SDK documentation](https://dev.wix.com/docs/sdk) for
full API details. The existing `wixContext` passthrough should remain in
place as a fallback for environments where the SDK is not yet initialized.

## Troubleshooting

**App does not render**
: Ensure the container `<div id="cmcc-wix-app-root">` exists in
  your Wix app HTML and that React/ReactDOM are loaded as globals.

**API connection fails**
: Verify the backend URL in settings. Check CORS configuration
  on your backend – it must allow requests from the Wix dashboard
  origin.

**No items appear**
: Ensure content (comments, posts, etc.) has been submitted to
  your Wix site and that the CMCC backend is actively monitoring it.
