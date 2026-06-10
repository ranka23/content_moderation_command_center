# CMCC — Makefile for local development & manual testing
#
# ============================================================================
# Quick reference
# ============================================================================
#
#  make build              Build all packages and platforms
#  make test               Run all automated tests
#  make lint               Lint all source files
#
#  make serve-api          Start the CMCC backend API stub (port 3000)
#  make serve-platforms    Start standalone dev server for all platforms (port 4000)
#  make serve-storyblok    Build + serve Storyblok app (port 5002)
#  make serve-wix          Build + serve Wix app (port 5001)
#  make serve-shopify      Build + start Shopify Express server (port 3001)
#
#  make tunnel             Expose localhost via ngrok (requires ngrok CLI)
#  make docker-wordpress   Boot WordPress test environment (port 8080)
#  make docker-strapi      Boot Strapi test environment (port 1337)
#  make docker-down        Stop all Docker services
#
#  make clean              Remove all dist/ and .turbo directories
# ============================================================================

PATH := $(shell pwd)/node_modules/.bin:$(PATH)
SHELL := bash

# ── Build & Test ──────────────────────────────────────────────────────────

.PHONY: build test lint build-all

build:
	@echo "=== Building packages (cmcc-core, cmcc-ui) ==="
	turbo run build

build-all: build
	@echo "=== Building all platforms ==="
	@cd platforms/wordpress && npm run build 2>/dev/null || echo "WordPress: skip"
	@cd platforms/storyblok && npx webpack --mode development 2>/dev/null || echo "Storyblok: skip"
	@cd platforms/wix && npx webpack --mode development 2>/dev/null || echo "Wix: skip"
	@cd platforms/shopify && npx webpack --mode development 2>/dev/null || echo "Shopify: skip"
	@echo "Done."

test:
	@echo "=== Running all tests ==="
	turbo run test

lint:
	@echo "=== Linting ==="
	turbo run lint

# ── Docker (All Platforms) ────────────────────────────────────────────────

.PHONY: docker-up docker-down docker-build

docker-up: build-all
	@echo "=== Starting all CMCC platforms via Docker ==="
	docker compose up -d
	@echo ""
	@echo "  WordPress: http://localhost:8080/wp-admin  (admin/admin)"
	@echo "  Strapi:    http://localhost:1337/admin"
	@echo "  Storyblok: http://localhost:4000/storyblok/"
	@echo "  Wix:       http://localhost:4000/wix/"
	@echo "  Shopify:   http://localhost:4000/shopify/"
	@echo "  Test Hub:  http://localhost:4000/"
	@echo ""

docker-down:
	@echo "=== Stopping all CMCC Docker services ==="
	docker compose down

docker-build:
	@echo "=== Rebuilding Docker images ==="
	docker compose build

# ── Local (without Docker) ────────────────────────────────────────────────

.PHONY: serve-api serve-dev

serve-api:
	@echo "=== Starting CMCC Test API Stub on http://localhost:3000 ==="
	@if [ ! -d tools/test-api-stub/node_modules ]; then \
		cd tools/test-api-stub && npm install; \
	fi
	cd tools/test-api-stub && node server.js

serve-dev:
	@echo "=== Starting CMCC Dev Server on http://localhost:4000 ==="
	@echo "Make sure the API stub is running: make serve-api"
	node tools/dev-server.js

# ── Storyblok ─────────────────────────────────────────────────────────────

.PHONY: serve-storyblok

serve-storyblok: build
	@echo "=== Serving Storyblok app on http://localhost:5002 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=5002"
	# Copy index.html alongside the built assets (webpack only copies JS/CSS)
	@cp platforms/storyblok/src/index.html platforms/storyblok/dist/index.html 2>/dev/null || true
	npx serve platforms/storyblok/dist --listen 5002

# ── Wix ───────────────────────────────────────────────────────────────────

.PHONY: serve-wix

serve-wix: build
	@echo "=== Serving Wix app on http://localhost:5001 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=5001"
	# Copy index.html alongside the built assets (webpack only copies JS/CSS)
	@cp platforms/wix/src/index.html platforms/wix/dist/index.html 2>/dev/null || true
	npx serve platforms/wix/dist -l 5001

# ── Shopify ────────────────────────────────────────────────────────────────

.PHONY: serve-shopify

serve-shopify: build
	@echo "=== Starting Shopify Express server on http://localhost:3001 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=3001"
	@cd platforms/shopify && node server.js

# ── Tunnel (ngrok) ─────────────────────────────────────────────────────────

.PHONY: tunnel

tunnel:
	@if ! command -v ngrok &> /dev/null; then \
		echo "Error: ngrok is not installed."; \
		echo "Install it from https://ngrok.com/download"; \
		exit 1; \
	fi
	ngrok http $(PORT)

# ── Docker Environments ───────────────────────────────────────────────────

.PHONY: docker-wordpress docker-strapi docker-down

docker-wordpress:
	@echo "=== Starting WordPress test environment ==="
	@echo "WordPress: http://localhost:8080"
	@echo "MySQL:     localhost:3307 (user=wordpress, password=wordpress, db=wordpress)"
	docker compose up wordpress db

docker-strapi:
	@echo "=== Starting Strapi test environment (first run may take 5+ minutes) ==="
	@echo "Strapi: http://localhost:1337/admin"
	docker compose up strapi

docker-down:
	@echo "=== Stopping all Docker services ==="
	docker compose down

# ── Cleanup ───────────────────────────────────────────────────────────────

.PHONY: tunnel tunnel-all clean

tunnel:
	@if [ -z "$(PORT)" ]; then \
		echo "Usage: make tunnel PORT=5002"; \
		echo "  PORT 5002 = Storyblok"; \
		echo "  PORT 5001 = Wix"; \
		echo "  PORT 3001 = Shopify"; \
		exit 1; \
	fi
	@echo "=== Creating tunnel for localhost:$(PORT) ==="
	npx localtunnel --port $(PORT)

tunnel-all:
	@echo "=== Creating tunnels for all SaaS platforms ==="
	bash tunnel-all.sh

.PHONY: clean

clean:
	@echo "=== Cleaning dist/ and .turbo directories ==="
	rm -rf packages/cmcc-core/dist
	rm -rf packages/cmcc-ui/dist
	rm -rf platforms/shopify/dist
	rm -rf platforms/storyblok/dist
	rm -rf platforms/wix/dist
	rm -rf platforms/wordpress/dist
	rm -rf .turbo
	rm -rf packages/*/.turbo
	rm -rf platforms/*/.turbo
	@echo "Done."
