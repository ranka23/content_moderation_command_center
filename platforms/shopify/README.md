# CMCC Shopify App

Content Moderation Command Center (CMCC) integration for Shopify.

Moderate reviews, comments, and user-generated content directly from
your Shopify admin panel.

## Features

- **Moderation Queue** — Review and approve/reject flagged content
- **Analytics Dashboard** — Track spam ratios, moderation volume, and
  content breakdowns
- **Activity Log** — Audit trail of all moderation actions
- **Settings** — Configure auto-moderation thresholds, notifications,
  and queue limits
- **Shopify Admin Embed** — Runs as an embedded app via Shopify App
  Bridge

## Installation

### Prerequisites

- Node.js 18+
- Shopify CLI
- A Shopify development store with custom app permissions

### Setup

1.  Install dependencies:

    ```bash
    cd platforms/shopify
    npm install
    ```

2.  Configure environment variables — copy the template and fill in your
    values:

    ```bash
    cp .env.example .env
    ```

    | Variable              | Description                          |
    | --------------------- | ------------------------------------ |
    | `SHOPIFY_API_KEY`     | Your Shopify app's API key           |
    | `SHOPIFY_API_SECRET`  | Your Shopify app's API secret        |
    | `SHOPIFY_APP_URL`     | Public URL for the app               |
    | `SCOPES`              | Required API scopes (see below)      |

3.  Build the frontend:

    ```bash
    npm run build
    ```

4.  Start the app server:

    ```bash
    npm start
    ```

    The server runs on port 3000 by default (set `PORT` in `.env` to
    change it). Access the OAuth flow at:
    `http://localhost:3000/auth?shop=your-store.myshopify.com`

## Required API Scopes

The app requires the following Shopify API scopes:

- `read_products` — Access product data for content association
- `write_products` — Moderate product reviews and content
- `read_customers` — Look up customer information
- `read_content` — Read shop content
- `write_content` — Moderate shop content

Configure these in your Shopify Partners app settings under
**Configuration > Scopes**.

## Environment Variables

| Variable                 | Required | Default | Description                              |
| ------------------------ | -------- | ------- | ---------------------------------------- |
| `SHOPIFY_API_KEY`        | Yes      | —       | API key from Shopify Partners dashboard  |
| `SHOPIFY_API_SECRET`     | Yes      | —       | API secret from Shopify Partners         |
| `SHOPIFY_APP_URL`        | Yes      | —       | Public HTTPS URL serving the app         |
| `SCOPES`                 | Yes      | —       | Comma-separated OAuth scopes             |
| `CMCC_API_URL`           | No       | `/api`  | Backend CMCC API base URL                |
| `PORT`                   | No       | `3000`  | Local development server port            |

## App Setup with Shopify CLI

1.  Create a Shopify app entry in your Partners dashboard.

2.  Run Shopify CLI to scaffold the app tunnel:

    ```bash
    shopify app tunnel start
    ```

3.  Set the app URL and allowed redirection URLs to the tunnel or
    your deployed URL.

4.  Build and start the app server (it serves the built assets):

    ```bash
    npm run build
    npm start
    ```

## Architecture

```
platforms/shopify/
├── server.js             # Express backend — OAuth, static files, API proxy
├── package.json          # Dependencies and scripts
├── webpack.config.js     # Build configuration
├── README.md             # This file
├── .env.example          # Environment variable template
├── src/
│   ├── index.js          # Entry point
│   ├── App.jsx           # Main React + Polaris application
│   └── styles.css        # App-specific styles
└── dist/                 # Built output (app.js, app.css)
    ├── app.js
    └── app.css
```

The app uses Shopify Polaris for UI components and Shopify App Bridge
for admin embedding and navigation. React, Polaris, and App Bridge are
loaded as externals from Shopify's CDN rather than bundled.

### Server (`server.js`)

The Express server provides:

- **HTML shell** — serves the index page that loads Polaris, React, and
  App Bridge from CDN
- **Static assets** — serves the webpack-built `app.js` and `app.css`
- **OAuth flow** — placeholder routes for Shopify OAuth (`/auth`,
  `/auth/callback`)
- **API proxy** — passes `/api/*` requests to the CMCC backend (not yet
  wired up)

The server is designed to be extended with proper session storage
(Redis, database), OAuth token management, and webhook handling.

## Development

```bash
# Build the frontend
npm run build

# Watch mode with hot rebuild
npm run dev

# Start the backend server
npm start

# Lint
npm run lint
```

Outputs are written to `dist/app.js` and `dist/app.css`.

## License

Proprietary — CMCC
