# Strapi Plugin Sync

There are two near-identical copies of the CMCC Strapi plugin:
- `platforms/strapi/admin/src/pages/App/index.jsx` (development)
- `cmcc-strapi-app/src/plugins/cmcc/admin/src/pages/App/index.jsx` (plugin package)

## Syncing

After making changes to the development copy, sync to the plugin package:

```bash
make sync-strapi-plugin
```

This copies the admin source files to the plugin package directory.

## Why two copies?

The development copy is used for local development with the Strapi admin panel.
The plugin package copy is the distributable plugin that gets published.
They must be kept in sync manually.
