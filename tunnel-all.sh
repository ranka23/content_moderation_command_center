#!/bin/bash
# CMCC — Create tunnels for all SaaS platforms
# Requires: npx localtunnel (installed on first use)
#
# Usage: bash tunnel-all.sh
#
# After tunnels are created, register each URL in its respective platform:
#   Storyblok → App URL: <storyblok-url>
#   Wix       → App URL: <wix-url>/index.html
#   Shopify   → App URL: <shopify-url>

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_PORT=3000
STORY_PORT=5002
WIX_PORT=5001
SHOP_PORT=3001
WP_PORT=8080
STRAPI_PORT=1337

echo "╔══════════════════════════════════════════════════════╗"
echo "║   CMCC — Create Tunnels for all Platforms           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check if services are running
echo "🔍 Checking local services..."
for check in "API Stub:$API_PORT/api/health" "Storyblok:$STORY_PORT" "Wix:$WIX_PORT" "Shopify:$SHOP_PORT"; do
  name=$(echo "$check" | cut -d: -f1)
  port=$(echo "$check" | cut -d: -f2)
  path=$(echo "$check" | cut -d: -f3)
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:$port/$path" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✅ $name on :$port"
  else
    echo "  ⚠️  $name on :$port — HTTP $code (tunnel may fail)"
  fi
done
echo ""

# ── Create tunnels ──────────────────────────────────────────

echo "🚇 Creating tunnels (this may take a moment)..."
echo ""

# Storyblok tunnel
echo "  [1/3] Storyblok → :$STORY_PORT"
npx localtunnel --port $STORY_PORT > /tmp/cmcc-tunnel-storyblok.log 2>&1 &
STORY_PID=$!
sleep 4
STORY_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.loca\.lt' /tmp/cmcc-tunnel-storyblok.log 2>/dev/null | head -1)
echo "        URL: ${STORY_URL:-waiting...}"

# Wix tunnel
echo "  [2/3] Wix       → :$WIX_PORT"
npx localtunnel --port $WIX_PORT > /tmp/cmcc-tunnel-wix.log 2>&1 &
WIX_PID=$!
sleep 4
WIX_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.loca\.lt' /tmp/cmcc-tunnel-wix.log 2>/dev/null | head -1)
echo "        URL: ${WIX_URL:-waiting...}"

# Shopify tunnel
echo "  [3/3] Shopify   → :$SHOP_PORT"
npx localtunnel --port $SHOP_PORT > /tmp/cmcc-tunnel-shopify.log 2>&1 &
SHOP_PID=$!
sleep 4
SHOP_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.loca\.lt' /tmp/cmcc-tunnel-shopify.log 2>/dev/null | head -1)
echo "        URL: ${SHOP_URL:-waiting...}"

echo ""

# ── Display results ─────────────────────────────────────────

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   ✅ Tunnels are ready!                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ┌──────────────┬──────────────────────────┬──────────────────────────┐"
echo "  │ Platform     │ Local URL                │ Tunnel URL               │"
echo "  ├──────────────┼──────────────────────────┼──────────────────────────┤"
printf "  │ %-12s │ http://localhost:%-8s │ %-24s │\n" "Storyblok" "$STORY_PORT" "${STORY_URL:-pending...}"
printf "  │ %-12s │ http://localhost:%-8s │ %-24s │\n" "Wix" "$WIX_PORT" "${WIX_URL:-pending...}"
printf "  │ %-12s │ http://localhost:%-8s │ %-24s │\n" "Shopify" "$SHOP_PORT" "${SHOP_URL:-pending...}"
echo "  ├──────────────┼──────────────────────────┼──────────────────────────┤"
echo "  │ WordPress    │ http://localhost:8080    │ (local only, no tunnel)  │"
echo "  │ Strapi       │ http://localhost:1337    │ (local only, no tunnel)  │"
echo "  │ API Stub     │ http://localhost:3000    │ (local only, no tunnel)  │"
echo "  └──────────────┴──────────────────────────┴──────────────────────────┘"
echo ""

# ── Instructions ────────────────────────────────────────────

echo "══════════════════════════════════════════════════════════════════"
echo "  NEXT STEPS — Register each tunnel URL in its platform"
echo "══════════════════════════════════════════════════════════════════"
echo ""
echo "  📚  Storyblok"
echo "       1. Go to your space → Settings → Apps → Add App → Custom App"
echo "       2. App URL: ${STORY_URL:-<tunnel-url>}"
echo "       3. Save → Navigate to the app in the sidebar"
echo ""
echo "  🌐  Wix"
echo "       1. Go to https://dev.wix.com → Dashboard Apps"
echo "       2. Create/edit a Dashboard App"
echo "       3. App URL: ${WIX_URL:-<tunnel-url>}/index.html"
echo "       4. Install the app on a Wix site"
echo ""
echo "  🛍️  Shopify"
echo "       1. Go to https://partners.shopify.com → Apps"
echo "       2. App URL: ${SHOP_URL:-<tunnel-url>}"
echo "       3. Allowed redirection URL: ${SHOP_URL:-<tunnel-url>}/auth/callback"
echo "       4. Install on a development store"
echo ""
echo "  🔵  WordPress"
echo "       Already accessible: http://localhost:8080/wp-admin (admin/admin)"
echo ""
echo "  🚀  Strapi"
echo "       Already accessible: http://localhost:1337/admin (if Docker running)"
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  LOGS"
echo "    /tmp/cmcc-tunnel-storyblok.log"
echo "    /tmp/cmcc-tunnel-wix.log"
echo "    /tmp/cmcc-tunnel-shopify.log"
echo ""
echo "  STOP all tunnels:"
echo "    kill $STORY_PID $WIX_PID $SHOP_PID 2>/dev/null"
echo ""
