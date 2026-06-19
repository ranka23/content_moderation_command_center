#!/bin/sh
# Strapi CMCC Fixup Script
# Fixes @cmcc package.json files and creates vite.config.js for Vite resolution
set -e

echo "[fixup] Ensuring @cmcc packages have valid package.json files..."

for pkg_dir in /app/node_modules/@cmcc/core /app/node_modules/@cmcc/ui /app/node_modules/@cmcc/server-core; do
  pkg_name="$(basename "$pkg_dir")"
  pkg_json="$pkg_dir/package.json"

  # Check if valid JSON, if not fix it
  if [ -f "$pkg_json" ] && ! node -e "JSON.parse(require('fs').readFileSync('$pkg_json','utf8'))" 2>/dev/null; then
    echo "[fixup] Fixing $pkg_name/package.json (malformed)"
    node -e "require('fs').writeFileSync('$pkg_json', JSON.stringify({name:'@cmcc/$pkg_name',version:'1.0.0',main:'index.js'}))"
  elif [ ! -f "$pkg_json" ]; then
    echo "[fixup] Creating $pkg_name/package.json"
    node -e "require('fs').writeFileSync('$pkg_json', JSON.stringify({name:'@cmcc/$pkg_name',version:'1.0.0',main:'index.js'}))"
  else
    echo "[fixup] $pkg_name/package.json OK"
  fi
done

echo "[fixup] Ensuring vite.config.js exists at /app/src/admin/vite.config.js..."
if [ ! -f /app/src/admin/vite.config.js ]; then
  mkdir -p /app/src/admin
  cat > /app/src/admin/vite.config.js << 'VITEEOF'
const path = require("path");

module.exports = (config) => {
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...config.resolve.alias,
    "@cmcc/ui": path.resolve("/app/node_modules/@cmcc/ui"),
    "@cmcc/core": path.resolve("/app/node_modules/@cmcc/core"),
    "@cmcc/server-core": path.resolve("/app/node_modules/@cmcc/server-core"),
  };
  config.optimizeDeps = config.optimizeDeps || {};
  config.optimizeDeps.include = [
    ...(config.optimizeDeps.include || []),
    "@cmcc/ui",
    "@cmcc/core",
    "@cmcc/server-core",
  ];
  return config;
};
VITEEOF
  echo "[fixup] Created vite.config.js"
else
  echo "[fixup] vite.config.js already exists"
fi

echo "[fixup] Setup complete"
