# Claude Code Kickoff Prompt: Trailproof

Paste the block below into Claude Code in your empty project folder (VS Code terminal or the Claude Code panel). Keep `trailproof-build-plan.md` in the same folder so Claude Code can read it.

---

## Paste this into Claude Code

```
You are helping me build a WordPress plugin from scratch. Read trailproof-build-plan.md
in this folder first; it is the source of truth for scope and architecture. Then follow
the instructions below.

PRODUCT
A Divi-first WordPress accessibility tool named "Trailproof", repo slug "trailproof". It
applies real source-level accessibility fixes as a non-destructive, fully revertable
layer, routes judgment calls through a before/after decision screen, and produces a dated
evidence package (audit + remediation log + accessibility statement). It is NOT a
front-end accessibility overlay/toolbar. Never add one. The audit trail is the product.

THREE NON-NEGOTIABLE PRINCIPLES
1. Non-destructive. Never edit saved Divi content (Divi 4 shortcodes or Divi 5 block
   tree). Apply all corrections to rendered HTML output at render time, stored as rows in
   a corrections table. Revert must be a single toggle. Store the original value with
   every correction so revert and before/after previews are trivial.
2. Honest scope. The tool fixes Divi module output and content-level markup only. It
   cannot fix third-party slider DOM, form plugin internals, or embedded iframes. These
   boundaries must be named in the reports, not hidden.
3. Evidence first. The audit trail is a first-class feature. The decisions log table is
   append-only: never update or delete its rows.

THE THREE BUCKETS (drives the whole UX)
- Bucket A, auto-fixable safe: lang attribute, skip link, inferable landmarks,
  decorative alt, derivable link text, associable form labels, ARIA on known Divi widget
  patterns. One-click apply.
- Bucket B, detected but human decision (NEVER auto-fix): color contrast, heading
  hierarchy, reading/focus order, alt text content, link text in context. These open the
  before/after decision screen.
- Bucket C, not machine-detectable (guided checklist with logged sign-off): image
  purpose, meaningful link text, keyboard operability of interactive modules, logical
  reading order, color/shape-only meaning, form error messaging, captions/transcripts,
  motion/autoplay/flashing, content sense without styles.

DETECTION (pluggable engine layer, build a ScanProvider interface)
- Primary engine: axe-core (MPL-2.0, include license and attribution) run CLIENT-SIDE.
  The admin Scan screen loads each in-scope URL in a hidden same-origin iframe, injects
  axe-core, runs it, and posts results back via the REST API for storage. Runs inside the
  authenticated session so it can scan staging and password-protected pages.
- Static provider: a lightweight server-side DOMDocument pass for the structural subset
  (missing alt, empty links, heading order, missing lang, unlabeled fields, missing
  landmarks, generic link text), runs on WP-Cron without a browser for regression checks.
- Optional WAVE provider (later phase): WebAIM WAVE API as a BRING-YOUR-OWN-KEY second
  opinion. The user supplies their own WAVE API key; we do not resell the service. Used
  on demand for a "confirmed by axe-core and WAVE" report, not as the always-on engine.
  WAVE returns CSS selectors, which map onto the selector-keyed issue model. Before
  building the relay, flag to me that WebAIM's terms need checking.

TECH STACK
- PHP 8.1+, namespaced, PSR-4 autoload, Composer. Use symfony/css-selector for CSS
  selector to XPath. Use PHP DOMDocument + DOMXPath for server-side detection and for
  applying corrections to rendered output.
- Admin UI: React via @wordpress/scripts and @wordpress/components, talking to a custom
  REST namespace. Build with wp-scripts (webpack).
- WP-Cron for scheduled static scans.
- Tests: PHPUnit with the WP test suite.

DATA MODEL (create with dbDelta and a schema version / migration system)
- {prefix}_tp_scans (provider: axe|static|wave|cloud)
- {prefix}_tp_issues (stable fingerprint = hash of normalized selector + rule_id +
  url/template context; confirmed_by field for which engines flagged it; bucket A|B|C)
- {prefix}_tp_corrections (typed transform, payload, original value, enabled flag,
  decided_by/at)
- {prefix}_tp_decisions_log (APPEND-ONLY audit trail)
- {prefix}_tp_reports

CORRECTION TRANSFORM TYPES
set_lang, inject_skiplink, add_landmark, set_alt, set_alt_empty_decorative,
rewrite_link_text, associate_label, add_aria_label, add_aria_role, widget_aria_pattern.
Apply via output buffering on template_redirect (or the_content + targeted hooks), locate
elements with symfony/css-selector to XPath, run the typed transform, cache the corrected
output keyed by content hash, and bypass the filter entirely when a correction is
disabled.

HOW I WANT YOU TO WORK
- Build strictly phase by phase per the plan. Do not jump ahead. After each phase, stop
  and summarize what you built and how to test it, then wait for me.
- Before any non-obvious architectural decision, state the options and your
  recommendation and ask me, do not guess silently.
- Follow WordPress coding standards (sanitization, escaping, nonces, capability checks on
  every REST route and admin action). Security is not optional.
- Write small, focused commits with clear messages. Add PHPUnit tests for the detection
  rules, the fingerprinting, and the correction apply/revert logic.
- Keep functions small and readable. Comment the why, not the what.
- Do NOT write any front-end accessibility widget or overlay under any circumstances.
- Do NOT ever edit saved Divi content. All fixes are render-time only.
- In all user-facing and report text, never claim full compliance or that the site is
  lawsuit-proof, and never put "ADA" in a compliance claim. Use "systematic documented
  remediation" framing.

FIRST TASK: PHASE 0 (FOUNDATION)
Scaffold the plugin:
1. Plugin header (name "Trailproof", text domain "trailproof"), main bootstrap file, PSR-4
   autoloading via Composer, namespaced classes.
2. Activation and deactivation hooks. On activation, create the five DB tables with
   dbDelta and store a schema version option for future migrations.
3. A Settings page with scan scope config (post types, URL include/exclude), schedule, a
   white-label toggle, and an optional WAVE API key field (stored as options).
4. Register a versioned REST namespace (trailproof/v1) with capability checks, even if
   routes are stubs for now.
5. Set up wp-scripts so I have an admin React entry point that renders a placeholder
   "Dashboard" screen registered as an admin menu page.
6. Define the ScanProvider interface (even if only a stub axe-core provider exists yet) so
   engines drop in cleanly later.
7. Add a CLAUDE.md capturing the principles, the three buckets, the data model, the
   pluggable ScanProvider design, and the "do not" rules above so future sessions stay
   consistent. Add a README with local setup steps and the axe-core license attribution.

Confirm the folder is empty, propose the exact file/folder structure you will create, and
wait for my go-ahead before generating files.
```

---

## Notes for you (not part of the prompt)

- Keep `trailproof-build-plan.md` in the repo root. The prompt tells Claude Code to read it, and the generated CLAUDE.md keeps later sessions aligned.
- Run it inside a local WordPress (LocalWP or Docker) with Divi active so Claude Code can test against real Divi output early.
- At Phase 1, point it at exported pages from one of your own Divi client sites as a real-world fixture rather than synthetic markup.
- Have Composer and Node installed before you start; the prompt assumes both.
- If a phase produces too much at once, tell it to split into smaller PRs. It works better in small steps.
- WAVE stays a later phase and bring-your-own-key on purpose, so it is never a launch blocker or a margin drain.
