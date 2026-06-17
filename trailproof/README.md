# Trailproof — Developer README

> The WordPress.org plugin listing uses `readme.txt`. This file is for contributors and local development only. It is excluded from the distribution ZIP via `.distignore`.

## Requirements

- WordPress 6.4+
- PHP 8.1+
- Composer
- Node.js 18+ and npm

## Local setup

```bash
cd wp-content/plugins/trailproof
composer install
npm install && npm run build
```

## Running tests

```bash
composer test
```

## Architecture

See `CLAUDE.md` for the full architecture, data model, three-bucket classification, ScanProvider interface contract, and hard constraints.

## Third-party licenses

**axe-core** — Mozilla Public License 2.0 (MPL-2.0). Copyright Deque Systems, Inc. Bundled as-is with no modifications. Distributed in `build/axe.min.js`.

**symfony/css-selector** — MIT License. Copyright Fabien Potencier and contributors. Installed via Composer into `vendor/`.

## Distribution

Build and package for WordPress.org:

```bash
npm run build
composer install --no-dev --optimize-autoloader
# Then use the wp-org SVN or a ZIP of the plugin folder, respecting .distignore
```
