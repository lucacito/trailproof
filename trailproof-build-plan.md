# Trailproof: Divi Accessibility Remediation + Audit Trail (Build Plan)

Product name: **Trailproof**
Repo slug: `trailproof`
Tagline: Trailproof, accessibility remediation and audit trail for Divi.
Target: WordPress 6.4+, PHP 8.1+, Divi 4 and Divi 5

> Verify before launch: `wordpress.org/plugins/trailproof` returns 404 (slug free), the `.com` is available at a registrar, and a quick trademark search is clean.

---

## 1. The one-sentence product

A Divi-first accessibility tool that applies real source-level fixes as a non-destructive, fully revertable layer, routes every judgment call through a before/after decision screen, and produces a dated evidence package (audit + remediation log + accessibility statement). It is explicitly **not** a front-end overlay widget.

If you ever feel tempted to add a user-facing accessibility toolbar, stop. That is the competitor's product and it is the thing courts are skeptical of. Your entire reason to exist is real fixes plus a defensible paper trail. The name says it: the trail is the product.

---

## 2. Three non-negotiable principles

1. **Non-destructive.** Never edit saved Divi content (Divi 4 shortcodes or the Divi 5 block tree). Apply all corrections to rendered output at render time, stored as rows in a corrections table. Revert is a row toggle. Fixes survive Divi updates and content edits because the source was never touched.
2. **Honest scope.** The tool fixes Divi module output and content-level markup. It cannot fix a third-party slider's DOM, a form plugin's internals, or an embedded iframe. Name those boundaries in the report. Honest scope is both a feature and a liability shield.
3. **Evidence first.** Anyone can run a scanner. The product is the timestamped remediation log, the accessibility statement, and the conformance report. Build the audit trail as a first-class citizen, not an afterthought.

Marketing hard line: never claim "100% compliant," "fully ADA compliant," or "lawsuit-proof." Claim systematic, documented, good-faith remediation. The FTC has gone after vendors for false compliance claims, which is also why "ADA" is deliberately not in the product name.

---

## 3. The three buckets (the core mental model)

Every detected issue is classified into exactly one bucket. This drives the entire UX.

### Bucket A: Auto-fixable at the source (safe)
Machine-detectable and safe to apply without a human decision. One-click apply, or auto-apply with logging.

- Missing `lang` attribute on `<html>`
- Missing skip-to-content link
- Missing document landmarks (main, nav, header, footer) where Divi structure makes them inferable
- Missing `alt` on images (apply empty alt for confirmed-decorative, otherwise route to decision)
- Generic or empty link text where the destination gives a safe accessible name
- Missing form field labels where a label is programmatically associable
- Missing ARIA on known Divi widget patterns (accordion, tabs, toggle) with predictable markup
- Buttons/links with no accessible name where one is unambiguously derivable

### Bucket B: Detected, but the fix is a human decision (the decision queue)
Machine can pinpoint the failure exactly, but choosing the fix is judgment. These go to the before/after decision UI. **Never auto-fix these.**

- **Color contrast.** Detectable to the exact ratio, but the compliant color is a brand decision.
- **Heading hierarchy.** Skipped levels are detectable; the correct level is contextual.
- **Reading and focus order.** Partly detectable; "is this the right order" is judgment.
- **Alt text content.** Presence is detectable; whether the description conveys meaning is not.
- **Link and button text in context.** "Read more" passes a presence check, fails in context.

### Bucket C: Not machine-detectable (guided manual checklist)
Cannot be reliably detected at all. Surface as a guided checklist with logged human sign-off:

- Image purpose: informative vs decorative vs functional, and whether alt conveys it
- Meaningful link and button text in context
- Keyboard operability of custom or interactive modules (sliders, tabs, accordions, anything scripted)
- Logical reading and focus order in practice
- Color or shape used alone to convey meaning (error states, required fields, charts, status)
- Form error messages: clear, specific, and programmatically associated with the field
- Captions and transcripts for video and audio, and whether they are accurate
- Motion, autoplay, parallax, and flashing content thresholds
- Whether content still makes sense with styles or images disabled

Each Bucket C item is a checklist row with states: needs review, passed, failed, not applicable, deferred, plus a note and a logged owner. The logging matters as much as the check.

---

## 4. Architecture

### 4.1 Detection (pluggable engine layer)

Build detection behind a `ScanProvider` interface so engines drop in cleanly. Ship three providers, phased:

- **axe-core (primary, MVP).** axe-core (MPL-2.0) run client-side. The admin Scan screen loads each in-scope URL in a hidden same-origin iframe, injects axe-core, runs it, and posts results back via REST for storage. This gives the industry-standard ruleset including contrast (axe computes against rendered styles), with zero server browser dependency. Crucially it runs inside the authenticated session, so it can scan staging, password-protected, and pre-launch pages.
- **Static pass (MVP).** A lightweight server-side DOMDocument pass for the structurally detectable subset (missing alt, empty links, heading order, missing lang, unlabeled fields, missing landmarks, generic link text). Runs on WP-Cron without a browser, used for scheduled regression detection of the structural subset between full scans.
- **WAVE (optional second opinion, Pro).** WebAIM's WAVE API as a **bring-your-own-key** provider. The user enters their own WAVE API key; the client pays WebAIM directly for their own credits, so we are not reselling the service. Used on demand for a "confirmed by two engines" report, not as the always-on engine.

Why WAVE is a second opinion, not the engine:
- It only scans publicly reachable URLs, so it cannot reach staging or protected pages the way the in-session axe-core scan can.
- It is metered per scan, which fights the continuous-monitoring model where scans are frequent.
- Its value is credibility: WAVE's methodology is widely recognized, so "confirmed by both axe-core and WAVE" carries more weight with a skeptical client or lawyer. That feeds the evidence-package moat.
- It returns CSS selector values, which map straight onto the selector-keyed issue model and fingerprinting below, so it needs no separate data path.

Before shipping the WAVE relay, confirm WebAIM's terms allow relaying API calls through a commercial product on behalf of a user who supplies their own key.

Be honest in copy: automated testing catches roughly a third of WCAG issues. The tool finds and fixes that third at the source and guides the rest. No engine "makes you compliant" by itself.

### 4.2 Fix application (the non-destructive layer)

- Corrections stored as typed rows, applied at render via output buffering on `template_redirect`, or more surgically on `the_content` plus targeted Divi hooks.
- Apply with PHP DOMDocument + Symfony CssSelector (CSS selector to XPath) to locate the target element, then run a typed transform.
- Cache corrected output keyed by a content hash so the DOM work happens once per content state. Toggle off = bypass the filter, instant revert.
- Each correction stores the original value, so revert and before/after are free.

Transform types: `set_lang`, `inject_skiplink`, `add_landmark`, `set_alt`, `set_alt_empty_decorative`, `rewrite_link_text`, `associate_label`, `add_aria_label`, `add_aria_role`, `widget_aria_pattern`.

### 4.3 Issue fingerprinting

Stable hash of normalized(selector) + rule_id + template/URL context. Lets the same issue be tracked across re-scans (and across engines, since both axe-core and WAVE return selectors) so you can detect regressions ("new violation appeared on 2026-06-20 after a content edit") and avoid duplicate rows.

### 4.4 Data model

- `{prefix}_tp_scans`: id, url, post_id, provider(axe|static|wave|cloud), score, summary_json, created_at
- `{prefix}_tp_issues`: id, scan_id, fingerprint, url, post_id, selector, rule_id, wcag_sc, bucket(A|B|C), severity, priority_score, status(open|fixed|deferred|na|regressed), confirmed_by_json (which engines flagged it), description, created_at, updated_at
- `{prefix}_tp_corrections`: id, fingerprint, post_id, url, selector, transform_type, payload_json, original_json, enabled, created_by, created_at, decided_by, decided_at
- `{prefix}_tp_decisions_log`: id, ts, user_id, action, fingerprint, before_json, after_json, note. **Append-only. Never update or delete rows.** This is the evidence trail.
- `{prefix}_tp_reports`: id, type(audit|statement|conformance|bundle), snapshot_json, generated_at, generated_by

### 4.5 Severity and priority

Map each rule to (legal_exposure, user_impact) and compute a priority score. Missing form labels, keyboard traps, and contrast failures rank high (demand-letter material). A slightly off footer contrast ranks low. Surface "fix these five first," never a flat wall of red.

### 4.6 WCAG mapping

Every issue tagged to its WCAG 2.2 success criterion with a one-sentence plain-English "who this affects and why." This is what makes the report credible to a lawyer and educational to the client.

---

## 5. UI

Built with `@wordpress/scripts` + React + `@wordpress/components` for a native admin look.

- **Dashboard:** site score, trend, open/decided counts, top priorities, regression alerts.
- **Worklist:** filter by bucket / severity / status. Bucket A items have a one-click Fix. Bucket B items open the decision screen. Bucket C items are the guided checklist. Show which engine(s) confirmed each issue.
- **Before/After decision screen (Bucket B):** side-by-side rendered preview of original vs proposed, the WCAG criterion and plain-English why, and actions: Apply, Edit value, Mark decorative / NA, Defer. Every action logged. For contrast: a color picker with a live contrast ratio readout against the detected background and a "nearest compliant shade" suggestion.
- **Evidence / Reports:** one-click dated export bundle (audit + remediation log + accessibility statement + conformance summary). When a WAVE second-opinion run exists, the report notes "confirmed by axe-core and WAVE." PDF and HTML.
- **Settings:** scan scope (post types, URL include/exclude), schedule, email alerts, white-label, and an optional WAVE API key field (bring-your-own-key).
- **Two views from the same data:** Developer/Agency view (full technical detail + fix controls) and Client view (score, progress, export only).
- **Multi-site dashboard (Agency):** aggregate every connected site's score and alerts in one place.

---

## 6. Roadmap

### Phase 0: Foundation
Scaffold plugin (PSR-4, namespaced), activation/deactivation, DB schema + migrations, settings page, scope config, REST namespace, build tooling (wp-scripts + Composer), CLAUDE.md, README, license/attribution for axe-core.

### Phase 1: MVP scan + report (free funnel)
axe-core client-side scan via the ScanProvider interface, server-side static pass, issue storage + fingerprinting, dashboard + worklist (read-only), three-bucket classification, accessibility statement generator, basic audit report export. Optionally apply the always-safe trio: lang, skip link, decorative-alt flagging.

### Phase 2: Remediation core (Pro)
Non-destructive correction layer + revert, Bucket A one-click fixes, Bucket B before/after decision UI, contrast picker, severity triage, WCAG per-criterion mapping, the guided Bucket C checklist.

### Phase 3: Recurring moat (Pro)
Scheduled scans (WP-Cron static + optional cloud full), regression detection + email alerts, full evidence bundle export, immutable decisions log surfaced in reports, client view, WAVE bring-your-own-key second-opinion provider feeding the report.

### Phase 4: Scale (Agency)
Multi-site dashboard, white-label reports, Divi-module-specific fix pack (accordion, tabs, toggle, menu module, blurb headings, gallery), cloud headless full scans.

### Phase 5: v2 differentiators
Author-side prevention inside the Divi 5 editor (nudge on missing alt, skipped heading, failing contrast at creation), PDF flagging (flag untagged PDFs; remediation is a later separate product), screen-reader / keyboard focus-order preview, Elementor and Gutenberg ScanProviders + fix packs reusing the audit-trail engine.

---

## 7. Monetization

Position against the entrenched Divi competitor that is lifetime-priced and overlay-flavored. Your wedge is recurring value: monitoring, regression alerts, and the evidence package they cannot produce.

- **Free (.org):** scanner, three-bucket detection, manual fix guidance, accessibility statement generator. The funnel.
- **Pro (per site, annual recurring):** full correction layer + revert, before/after decision UI, severity triage, scheduled monitoring + regression alerts, evidence bundle, optional WAVE second opinion (BYO key).
- **Agency (annual recurring, N sites):** multi-site dashboard, white-label, client view, priority support.

Pricing hypotheses to validate, not gospel: Pro around 99 to 149 per site per year, Agency around 399 to 699 per year for 10 to 25 sites. Validate against your own client base before publishing.

Unfair advantage: pilot on three of your own high-exposure Divi clients (the medical imaging sites fit the lawsuit-target profile), generate real evidence bundles, and use those as case studies before touching the directory.

---

## 8. Tech stack summary

- PHP 8.1+, namespaced, PSR-4, Composer (`symfony/css-selector` for selector to XPath)
- axe-core (MPL-2.0) bundled with attribution, run client-side via iframe injection (primary engine)
- Pluggable `ScanProvider` interface: axe-core, static (DOMDocument), WAVE (optional BYO key), cloud headless (later)
- Admin UI: React via `@wordpress/scripts`, `@wordpress/components`, REST API for data
- DOMDocument + DOMXPath for server-side detection and correction application
- WP-Cron for scheduled static scans; Playwright cloud worker for full scheduled scans (later)
- Tests: PHPUnit + WP test suite, Playwright for E2E (later)

---

## 9. Risks and how the plan handles them

- **Niche is occupied.** Existing Divi accessibility tools (Fix Divi A11y, CampusPress Divi Accessibility) are free developer code-fix libraries, not products. None do scanning, a decision queue, monitoring, or an evidence package. That is the open gap. Win on real fixes, no widget, and recurring documented evidence.
- **Divi 5 markup churn.** Rendered-output approach is storage-agnostic, so it survives Divi 4 vs 5 and updates. Module-specific fixes (Phase 4) carry maintenance risk; keep them in a versioned fix pack.
- **Overclaiming compliance.** Hard rule in copy and in report language. "ADA" stays out of the name. Document effort, never guarantee outcome.
- **Scope creep into things you cannot fix.** Boundaries named explicitly in every report.
- **Detection coverage gaps.** Be transparent that automation catches a subset; the guided checklist and decision queue carry the rest, and the optional WAVE second opinion adds cross-engine confirmation.
- **Third-party dependency on WAVE.** Kept optional and bring-your-own-key so it is never a launch blocker or a margin drain, and the user owns the WebAIM relationship.
