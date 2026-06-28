# CMCC WordPress Plugin — Comprehensive Manual Testing Guide

**Date:** 2026-06-28
**Environment:** Docker WordPress (6.7, PHP 8.2, Apache) at `http://localhost:8080/wp-admin`
**Credentials:** admin / admin
**Plugin Version:** CMCC Content Moderation v1.0.2
**Test Focus:** Production-readiness validation

---

## Table of Contents

1. [Scope & Setup](#1-scope--setup)
2. [Plugin Installation & Activation](#2-plugin-installation--activation)
3. [Settings Page — All 10 Tabs](#3-settings-page--all-10-tabs)
4. [Firewall Rules Engine](#4-firewall-rules-engine)
5. [AI Moderation Integration](#5-ai-moderation-integration)
6. [Queue Management](#6-queue-management)
7. [WordPress Content Hooks](#7-wordpress-content-hooks)
8. [Analytics & Charts](#8-analytics--charts)
9. [Activity Log](#9-activity-log)
10. [Reports](#10-reports)
11. [Collaboration Features](#11-collaboration-features)
12. [User Reputation System](#12-user-reputation-system)
13. [Notifications & Webhooks](#13-notifications--webhooks)
14. [Data Retention & Backup](#14-data-retention--backup)
15. [Error & Edge Case Testing](#15-error--edge-case-testing)
16. [Loading, Empty, Error States](#16-loading-empty-error-states)
17. [Cross-Feature Integration Tests](#17-cross-feature-integration-tests)
18. [API Contract Validation](#18-api-contract-validation)
19. [Security Testing](#19-security-testing)
20. [Performance & Stress Testing](#20-performance--stress-testing)
21. [Test Completion Checklist](#21-test-completion-checklist)

---

## 1. Scope & Setup

### 1.1 Prerequisites
- Docker WordPress environment running at `http://localhost:8080`
- Admin login: `admin` / `admin`
- OpenRouter API key: `<your-openrouter-api-key>`
- Free AI model for testing: `openai/gpt-4o-mini`
- Browser DevTools (Console, Network, Elements)
- REST API client (curl or browser fetch from DevTools)

### 1.2 Test Content to Prepare
Create these items in WordPress before testing:

| # | Type | Content | Purpose |
|---|------|---------|---------|
| T1 | Comment | "Great article, thanks for sharing!" | Clean comment |
| T2 | Comment | "Buy now! Limited time offer! Click here http://spam.com" | Spam with link |
| T3 | Comment | "THIS IS ALL CAPS AND VERY LOUD" | All-caps spam indicator |
| T4 | Comment | "Check my site https://a.com https://b.com https://c.com" | Multiple links |
| T5 | Comment | "This casino is the best lottery site ever" | Blacklisted keyword |
| T6 | Comment | "Отличная статья, спасибо за информацию!" | Russian language |
| T7 | Comment | "Das ist ein sehr guter Artikel, danke!" | German language |
| T8 | Comment | Very long text (2000+ chars) | Edge case: long content |
| T9 | Post | Clean informational post | Content hook test |
| T10 | Post | Post with 5+ external links | Firewall + content hook |

---

## 2. Plugin Installation & Activation

### 2.1 Activation
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 1.1 | Navigate to Plugins → Installed Plugins | CMCC plugin listed | ⬜ | |
| 1.2 | Activate the plugin | Green "Plugin activated" message, no PHP errors | ⬜ | |
| 1.3 | Check admin sidebar for "CMCC" menu | Shield icon menu item at position 30 | ⬜ | |
| 1.4 | Click CMCC menu | Queue page loads with React app (no blank screen) | ⬜ | |
| 1.5 | Check DB: `wp_cmcc_queue`, `wp_cmcc_activity_log`, `wp_cmcc_user_meta` | 3 tables exist | ⬜ | |
| 1.6 | Check DB: `wp_options` has `cmcc_settings` | Default settings stored | ⬜ | |

### 2.2 Deactivation & Reactivation
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 2.1 | Deactivate plugin | Menu disappears, no errors | ⬜ | |
| 2.2 | Reactivate plugin | All settings preserved | ⬜ | |
| 2.3 | Check settings persist after reactivation | Previously saved values intact | ⬜ | |

### 2.3 Uninstall (Destructive)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 3.1 | Deactivate → Delete plugin | Plugin removed | ⬜ | |
| 3.2 | Check DB tables dropped | Queue, activity log, user_meta tables gone | ⬜ | |
| 3.3 | Check `cmcc_settings` option deleted | Option removed | ⬜ | |
| 3.4 | Reinstall → Reactivate | Fresh tables + defaults created | ⬜ | |

---

## 3. Settings Page — All 10 Tabs

### 3.1 Page Load & Navigation
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 4.1 | Navigate → CMCC → Settings | Settings page loads with tabs | ⬜ | |
| 4.2 | Browser console | No JS errors or warnings | ⬜ | |
| 4.3 | Click each of the 10 tabs | Content switches per tab | ⬜ | |
| 4.4 | Verify tab labels: General, Spam Firewall, Notifications, Appearance & Display, Integrations, Advanced Auto Moderation, Moderator Management, Data Retention, API & Webhooks, Backup & Restore | All 10 present | ⬜ | |
| 4.5 | Verify Export/Import buttons | Both render at bottom | ⬜ | |
| 4.6 | Verify AI Moderation section below tabs | "AI Moderation" heading renders | ⬜ | |

### 3.2 General Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 5.1 | Toggle: Auto Moderate — click ON | Toggle enables | ⬜ | |
| 5.2 | Select: Moderation Behavior — pick "Flag for review" | Select updates | ⬜ | |
| 5.3 | Number: Queue Page Size — enter "50" | Value set | ⬜ | |
| 5.4 | Select: Language — pick "French" | Value set | ⬜ | |
| 5.5 | Click "Save Settings" | Toast: "Settings saved successfully" | ⬜ | |
| 5.6 | Reload page → verify all changes persisted | All values restored | ⬜ | |
| 5.7 | Set Queue Page Size to 9999 → Save → Reload | Extreme value persists | ⬜ | |
| 5.8 | Set Queue Page Size to 1 → Save → Reload | Minimum value persists | ⬜ | |

### 3.3 Spam Firewall Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 6.1 | Set Max Links to 3 → Save → Reload | Value persists | ⬜ | |
| 6.2 | Add to Blacklisted Keywords: "casino" + "viagra" (one per line) → Save | Keywords saved | ⬜ | |
| 6.3 | Add to Blacklisted Email Domains: "spam.com" + "mailinator.com" → Save | Domains saved | ⬜ | |
| 6.4 | Set Min Submit Time to 10 → Save | Value persists | ⬜ | |
| 6.5 | Toggle Enable Duplicate Detection OFF → Save → Reload | OFF persists | ⬜ | |
| 6.6 | Set Default Action to "Mark as spam" → Save | Action saved | ⬜ | |

### 3.4 Notifications Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 7.1 | Toggle Email Alerts ON → Save → Reload | ON persists | ⬜ | |
| 7.2 | Set Alert Threshold to 10 → Save | Threshold saved | ⬜ | |
| 7.3 | Toggle Notify Moderators ON → Save → Reload | ON persists | ⬜ | |

### 3.5 Appearance & Display Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 8.1 | Select Theme: Dark → Save → Reload → Queue page | Queue page in dark mode | ⬜ | |
| 8.2 | Select Queue View: Table → Save → Queue page | Items shown as table | ⬜ | |
| 8.3 | Select Queue View: Card → Save → Queue page | Items shown as cards | ⬜ | |
| 8.4 | Set Items Per Page to 10 → Save → Queue page | 10 items per page | ⬜ | |
| 8.5 | Select Date Format: Absolute → Save → Queue page | Dates show absolute format | ⬜ | |
| 8.6 | Select Timezone → Save → Reload | Timezone persists | ⬜ | |

### 3.6 Integrations Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 9.1 | Toggle: Auto Import Comments ON | ON persists | ⬜ | |
| 9.2 | Toggle: Auto Import Posts ON | ON persists | ⬜ | |
| 9.3 | Verify WooCommerce/bbPress/BuddyPress/Gravity Forms toggles render | All 4 render | ⬜ | |
| 9.4 | Set Webhook URL to `https://hooks.example.com/cmcc` → Save | URL saved | ⬜ | |

### 3.7 Advanced Auto Moderation Tab (29 fields)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 10.1 | Verify AI Detection Engine select renders | Select with engine options | ⬜ | |
| 10.2 | Verify AI API Endpoint text input | Input with placeholder | ⬜ | |
| 10.3 | Verify AI API Key text input | Input with placeholder | ⬜ | |
| 10.4 | Set spam_score_flag_threshold to 30, spam to 60, discard to 90 → Save → Reload | All 3 thresholds persist | ⬜ | |
| 10.5 | Set content_hash_sensitivity to 5 → Save | Persists | ⬜ | |
| 10.6 | Set max_links_allowed to 10 → Save | Persists | ⬜ | |
| 10.7 | Toggle block_all_links ON → Save | ON persists | ⬜ | |
| 10.8 | Add to allowlist_domains: "example.com" → Save | Persists | ⬜ | |
| 10.9 | Toggle block_shortened_urls ON/OFF → Save | Toggle persists | ⬜ | |
| 10.10 | Toggle check_link_reputation ON → Save | ON persists | ⬜ | |
| 10.11 | Add to whitelisted_keywords: "safe-word" → Save | Persists | ⬜ | |
| 10.12 | Add regex_patterns: "/test/i" → Save | Persists | ⬜ | |
| 10.13 | Toggle all_caps_detection ON → Save | ON persists | ⬜ | |
| 10.14 | Toggle repeated_char_detection ON → Save | ON persists | ⬜ | |
| 10.15 | Set language_filter to "en" → Save | Persists | ⬜ | |
| 10.16 | Set min_account_age_hours to 48 → Save | Persists | ⬜ | |
| 10.17 | Toggle block_disposable_emails ON → Save | ON persists | ⬜ | |
| 10.18 | Set max_posts_per_hour to 5 → Save | Persists | ⬜ | |
| 10.19 | Add banned_ip_ranges: "10.0.0.0/8" → Save | Persists | ⬜ | |
| 10.20 | Set cooldown_between_posts to 60 → Save | Persists | ⬜ | |
| 10.21 | Set duplicate_detection_window_days to 14 → Save | Persists | ⬜ | |
| 10.22 | Set duplicate_similarity_threshold to 90 → Save | Persists | ⬜ | |
| 10.23 | Toggle weekend_off_hours_sensitivity ON → Save | ON persists | ⬜ | |
| 10.24 | Set default_action to "discard" → Save | Persists | ⬜ | |
| 10.25 | Set auto_approve_threshold to 20 → Save | Persists | ⬜ | |
| 10.26 | Toggle notify_on_auto_discard ON → Save | ON persists | ⬜ | |
| 10.27 | Set auto_ban_after_n_violations to 3 → Save | Persists | ⬜ | |
| 10.28 | Set ban_duration to "permanent" → Save | Persists | ⬜ | |
| 10.29 | Toggle learning_mode ON → Save | ON persists | ⬜ | |

### 3.8 Moderator Management Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 11.1 | Toggle Secondary Approval Required ON → Save → Reload | ON persists | ⬜ | |
| 11.2 | Toggle Action Confirmation Required ON → Save → Reload | ON persists | ⬜ | |

### 3.9 Data Retention Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 12.1 | Set Activity Log Retention Days to 60 → Save | Persists | ⬜ | |
| 12.2 | Set Archived Item Retention Days to 90 → Save | Persists | ⬜ | |
| 12.3 | Select Auto Purge Schedule: "weekly" → Save | Persists | ⬜ | |
| 12.4 | Toggle Export Before Purge ON → Save → Reload | ON persists | ⬜ | |

### 3.10 API & Webhooks Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 13.1 | Set Webhook New Items to `https://hook.example.com/new` → Save | Persists | ⬜ | |
| 13.2 | Set Webhook Approvals to `https://hook.example.com/approve` → Save | Persists | ⬜ | |
| 13.3 | Set Webhook Spam to `https://hook.example.com/spam` → Save | Persists | ⬜ | |
| 13.4 | Set API Rate Limiting to 100 → Save | Persists | ⬜ | |
| 13.5 | Set Custom API Secret to "test-secret-123" → Save | Persists | ⬜ | |

### 3.11 Backup & Restore Tab
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 14.1 | Select Scheduled Backups: "daily" → Save → Reload | "daily" persists | ⬜ | |
| 14.2 | Select "none" → Save → Reload | "none" persists | ⬜ | |

### 3.12 AI Moderation Section
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 15.1 | Set Engine to "Disabled" → Message: "AI moderation is disabled" | Info text displays | ⬜ | |
| 15.2 | Set Engine to "OpenAI" → API Key field, Model selector, Auto-moderation toggle, Spam Threshold slider, Language Detection, Sentiment Analysis all appear | All conditional fields render | ⬜ | |
| 15.3 | Enter OpenRouter API key → Select model `openai/gpt-4o-mini` → Enable auto-moderation → Set threshold to 70 → Save → Reload | All AI settings persist | ⬜ | |
| 15.4 | Set Spam Threshold to 0 → Save → Reload | 0 persists | ⬜ | |
| 15.5 | Set Spam Threshold to 100 → Save → Reload | 100 persists | ⬜ | |
| 15.6 | Engine = OpenAI, API key empty → Save → Queue AI evaluation | Falls back to local analysis | ⬜ | |

### 3.13 Form Validation
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 16.1 | Enter negative number in Queue Page Size → Save | Validation error | ⬜ | |
| 16.2 | Enter text in number field → Save | Validation error | ⬜ | |
| 16.3 | Enter 99999 in number field → Save | Saves (API accepts) | ⬜ | |
| 16.4 | Clear all fields → Save | Defaults applied | ⬜ | |
| 16.5 | Enter invalid URL in webhook field → Save | URL validation error | ⬜ | |
| 16.6 | Enter short API key (3 chars) → Save | Warning: "API key seems too short" | ⬜ | |

### 3.14 Export / Import
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 17.1 | Click "Export Settings" | JSON file downloads | ⬜ | |
| 17.2 | Open JSON → Verify all sections + ai_moderation present | Complete export | ⬜ | |
| 17.3 | Change queue_page_size to 50 → Save → Import exported JSON | "Settings imported. Reloading..." toast | ⬜ | |
| 17.4 | Wait for reload → Check queue_page_size | Restored to original value | ⬜ | NOTE: Page reload needed per initializedRef pattern |
| 17.5 | Import malformed JSON file | Error toast: "Failed to import settings: invalid file" | ⬜ | |
| 17.6 | Import empty file | Error handled | ⬜ | |
| 17.7 | Import JSON without `data` key (raw settings) | Succeeds (both `data` and raw accepted) | ⬜ | |

---

## 4. Firewall Rules Engine

### 4.1 Link Counting
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 18.1 | Set Max Links to 2 in Settings → Save | Saved | ⬜ | |
| 18.2 | Submit comment with 3 links | Queue item: firewall reason "Content contains 3 links (max allowed: 2)" | ⬜ | |
| 18.3 | Submit comment with 1 link | No firewall trigger | ⬜ | |
| 18.4 | Submit comment with 0 links | No trigger | ⬜ | |
| 18.5 | Submit comment with 10 links | Trigger: "Content contains 10 links" | ⬜ | |

### 4.2 Blacklisted Keywords (Plain Text)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 19.1 | Add keyword "casino" → Save | Saved | ⬜ | |
| 19.2 | Submit: "This casino is the best" | Triggered as SPAM | ⬜ | |
| 19.3 | Submit: "This is a CasinO" (case insensitive) | Triggered | ⬜ | |
| 19.4 | Submit: "This is not related" | Not triggered | ⬜ | |

### 4.3 Blacklisted Keywords (Wildcard)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 20.1 | Add `*free*` → Submit "Get free money now" | Triggered (contains "free") | ⬜ | |
| 20.2 | Submit "freedom of speech" | Triggered (contains "free" in "freedom") — false positive | ⬜ | Document as known issue |
| 20.3 | Add `buy*` → Submit "buy now" | Triggered (starts with "buy") | ⬜ | |
| 20.4 | Add `*shop` → Submit "online shop" | Triggered (ends with "shop") | ⬜ | |

### 4.4 Blacklisted Keywords (Regex)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 21.1 | Add `/\bspam\b/i` → Submit "This is spam" | Triggered (regex match) | ⬜ | |
| 21.2 | Submit "spamming is bad" | NOT triggered (word boundary excludes "spamming") | ⬜ | |
| 21.3 | Add invalid regex `/[invalid` | Skipped silently, no error | ⬜ | |
| 21.4 | Add `/\bbuy\s+now\b/i` → Submit "buy now!!!" | Triggered (regex match) | ⬜ | |

### 4.5 Email Domain Blacklist
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 22.1 | Add "spam-mail.com" → Submit comment with email user@spam-mail.com | Triggered | ⬜ | |
| 22.2 | Submit comment with email user@gmail.com | Not triggered | ⬜ | |

### 4.6 All-Caps Detection
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 23.1 | Submit: "THIS IS ALL CAPS CONTENT HERE" | Triggered (>70% uppercase) | ⬜ | |
| 23.2 | Submit: "This Has Mixed Case" | Not triggered | ⬜ | |
| 23.3 | Submit: "A B C" (short all-caps) | Check if ratio > 70% | ⬜ | |

### 4.7 URL Shortener Detection
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 24.1 | Submit with bit.ly: `https://bit.ly/xyz` | Triggered | ⬜ | |
| 24.2 | Submit with tinyurl.com | Triggered | ⬜ | |
| 24.3 | Submit with t.co | Triggered | ⬜ | |
| 24.4 | Submit with goo.gl, ow.ly, is.gd, buff.ly | All triggered | ⬜ | |
| 24.5 | Submit with example.com | NOT triggered (not a shortener) | ⬜ | |

### 4.8 Combined Rules
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 25.1 | Submit content triggering BOTH keyword + link rules | First matched rule reported (early return) | ⬜ | Document: only first rule fires |

---

## 5. AI Moderation Integration

### 5.1 OpenRouter API Connectivity
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 26.1 | AI Engine = OpenAI → Enter API key → Model = `openai/gpt-4o-mini` → Save | Saved | ⬜ | |
| 26.2 | Submit test comment → Inspect Network tab | POST to `https://openrouter.ai/api/v1/chat/completions` fires | ⬜ | |
| 26.3 | Verify request payload | `model`, `messages[]` (system+user), `temperature: 0.1`, `max_tokens: 300` | ⬜ | |
| 26.4 | Verify response parsed | `spamScore`, `language`, `sentiment`, `categories`, `label`, `explanation` returned | ⬜ | |
| 26.5 | Queue item updated after AI eval | spam_score and status reflect AI result | ⬜ | |

### 5.2 Content Classification Tests
| # | Content | Expected AI Result | Pass/Fail |
|---|---------|-------------------|-----------|
| 27.1 | "Great article, thanks for sharing!" | safe, spamScore < 0.3 | ⬜ |
| 27.2 | "Buy now! Limited time offer! Click here http://spam.com" | spam, spamScore > 0.7 | ⬜ |
| 27.3 | "You won the lottery! Claim your prize now!" | spam/phishing, spamScore > 0.7 | ⬜ |
| 27.4 | "Viagra and casino — best prices online" | spam, spamScore > 0.8 | ⬜ |
| 27.5 | "I hate you all, you're terrible people" | toxic/harassment, spamScore > 0.5 | ⬜ |
| 27.6 | "Visit http://phishing-site.com to verify account" | phishing, spamScore > 0.7 | ⬜ |
| 27.7 | "Отличная статья, спасибо!" | safe, language = "ru" | ⬜ |
| 27.8 | "Das ist ein sehr guter Artikel" | safe, language = "de" | ⬜ |
| 27.9 | Empty content | Falls back, spamScore = 0 | ⬜ |
| 27.10 | Very long content (5000 chars) | Evaluated (truncated to 4000) | ⬜ |

### 5.3 Auto-Moderation Decision Tree
| # | AI spamScore | Expected Queue Status | Pass/Fail | Conditions |
|---|-------------|----------------------|-----------|------------|
| 28.1 | 0.95 | spam (auto-moderated) | ⬜ | >= 0.9 → spam |
| 28.2 | 0.75 | flagged | ⬜ | >= 0.7 threshold → flagged |
| 28.3 | 0.15 | approved | ⬜ | < 0.7*0.5 AND pending → approved |
| 28.4 | 0.40 | pending | ⬜ | Between thresholds, stays pending |

### 5.4 Score Blending (Firewall + AI)
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 29.1 | Content triggers firewall (score 0.85) + AI scores 0.2 | Max(0.85, 0.2) = 0.85 used | ⬜ | |
| 29.2 | AI scores high (0.9) + firewall passes | AI score dominates | ⬜ | |
| 29.3 | Both high | Highest wins | ⬜ | |

### 5.5 Local Analysis Fallback
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 30.1 | AI Engine = "none", no API key | Falls back to local keyword analysis | ⬜ | |
| 30.2 | "AI Evaluate" on queue item | Local results: keyword-based spam score | ⬜ | |
| 30.3 | Local analysis detects "buy now", "casino", "viagra" | These score 0.15 each | ⬜ | |
| 30.4 | Engine = "local" explicitly | Same behavior as fallback | ⬜ | |

### 5.6 AI API Error Handling
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 31.1 | Invalid API key | Error returned gracefully, falls to local | ⬜ | |
| 31.2 | Invalid model name | Error handled, no crash | ⬜ | |
| 31.3 | Network disconnected | API fails → local fallback | ⬜ | |
| 31.4 | API timeout (wait 15+ seconds) | Timeout → fallback or error | ⬜ | |

---

## 6. Queue Management

### 6.1 Page Load & UI Elements
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 32.1 | Navigate → CMCC | Queue page loads | ⬜ | |
| 32.2 | Console → no errors | Clean console | ⬜ | |
| 32.3 | Quick filter buttons present | All, Last Hour, Today, This Week, Pending, High Spam, Flagged | ⬜ | |
| 32.4 | Status filter dropdown | All Statuses, Pending, Approved, Spam, Flagged, Rejected, Deferred | ⬜ | |
| 32.5 | Content type filter dropdown | All types present | ⬜ | |
| 32.6 | Date range filter | Date picker renders | ⬜ | |
| 32.7 | Search input + Bulk actions dropdown | Both render | ⬜ | |
| 32.8 | Sortable column headers | Date, Spam Score, Status sortable | ⬜ | |
| 32.9 | Pagination + per-page selector + item count | All render | ⬜ | |

### 6.2 Filtering
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 33.1 | Click "Pending" quick filter | Only pending items | ⬜ | |
| 33.2 | Click "Spam" quick filter | Only spam items | ⬜ | |
| 33.3 | Click "Flagged" quick filter | Only flagged items | ⬜ | |
| 33.4 | Click "Last Hour" | Items from last hour | ⬜ | |
| 33.5 | Click "Today" | Items from today | ⬜ | |
| 33.6 | Click "This Week" | Items from this week | ⬜ | |
| 33.7 | Click "All" | All items, filters reset | ⬜ | |
| 33.8 | Status dropdown = "Pending" | Only pending items | ⬜ | |
| 33.9 | Status dropdown = "Approved" | Only approved | ⬜ | |
| 33.10 | Content type = "comment" | Only comments | ⬜ | |
| 33.11 | Search box → type "test" | Matching items | ⬜ | |
| 33.12 | Combine: Status=Spam + ContentType=Comment | Combined filter works | ⬜ | |

### 6.3 Sorting
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 34.1 | Click "Date" header | Sort asc (oldest first) | ⬜ | |
| 34.2 | Click "Date" again | Sort desc (newest first) | ⬜ | |
| 34.3 | Click "Spam Score" | Sort by score asc | ⬜ | |
| 34.4 | Verify sort arrow indicator | Arrow shows direction | ⬜ | |

### 6.4 Item Actions
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 35.1 | Approve pending item | "approved", success toast | ⬜ | |
| 35.2 | Reject pending item | "rejected" | ⬜ | |
| 35.3 | Mark as spam | "spam" | ⬜ | |
| 35.4 | Flag item | "flagged" | ⬜ | |
| 35.5 | Defer item | "deferred" | ⬜ | |
| 35.6 | Re-approve already-approved item | Still succeeds | ⬜ | |
| 35.7 | Activity logged for each action | Check Activity Log | ⬜ | |

### 6.5 Bulk Actions
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 36.1 | Select multiple items → "Approve" bulk action | All approved | ⬜ | |
| 36.2 | Select → "Reject" | All rejected | ⬜ | |
| 36.3 | Select → "Spam" | All marked spam | ⬜ | |
| 36.4 | Select → "Flag" | All flagged | ⬜ | |
| 36.5 | Select → "Defer" | All deferred | ⬜ | |
| 36.6 | Select → "Export CSV" | CSV file downloads | ⬜ | |
| 36.7 | Select 0 items → Apply | Error: "No items selected" | ⬜ | |

### 6.6 Pagination
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 37.1 | Per-page = 10 | 10 items shown | ⬜ | |
| 37.2 | Per-page = 50 | 50 items shown | ⬜ | |
| 37.3 | Per-page = 100 | 100 items shown | ⬜ | |
| 37.4 | Click "Next" | Page 2 loads | ⬜ | |
| 37.5 | Click "Previous" | Page 1 loads | ⬜ | |
| 37.6 | Click page number "3" | Page 3 loads | ⬜ | |

### 6.7 Item Detail Panel
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 38.1 | Click queue item | Slide-out panel opens | ⬜ | |
| 38.2 | Panel shows: title, author, status, spam score, content | All present | ⬜ | |
| 38.3 | "AI Evaluate" button present | Button renders | ⬜ | |
| 38.4 | History timeline present | Status changes listed | ⬜ | |
| 38.5 | Notes section present | "Add Note" form + notes list | ⬜ | |
| 38.6 | Assignment section present | Assign to moderator fields | ⬜ | |
| 38.7 | Close panel | Panel closes | ⬜ | |

### 6.8 AI Evaluation from Queue
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 39.1 | Open item → Click "AI Evaluate" | Loading → Results display | ⬜ | |
| 39.2 | Results show: spam score, language, sentiment, categories, label, explanation | All present | ⬜ | |
| 39.3 | AI Evaluate on item with no content | Falls back gracefully | ⬜ | |

---

## 7. WordPress Content Hooks

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 40.1 | Enable "Auto Import Comments" → Post comment (guest) | Comment appears in queue | ⬜ | |
| 40.2 | Post comment (logged-in) | Appears in queue | ⬜ | |
| 40.3 | Post pingback/trackback | NOT in queue (skipped) | ⬜ | |
| 40.4 | Queue item metadata correct | content_type = "comment", author matches | ⬜ | |
| 40.5 | Enable "Auto Import Posts" → Create new post | Post appears in queue | ⬜ | |
| 40.6 | Update existing post | NOT added (update skipped) | ⬜ | |
| 40.7 | Auto-save post | NOT added | ⬜ | |
| 40.8 | Post revision | NOT added | ⬜ | |
| 40.9 | WooCommerce review (if WC installed) | Appears in queue | ⬜ | |
| 40.10 | bbPress topic (if bbPress installed) | Appears in queue | ⬜ | |
| 40.11 | BuddyPress activity (if BP installed) | Appears in queue | ⬜ | |
| 40.12 | Gravity Forms entry (if GF installed) | Appears in queue | ⬜ | |

---

## 8. Analytics & Charts

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 41.1 | Navigate → CMCC → Analytics | Page loads | ⬜ | |
| 41.2 | Queue stats: pending, spam, flagged, approved, rejected, deferred, total | All counts display | ⬜ | |
| 41.3 | Activity heatmap (7 days × 24 hours) | Heatmap renders | ⬜ | |
| 41.4 | Content type breakdown chart | Chart renders | ⬜ | |
| 41.5 | Spam ratio: spam count, total, ratio, percentage | All display | ⬜ | |
| 41.6 | Top 5 spam content types | List renders | ⬜ | |
| 41.7 | Moderation volume chart (30 days) | Line chart renders | ⬜ | |
| 41.8 | Status distribution chart | Pie/bar renders | ⬜ | |
| 41.9 | Moderator performance (even if empty) | Empty state renders | ⬜ | |
| 41.10 | Anomaly alerts (even if empty) | Empty state renders | ⬜ | |
| 41.11 | Perform action → Refresh analytics | Counts update correctly | ⬜ | |

---

## 9. Activity Log

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 42.1 | Navigate → CMCC → Activity Log | Page loads | ⬜ | |
| 42.2 | Columns: timestamp, moderator, action, content type, item, prev status, new status | All present | ⬜ | |
| 42.3 | Entries for all actions performed | Approve, reject, spam, flag, defer, AI eval, note, assign all logged | ⬜ | |
| 42.4 | Moderator name displayed | Shows name or "User #X" | ⬜ | |
| 42.5 | Filter by action "approve" | Only approvals shown | ⬜ | |
| 42.6 | Pagination works | Navigate pages | ⬜ | |

---

## 10. Reports

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 43.1 | Navigate → CMCC → Reports | Reports page loads | ⬜ | |
| 43.2 | `POST /wp-json/cmcc/v1/reports/moderation-activity` | Returns CSV data | ⬜ | |
| 43.3 | `POST /wp-json/cmcc/v1/reports/compliance-audit` | Returns CSV with compliance data | ⬜ | |
| 43.4 | `POST /wp-json/cmcc/v1/reports/scheduled` with valid params | Returns success | ⬜ | |
| 43.5 | `POST /wp-json/cmcc/v1/reports/scheduled` with invalid type | 400 error | ⬜ | |
| 43.6 | `POST /wp-json/cmcc/v1/reports/scheduled` with invalid frequency | 400 error | ⬜ | |
| 43.7 | `GET /wp-json/cmcc/v1/reports/scheduled` | Returns scheduled reports list | ⬜ | Known: route not registered |

---

## 11. Collaboration Features

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 44.1 | Open item → Add note | Note added, appears in list | ⬜ | |
| 44.2 | Add internal note | Marked internal | ⬜ | |
| 44.3 | Add note with type "question" | Categorized correctly | ⬜ | |
| 44.4 | Add note with type "resolution" | Categorized correctly | ⬜ | |
| 44.5 | Refresh → Reopen item | Notes persist (transient, 30 days) | ⬜ | |
| 44.6 | Add empty note | Error | ⬜ | |
| 44.7 | Assign item to "admin" | Success toast | ⬜ | |
| 44.8 | Assign with priority "high" + due date | Assignment recorded | ⬜ | |
| 44.9 | Assign to non-existent user | Error: "Assignee user not found" | ⬜ | |
| 44.10 | Check activity log after assignment | "assign" action logged | ⬜ | |
| 44.11 | `GET /wp-json/cmcc/v1/activity-feed` | Last 50 events with actor + description | ⬜ | |

---

## 12. User Reputation System

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 45.1 | `GET /wp-json/cmcc/v1/reputation-raw` | Paginated reputation data | ⬜ | |
| 45.2 | `GET /wp-json/cmcc/v1/users/reputation` | Users with reputation scores | ⬜ | |
| 45.3 | Author with approved items only | High reputation score | ⬜ | |
| 45.4 | Author with spam items | Low/negative reputation | ⬜ | |
| 45.5 | Trust levels: New, Regular, Trusted, Verified, Suspicious, Blocked | All levels observable | ⬜ | |
| 45.6 | `GET /wp-json/cmcc/v1/reputation/user/{id}` | Single user detail | ⬜ | |

---

## 13. Notifications & Webhooks

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 46.1 | Set Email Alerts ON → Trigger action | Email sent (check mail log) | ⬜ | Docker mailpit or mailhog |
| 46.2 | Set webhook URL → New queue item added | POST to webhook URL | ⬜ | |
| 46.3 | Set webhook URL → Item approved | POST to approval webhook | ⬜ | |
| 46.4 | Set webhook URL → Item marked spam | POST to spam webhook | ⬜ | |
| 46.5 | Empty webhook URL → No webhook sent | No request fired | ⬜ | |
| 46.6 | Webhook payload structure | `{type, site_url, timestamp, ...data}` | ⬜ | |

---

## 14. Data Retention & Backup

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 47.1 | Set retention to 30 days → Wait (or manually check cron) | Old entries purged | ⬜ | Manual DB check |
| 47.2 | Set purge schedule to "weekly" | `cmcc_daily_report_cron` scheduled | ⬜ | |
| 47.3 | Export settings → Download | JSON file valid | ⬜ | |
| 47.4 | Import exported JSON → Reload | Settings restored | ⬜ | |

---

## 15. Error & Edge Case Testing

### 15.1 Input Edge Cases
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 48.1 | Submit content with HTML/JS injection: `<script>alert('xss')</script>` | Stripped/sanitized, not executed | ⬜ | |
| 48.2 | Submit content with SQL injection: `'; DROP TABLE wp_cmcc_queue; --` | Parameterized query prevents injection | ⬜ | |
| 48.3 | Submit content with special unicode: emojis, right-to-left text | Handled correctly | ⬜ | |
| 48.4 | Submit content with 10,000+ characters | Truncated or handled | ⬜ | |
| 48.5 | Submit empty comment | Handled gracefully (may be skipped) | ⬜ | |
| 48.6 | Submit comment with only whitespace | Handled | ⬜ | |
| 48.7 | Submit 100 rapid comments | Queue fills, no crash | ⬜ | |
| 48.8 | Set all settings to maximum values → Save | API accepts | ⬜ | |
| 48.9 | Set all settings to minimum/zero values → Save | API accepts (some validation may warn) | ⬜ | |

### 15.2 Concurrent Operations
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 49.1 | Bulk approve 50 items simultaneously | All processed | ⬜ | |
| 49.2 | View queue while bulk action in progress | Queue refreshes after action | ⬜ | |
| 49.3 | Add notes to same item from two tabs | Both saved (last write wins) | ⬜ | |

### 15.3 Network Error Handling
| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 50.1 | Disconnect network → Perform queue action | Error toast: "Failed" | ⬜ | |
| 50.2 | Reconnect → Action still works | Recovery after network restored | ⬜ | |
| 50.3 | Slow network (throttle to Slow 3G) → Load queue page | Loading state shows, page eventually loads | ⬜ | |

---

## 16. Loading, Empty, Error States

### 16.1 Loading States
| # | Component | Observed Behavior | Pass/Fail | Notes |
|---|-----------|------------------|-----------|-------|
| 51.1 | Settings page | Spinner: "Loading settings..." | ⬜ | |
| 51.2 | Queue table | Skeleton/loading indicator | ⬜ | |
| 51.3 | Queue detail panel history | "Loading history..." | ⬜ | |
| 51.4 | Queue detail panel notes | Loading indicator | ⬜ | |
| 51.5 | AI Evaluation button → Click | Button shows loading state | ⬜ | |
| 51.6 | Bulk action progress bar | Progress bar with count | ⬜ | |

### 16.2 Empty States
| # | Component | Observed Behavior | Pass/Fail | Notes |
|---|-----------|------------------|-----------|-------|
| 52.1 | Queue page (no items) | Empty state message | ⬜ | |
| 52.2 | Queue item history (no history) | "No history recorded yet" | ⬜ | |
| 52.3 | Activity log (no log entries) | Empty state | ⬜ | |
| 52.4 | Analytics (no data) | Empty charts or zero values | ⬜ | |
| 52.5 | Item notes (no notes) | Empty notes area | ⬜ | |

### 16.3 Error States
| # | Component | Trigger Method | Expected Behavior | Pass/Fail | Notes |
|---|-----------|---------------|-------------------|-----------|-------|
| 53.1 | Settings page | Modify API to return 500 | Error toast, spinner clears | ⬜ | |
| 53.2 | Queue table | Disconnect network | Error toast: "Failed to fetch queue items" | ⬜ | |
| 53.3 | AI Evaluation | Set invalid API key | Error with explanation | ⬜ | |
| 53.4 | Item action | Delete item from DB, then try action | Error handled gracefully | ⬜ | |
| 53.5 | Settings import | Upload empty file | Error toast | ⬜ | |
| 53.6 | Settings import | Upload non-JSON file | Error toast | ⬜ | |

---

## 17. Cross-Feature Integration Tests

| # | Test Scenario | Steps | Expected Result | Pass/Fail |
|---|--------------|-------|----------------|-----------|
| 54.1 | Full pipeline: Comment → Firewall → AI → Queue | Post spam comment → Check queue → Verify firewall triggered → AI scored → Status set | End-to-end pipeline works | ⬜ |
| 54.2 | Full pipeline: Clean comment | Post clean comment → Queue → AI scores low → Approved | Clean content auto-approved | ⬜ |
| 54.3 | Approve → Activity Log → Analytics | Approve item → Check Activity Log → Check Analytics counts | All 3 reflect the action | ⬜ |
| 54.4 | Spam → Webhook → Reputation | Mark as spam → Webhook fires → Author reputation decreases | All 3 update | ⬜ |
| 54.5 | Settings change → Queue behavior | Change max_links to 1 → Submit comment with 2 links → Firewall triggers | Settings affect pipeline immediately | ⬜ |
| 54.6 | Export → Modify → Import | Export settings → Change value → Import → Reload | Settings restored | ⬜ |
| 54.7 | Note + History + Assignment | Add note → Assign item → Check history timeline | All 3 appear in unified timeline | ⬜ |

---

## 18. API Contract Validation

### 18.1 Expected API Contracts

| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/cmcc/v1/settings` | GET | — | `{general:{...}, spam_firewall:{...}, ...}` | ⬜ |
| `/cmcc/v1/settings` | POST | `{section:{field: value}}` | `{success: true, data: {...}}` | ⬜ |
| `/cmcc/v1/settings/export` | POST | — | `{success: true, data: {...}}` | ⬜ |
| `/cmcc/v1/settings/import` | POST | `{settings: {...}}` | `{success: true}` | ⬜ |
| `/cmcc/v1/queue` | GET | `?page=1&per_page=25&status=...` | `{items: [...], total: N, page: 1}` | ⬜ |
| `/cmcc/v1/queue/{id}/action` | POST | `{action: "approve"}` | `{success: true, message: "..."}` | ⬜ |
| `/cmcc/v1/queue/bulk-action` | POST | `{ids: [...], action: "approve"}` | `{success: true}` | ⬜ |
| `/cmcc/v1/queue/{id}/ai-evaluate` | GET | — | `{success: true, spamScore: 0.0, ...}` | ⬜ |
| `/cmcc/v1/queue/{id}/ai-evaluate-ex` | GET/POST | — | `{success: true, spamScore: 0.0, ...}` | ⬜ |
| `/cmcc/v1/queue/{id}/ai-auto-moderate` | POST | — | `{success: true, spam_score: 0.0, status: "..."}` | ⬜ |
| `/cmcc/v1/analytics` | GET | — | `{queue_stats: {...}, ...}` | ⬜ |
| `/cmcc/v1/activity-log` | GET | `?page=1&per_page=25` | `{items: [...], total: N}` | ⬜ |
| `/cmcc/v1/activity-feed` | GET | — | `{events: [...]}` | ⬜ |
| `/cmcc/v1/raw-events` | GET | `?start_date=&end_date=` | `[{...event...}]` | ⬜ |
| `/cmcc/v1/users/reputation` | GET | `?page=1&per_page=25` | `{users: [...], total: N}` | ⬜ |
| `/cmcc/v1/reputation-raw` | GET | `?page=1&per_page=25` | `{data: [...], total: N}` | ⬜ |
| `/cmcc/v1/users/deactivate` | POST | `{author_id: N}` | `{success: true, message: "..."}` | ⬜ |
| `/cmcc/v1/reports/moderation-activity` | POST | `{start_date?, end_date?, format?}` | `{success: true, data: [...csv...]}` | ⬜ |
| `/cmcc/v1/reports/compliance-audit` | POST | `{start_date?, end_date?}` | `{success: true, data: [...csv...]}` | ⬜ |
| `/cmcc/v1/reports/scheduled` | POST | `{type, frequency, format?, emails?}` | `{success: true, report: {...}}` | ⬜ |
| `/cmcc/v1/queue/{id}/note` | POST | `{content, is_internal?, type?}` | `{success: true, note: {...}}` | ⬜ |
| `/cmcc/v1/queue/{id}/notes` | GET | — | `{notes: [...]}` | ⬜ |
| `/cmcc/v1/queue/{id}/assign` | POST | `{assignee, due_date?, priority?}` | `{success: true, assignment: {...}}` | ⬜ |
| `/cmcc/v1/queue/{id}/history` | GET | — | `{item_id, history: [...], timeline: [...]}` | ⬜ |

### 18.2 API Error Responses
| # | Error Scenario | Expected Status | Response Structure | Pass/Fail |
|---|---------------|----------------|-------------------|-----------|
| 55.1 | No auth (no nonce) | 403 | `{code: "rest_forbidden", message: "..."}` | ⬜ |
| 55.2 | Invalid action on queue item | 400 | `{success: false, message: "Invalid action."}` | ⬜ |
| 55.3 | Missing item ID | 400 | `{success: false, message: "Missing item ID."}` | ⬜ |
| 55.4 | Non-existent item | 404 | `{success: false, message: "Item not found."}` | ⬜ |
| 55.5 | Invalid settings data | 400 | `{success: false, message: "Invalid settings data."}` | ⬜ |
| 55.6 | Import with empty data | 400 | `{success: false, message: "No settings data provided."}` | ⬜ |
| 55.7 | Empty note | 400 | `{success: false, message: "Note content is required."}` | ⬜ |
| 55.8 | Invalid report type | 400 | `{success: false, message: "Invalid report type."}` | ⬜ |

---

## 19. Security Testing

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 56.1 | Access REST endpoint without nonce | 403 | ⬜ | |
| 56.2 | Access REST endpoint as subscriber | 403 (not manage_options) | ⬜ | |
| 56.3 | SQL injection attempt on search param | Parameterized query prevents injection | ⬜ | |
| 56.4 | XSS attempt: `<script>alert('xss')</script>` in content | Stripped by sanitization | ⬜ | |
| 56.5 | XSS attempt in comment title | `esc_html` prevents execution | ⬜ | |
| 56.6 | CSRF: check nonce is validated on POST endpoints | Nonce required | ⬜ | |
| 56.7 | Direct file access: `wp-content/plugins/cmcc/cmcc.php` | Dies with "WPINC not defined" | ⬜ | |
| 56.8 | Direct file access to lib files | `ABSPATH` check prevents direct access | ⬜ | |

---

## 20. Performance & Stress Testing

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 57.1 | Load queue page with 500+ items | Page loads in < 3 seconds | ⬜ | |
| 57.2 | Load analytics with 1000+ log entries | Charts render, < 3 seconds | ⬜ | |
| 57.3 | Bulk action on 100 items | All processed within reasonable time | ⬜ | |
| 57.4 | AI evaluation on 10 items sequentially | Each completes < 20 seconds | ⬜ | API response time dependent |
| 57.5 | Open 5 tabs to different CMCC pages | All pages load, no conflicts | ⬜ | |
| 57.6 | Check memory usage during bulk operations | No excessive memory consumption | ⬜ | PHP memory_limit check |

---

## 21. Test Completion Checklist

### 21.1 Pass/Fail Summary

| Category | Tests | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Plugin Installation & Activation | 10 | ⬜ | ⬜ | ⬜ |
| Settings Page — 10 Tabs | 64 | ⬜ | ⬜ | ⬜ |
| Firewall Rules Engine | 25 | ⬜ | ⬜ | ⬜ |
| AI Moderation Integration | 30 | ⬜ | ⬜ | ⬜ |
| Queue Management | 48 | ⬜ | ⬜ | ⬜ |
| WordPress Content Hooks | 12 | ⬜ | ⬜ | ⬜ |
| Analytics & Charts | 11 | ⬜ | ⬜ | ⬜ |
| Activity Log | 6 | ⬜ | ⬜ | ⬜ |
| Reports | 7 | ⬜ | ⬜ | ⬜ |
| Collaboration Features | 11 | ⬜ | ⬜ | ⬜ |
| User Reputation System | 6 | ⬜ | ⬜ | ⬜ |
| Notifications & Webhooks | 6 | ⬜ | ⬜ | ⬜ |
| Data Retention & Backup | 4 | ⬜ | ⬜ | ⬜ |
| Error & Edge Case Testing | 17 | ⬜ | ⬜ | ⬜ |
| Loading, Empty, Error States | 17 | ⬜ | ⬜ | ⬜ |
| Cross-Feature Integration | 7 | ⬜ | ⬜ | ⬜ |
| API Contract Validation | 28 | ⬜ | ⬜ | ⬜ |
| Security Testing | 8 | ⬜ | ⬜ | ⬜ |
| Performance & Stress Testing | 6 | ⬜ | ⬜ | ⬜ |
| **TOTAL** | **323** | **⬜** | **⬜** | **⬜** |

### 21.2 Known Blockers

| # | Blocker | Affected Tests | Priority |
|---|---------|---------------|----------|
| B1 | Missing `cmcc_csv_escape()` function → reports endpoints will fatal error | 43.2, 43.3, 43.4 | 🔴 Critical |
| B2 | 6 REST routes not registered → features non-functional | 46.6, 46.7, 46.8 | 🟠 High |
| B3 | Duplicate `cmcc_rest_get_activity_feed` → unpredictable behavior | 44.11 | 🟠 High |
| B4 | Save button automation limitation (React event delegation) | All save tests | 🟡 Medium |

### 21.3 Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | ⬜ |
| Developer | | | ⬜ |
| Product Owner | | | ⬜ |

---

*End of TESTING_REPORT.md*
