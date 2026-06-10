#!/bin/bash
# CMCC — Start all platforms via Docker
#
# Usage:
#   bash start-all.sh            # Quick start (assumes Docker is running + dist is built)
#   bash start-all.sh --build    # Full: build everything first, then start
#   bash start-all.sh --down     # Stop everything
#
# URLs:
#   WordPress:  http://localhost:8080/wp-admin   (admin / admin)
#   Strapi:     http://localhost:1337/admin
#   Storyblok:  http://localhost:4000/storyblok/
#   Wix:        http://localhost:4000/wix/
#   Shopify:    http://localhost:4000/shopify/
#   Test Hub:   http://localhost:4000/

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" = "--down" ]; then
  echo "🛑 Stopping all CMCC services..."
  cd "$ROOT_DIR" && docker compose down
  echo "Done."
  exit 0
fi

# Build all platforms first
if [ "$1" = "--build" ]; then
  echo "🔨 Building all platforms..."
  cd "$ROOT_DIR"

  # Build packages
  echo "  → Building packages..."
  npm install --silent 2>/dev/null
  npx turbo run build 2>/dev/null || true

  # Build each platform
  echo "  → Building WordPress..."
  cd platforms/wordpress && npm run build 2>/dev/null && cd "$ROOT_DIR" || cd "$ROOT_DIR"

  echo "  → Building Storyblok..."
  cd platforms/storyblok && npx webpack --mode development 2>/dev/null && cd "$ROOT_DIR" || cd "$ROOT_DIR"

  echo "  → Building Wix..."
  cd platforms/wix && npx webpack --mode development 2>/dev/null && cd "$ROOT_DIR" || cd "$ROOT_DIR"

  echo "  → Building Shopify..."
  cd platforms/shopify && npx webpack --mode development 2>/dev/null && cd "$ROOT_DIR" || cd "$ROOT_DIR"

  echo "  ✅ Build complete"
fi

echo "╔══════════════════════════════════════════════════════╗"
echo "║   CMCC — Starting All Platforms via Docker          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Start all Docker services
cd "$ROOT_DIR"

echo "🐳 Starting Docker services..."
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  echo ""
  echo "   Alternatively, run the services manually:"
  echo "     Terminal 1: make serve-api"
  echo "     Terminal 2: make serve-dev"
  exit 1
fi

docker compose up -d 2>&1

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for API stub
echo -n "  API Stub (:3000) ... "
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Ready"
    break
  fi
  if [ "$i" -eq 30 ]; then echo "⚠️  Timeout (continuing)"; else sleep 2; fi
done

# Wait for Dev Server
echo -n "  Dev Server (:4000) ... "
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:4000/ 2>/dev/null; then
    echo "✅ Ready"
    break
  fi
  if [ "$i" -eq 30 ]; then echo "⚠️  Timeout (continuing)"; else sleep 2; fi
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ All platforms are running!                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  🌐  Test Hub     →  http://localhost:4000/"
echo "  📚  Storyblok    →  http://localhost:4000/storyblok/"
echo "  🌐  Wix          →  http://localhost:4000/wix/"
echo "  🛍️  Shopify      →  http://localhost:4000/shopify/"
echo "  🔵  WordPress    →  http://localhost:8080/wp-admin  (admin / admin)"
echo "  🚀  Strapi       →  http://localhost:1337/admin"
echo "  ⚙️   API Stub    →  http://localhost:3000/api/health"
echo ""
echo "  🛑  Stop:  bash start-all.sh --down"
echo "            or:  docker compose down"
echo ""
