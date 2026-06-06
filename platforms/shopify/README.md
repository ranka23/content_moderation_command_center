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

2.  Configure environment variables in your Shopify app dashboard:

    | Variable              | Description                          |
    | --------------------- | ------------------------------------ |
    | `SHOPIFY_API_KEY`     | Your Shopify app's API key           |
    | `SHOPIFY_API_SECRET`  | Your Shopify app's API secret        |
    | `APP_URL`             | Public URL for the app               |
    | `SCOPES`              | Required API scopes (see below)      |

3.  Start the development server:

    ```bash
    npm run dev
    ```

4.  Build for production:

    ```bash
    npm run build
    ```

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

4.  Serve the built assets from your app server or a CDN.

## Architecture

```
platforms/shopify/
├── package.json          # Dependencies and scripts
├── webpack.config.js     # Build configuration
├── README.md             # This file
└── src/
    ├── index.js          # Entry point
    ├── App.jsx           # Main React + Polaris application
    └── styles.css        # App-specific styles
```

The app uses Shopify Polaris for UI components and Shopify App Bridge
for admin embedding and navigation. React and Polaris are loaded as
externals from the Shopify CDN rather than bundled.

## Development

```bash
# Watch mode with hot rebuild
npm run dev

# Lint
npm run lint

# Production build
npm run build
```

Outputs are written to `dist/app.js` and `dist/app.css`.

## License

Proprietary — CMCC
