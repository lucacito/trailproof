=== Trailproof ===
Contributors: trailproof
Tags: accessibility, wcag, aria, remediation, audit
Requires at least: 6.4
Tested up to: 6.8
Stable tag: 0.1.0
Requires PHP: 8.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accessibility audit and remediation for WordPress. Non-destructive WCAG fixes, decision trails, and dated evidence bundles.

== Description ==

Trailproof applies real source-level accessibility fixes as a non-destructive, fully revertable render-time layer and produces a dated evidence package: an audit log, a remediation decision trail, and a formatted accessibility statement.

It is NOT a front-end overlay. Every fix is stored as a database row and applied at render time via output buffering. Reverting a fix is a single click — your saved content is never modified.

**Three-bucket classification:**

* **Bucket A — Auto-fixable:** lang attribute, skip link, landmarks, decorative alt, form labels, ARIA patterns on known widget structures. Applied in one click.
* **Bucket B — Decision required:** Color contrast, heading hierarchy, alt text content. Always goes through a before/after review screen. Never auto-applied.
* **Bucket C — Manual checklist:** Keyboard operability, captions, reading order. Guided sign-off with a logged timestamp.

**Evidence bundle includes:**

* Formatted accessibility statement (WCAG 2.1 AA framing)
* Issues CSV with WCAG success criterion mapping and current status
* Append-only decision log — every fix, deferral, and sign-off is recorded
* Scan history JSON

**Scan providers:**

* **axe-core** — Client-side scan using the industry-standard axe-core engine (bundled, MPL-2.0). Runs inside an authenticated admin session, so it catches issues on password-protected or staging pages.
* **Static (DOMDocument)** — Lightweight server-side structural pass. Runs on a WP-Cron schedule for regression detection between full scans.
* **WAVE (optional)** — Second-opinion scan via the WebAIM WAVE API. Requires your own WAVE API key. No key is shared or resold.

**Divi 4 and Divi 5 supported.** Gutenberg and Elementor providers included.

== Installation ==

1. Download the plugin ZIP from WordPress.org.
2. In your WordPress admin go to **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP and click **Install Now**.
4. Click **Activate Plugin**.
5. Navigate to **Settings > Trailproof** to configure scan options and, optionally, your WAVE API key or AI suggestion key.

No command-line steps are required.

== Frequently Asked Questions ==

= Does this edit my saved Divi content? =

No. Every fix is applied at render time via output buffering. Your saved Divi shortcodes and Divi 5 block tree are never touched. Reverting a fix removes it from the database — the original page is restored instantly.

= Is this a front-end accessibility overlay? =

No. Trailproof applies source-level fixes server-side and produces a permanent evidence trail. There is no floating toolbar, no injected widget, and no client-side patch applied to visitors.

= What does "partially conformant" mean in the accessibility statement? =

It means some content does not yet fully conform to WCAG 2.1 Level AA. Trailproof documents the systematic remediation effort — it never claims 100% compliance.

= Does the plugin send my content to any external server? =

Only if you explicitly configure an external API key. The axe-core scan and the static scan run entirely on your server. External services are only contacted when you supply and use a WAVE API key or an AI suggestion API key. See "External Services" below.

= Will my data be deleted if I uninstall the plugin? =

Yes. Uninstalling (deleting) the plugin via the WordPress admin removes all six database tables and all stored plugin settings. Deactivating without deleting preserves your data.

= What scan engine does Trailproof use by default? =

axe-core (MPL-2.0), the same engine used by browser extensions such as Deque's axe DevTools. It is bundled with the plugin — no external download is needed. The static DOMDocument pass is also included. Both run on your server.

== Screenshots ==

1. Dashboard showing scan score, open issues by severity, and bucket breakdown.
2. Issue worklist with WCAG success criterion mapping and one-click Bucket A fixes.
3. Bucket B decision screen showing before/after HTML diff with contrast picker.
4. Bucket C manual checklist with sign-off log.
5. Evidence bundle export showing accessibility statement, CSV, and decision log.

== External Services ==

Trailproof contacts external services **only** when you explicitly supply your own API key in the plugin settings. No data is sent automatically without your configuration.

= Anthropic Claude API (optional — AI suggestions) =

If you enter a Claude API key in the plugin settings, Trailproof will send the HTML of individual accessibility issues to Anthropic's API to generate suggested fix text (alt text, link text, ARIA labels). This feature is disabled by default and only activates when a key is provided.

* **What is sent:** The raw HTML of the element being remediated, the WCAG rule ID, and a brief prompt. No user data, personal information, or full page content is sent.
* **When it is sent:** Only when you click "Get AI Suggestion" on an individual issue in the decision screen.
* **Service:** Anthropic, PBC — https://www.anthropic.com
* **Privacy policy:** https://www.anthropic.com/privacy

= WebAIM WAVE API (optional — second-opinion scan) =

If you enter a WAVE API key in the plugin settings, Trailproof will send the URL of the page being scanned to WebAIM's WAVE API to retrieve an independent accessibility report. This feature is disabled by default and only activates when a key is provided.

* **What is sent:** The public URL of the page being scanned, your WAVE API key, and request parameters (report format). No page content is sent by Trailproof — WAVE fetches the page itself.
* **When it is sent:** Only when you click "Run WAVE Scan" on a page in the scan screen.
* **Service:** WebAIM (Utah State University) — https://wave.webaim.org
* **Privacy policy:** https://wave.webaim.org/privacy
* **Terms of use:** https://wave.webaim.org/api/

Trailproof does not resell or proxy WAVE API credits. Each API call is charged against your own WAVE account.

== Changelog ==

= 0.1.0 =
* Initial release: three-bucket scanner (axe-core, static DOMDocument, WAVE), non-destructive correction layer with full revert, Bucket A one-click fixes, Bucket B before/after decision screen, Bucket C manual checklist, evidence bundle export (accessibility statement, CSV, decision log, scan JSON), scheduled regression scans via WP-Cron, Divi 4 and Divi 5 module fix pack, Gutenberg and Elementor providers, AI fix suggestions (optional, requires Anthropic key), client portal with token-gated access.

== Upgrade Notice ==

= 0.1.0 =
Initial release.
