# Trailproof — AI Session Context

This file is the source of truth for future Claude Code sessions. Read it before writing a line.

---

## What this product is

A Divi-first WordPress accessibility tool. It applies real source-level fixes as a non-destructive, fully revertable render-time layer, routes judgment calls through a before/after decision screen, and produces a dated evidence package (audit + remediation log + accessibility statement).

**It is NOT a front-end accessibility overlay or toolbar. Never add one.**

---

## Three non-negotiable principles

1. **Non-destructive.** Never edit saved Divi content (Divi 4 shortcodes or Divi 5 block tree). Every fix is a row in `tp_corrections`, applied at render time via output buffering. Revert = toggle `enabled` to 0. Original value is always stored so before/after and revert are trivial.

2. **Honest scope.** The tool fixes Divi module output and content-level markup only. It cannot fix third-party slider DOM, form plugin internals, or embedded iframes. These limits must be named in reports, never hidden.

3. **Evidence first.** `tp_decisions_log` is append-only. Never UPDATE or DELETE its rows. The audit trail is the product.

---

## The three buckets (drives all UX)

| Bucket | What it is | How it's handled |
|--------|-----------|-----------------|
| **A** | Auto-fixable, safe | One-click apply. lang attr, skip link, inferable landmarks, decorative alt, derivable link text, associable form labels, ARIA on known Divi widget patterns. |
| **B** | Detected, but fix is a human decision | **Never auto-fix.** Opens before/after decision screen. Color contrast, heading hierarchy, reading/focus order, alt text content, link text in context. |
| **C** | Not machine-detectable | Guided checklist with logged sign-off. Image purpose, keyboard operability, logical reading order, form error messaging, captions, motion/autoplay, content without styles. |

---

## Detection engine (pluggable via ScanProvider interface)

**Interface:** `Trailproof\Scan\ScanProvider` — `getLabel()`, `getKey()`, `scan(url, post_id): ?int`, `isAvailable(): bool`

**Providers:**
- `AxeCoreProvider` (`axe`) — axe-core (MPL-2.0) run **client-side** in a hidden same-origin iframe. The admin Scan screen injects axe-core, runs it, and POSTs results to `trailproof/v1/scans/axe/results`. PHP stores; JS drives. Primary engine for MVP. Scans inside authenticated sessions (works on staging/protected pages).
- `StaticProvider` (`static`) — lightweight server-side DOMDocument pass for structural subset (missing alt, empty links, heading order, missing lang, unlabeled fields, missing landmarks, generic link text). Runs on WP-Cron, no browser needed.
- `WaveProvider` (`wave`) — WebAIM WAVE API, **bring-your-own-key only**. User supplies their own WAVE API key; we do not resell the service. Second-opinion on demand, not always-on. Returns CSS selectors → same issue model. **Before building this relay, flag to the user that WebAIM's terms need explicit review.**

---

## Data model

All tables use `{$wpdb->prefix}tp_` prefix. Created by `Schema::migrate_v1()` via `dbDelta`. Schema version stored in `trailproof_schema_version` option.

| Table | Key columns |
|-------|------------|
| `tp_scans` | id, url, post_id, provider(axe\|static\|wave\|cloud), score, summary_json, created_at |
| `tp_issues` | id, scan_id, **fingerprint** (sha256 of selector+rule_id+context), url, post_id, selector, rule_id, wcag_sc, bucket(A\|B\|C), severity, priority_score, status(open\|fixed\|deferred\|na\|regressed), confirmed_by_json, description |
| `tp_corrections` | id, fingerprint, post_id, url, selector, transform_type, payload_json, **original_json**, enabled, created_by, decided_by/at |
| `tp_decisions_log` | id, ts, user_id, action, fingerprint, before_json, after_json, note — **APPEND-ONLY** |
| `tp_reports` | id, type(audit\|statement\|conformance\|bundle), snapshot_json, generated_at, generated_by |

---

## Correction transform types

`set_lang`, `inject_skiplink`, `add_landmark`, `set_alt`, `set_alt_empty_decorative`, `rewrite_link_text`, `associate_label`, `add_aria_label`, `add_aria_role`, `widget_aria_pattern`

Applied via output buffering on `template_redirect`. PHP DOMDocument + symfony/css-selector (CSS→XPath) locates target elements. Cache corrected output keyed by content hash. Bypass filter entirely when `enabled = 0`.

---

## Tech stack

- PHP 8.1+, PSR-4 (`Trailproof\` → `src/`), Composer, `symfony/css-selector`
- axe-core (MPL-2.0) bundled with license and attribution — see README
- Admin UI: React via `@wordpress/scripts`, `@wordpress/components`, REST API
- DOMDocument + DOMXPath for server-side detection and correction application
- WP-Cron for scheduled static scans
- Tests: PHPUnit + WP test suite

---

## REST API

Namespace: `trailproof/v1` (registered in `Trailproof\Api\RestApi`)
- All routes must have a `permission_callback`; capability depends on sensitivity
- Read-only routes: `edit_posts` minimum
- Mutating routes: `manage_options` minimum

Settings stored as single option `trailproof_settings` (array) via `register_setting`.

---

## Hard do-nots

- **Never add a front-end accessibility toolbar or overlay widget**
- **Never edit saved Divi content** (shortcodes or block tree)
- **Never UPDATE or DELETE rows from `tp_decisions_log`**
- **Never claim 100% compliance, "fully ADA compliant," or "lawsuit-proof"** — always use "systematic documented remediation" framing. Do not put "ADA" in any compliance claim.
- **Never auto-fix Bucket B issues** — they always go through the before/after decision screen

---

## Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 0 | **Done** | Foundation: scaffold, DB, settings, REST stub, React placeholder, ScanProvider interface |
| 1 | **Done** | axe-core client-side scan, static provider, issue storage + fingerprinting, dashboard + worklist, three-bucket classification, accessibility statement |
| 2 | **Done** | Correction layer + revert, Bucket A one-click fixes, Bucket B decision UI, contrast picker, Bucket C checklist |
| 3 | **Done** | Scheduled scans, regression detection, evidence bundle export, WAVE provider |
| 4 | **Done** | Multi-site dashboard, white-label, Divi module fix pack |
| 5 | **Done** | Author-side prevention in Divi 5 editor, PDF flagging, Elementor/Gutenberg providers, focus-order preview |
| 6 | **Done** | AI suggestions in Bucket B (Claude Haiku via `SuggestionService`), regression email alerts (`NotificationService`), token-gated client portal (`ClientPortalRoutes`, `ClientTokenRepository`, `tp_client_tokens` table) |
