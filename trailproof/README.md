# Trailproof

Accessibility remediation and audit trail for Divi. Applies real source-level fixes as a non-destructive, revertable render-time layer and produces a dated evidence package.

---

## Requirements

- WordPress 6.4+
- PHP 8.1+
- Divi 4 or Divi 5
- Composer
- Node.js 18+ and npm

---

## Local setup

### 1. Install PHP dependencies

```bash
cd wp-content/plugins/trailproof
composer install
```

### 2. Install JS dependencies and build admin UI

```bash
npm install
npm run build
```

For active development with hot-reload:

```bash
npm run start
```

### 3. Activate the plugin

Activate via **Plugins > Installed Plugins** in the WordPress admin, or via WP-CLI:

```bash
wp plugin activate trailproof
```

Activation creates the five database tables (`tp_scans`, `tp_issues`, `tp_corrections`, `tp_decisions_log`, `tp_reports`) and stores the current schema version in `trailproof_schema_version`.

### 4. Open the admin UI

Navigate to **Trailproof** in the WordPress admin sidebar. You should see the placeholder Dashboard screen.

Verify the REST API is live:

```
GET /wp-json/trailproof/v1/status
```

Returns `{ "version": "0.1.0", "schema_version": 1, "status": "ok" }` for a logged-in editor or above.

---

## Running tests

```bash
composer test
```

Tests require a local WordPress test suite. Set `WP_TESTS_DIR` to point to it, or use the WP test bootstrap in `tests/bootstrap.php`.

---

## Third-party licenses

### axe-core

axe-core is used as the primary accessibility scanning engine.

- **License:** Mozilla Public License 2.0 (MPL-2.0)
- **Copyright:** Deque Systems, Inc.
- **Source:** https://github.com/dequelabs/axe-core
- **License text:** https://www.mozilla.org/en-US/MPL/2.0/

The MPL-2.0 allows use in proprietary software provided that MPL-licensed files remain open if modified, and that the license and copyright notice are preserved. No modifications are made to axe-core source files; it is bundled and loaded as-is.

### symfony/css-selector

- **License:** MIT
- **Copyright:** Fabien Potencier and contributors
- **Source:** https://github.com/symfony/css-selector

---

## Architecture overview

See `CLAUDE.md` for the full architecture, data model, three-bucket classification, ScanProvider interface contract, and hard constraints.
