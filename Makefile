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
#  make serve-storyblok    Build + serve Storyblok app (port 5000)
#  make serve-wix          Build + serve Wix app (port 5000)
#  make serve-shopify      Build + start Shopify Express server (port 3000)
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

.PHONY: build test lint

build:
	@echo "=== Building all packages and platforms ==="
	turbo run build

test:
	@echo "=== Running all tests ==="
	turbo run test

lint:
	@echo "=== Linting ==="
	turbo run lint

# ── API Stub ──────────────────────────────────────────────────────────────

.PHONY: serve-api

serve-api:
	@echo "=== Starting CMCC Test API Stub on http://localhost:3000 ==="
	@if [ ! -d tools/test-api-stub/node_modules ]; then \
		cd tools/test-api-stub && npm install; \
	fi
	cd tools/test-api-stub && node server.js

# ── Storyblok ─────────────────────────────────────────────────────────────

.PHONY: serve-storyblok

serve-storyblok: build
	@echo "=== Serving Storyblok app on http://localhost:5000 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=5000"
	npx serve platforms/storyblok/dist -l 5000

# ── Wix ───────────────────────────────────────────────────────────────────

.PHONY: serve-wix

serve-wix: build
	@echo "=== Serving Wix app on http://localhost:5000 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=5000"
	# Copy index.html alongside the built assets (webpack only copies JS/CSS)
	@cp platforms/wix/src/index.html platforms/wix/dist/index.html 2>/dev/null || true
	npx serve platforms/wix/dist -l 5000

# ── Shopify ────────────────────────────────────────────────────────────────

.PHONY: serve-shopify

serve-shopify: build
	@echo "=== Starting Shopify Express server on http://localhost:3000 ==="
	@echo "Create an HTTPS tunnel with:  make tunnel PORT=3000"
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
