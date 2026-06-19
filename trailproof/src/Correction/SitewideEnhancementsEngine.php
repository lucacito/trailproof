<?php

declare(strict_types=1);

namespace Trailproof\Correction;

/**
 * Injects sitewide CSS enhancements via wp_head when enabled in settings.
 *
 * Handles three independently toggleable improvements:
 *   focus_style      — :focus-visible outline for keyboard users
 *   touch_target     — 44 × 44 px minimum for buttons/links (WCAG 2.5.8)
 *   reduced_motion   — prefers-reduced-motion override (WCAG 2.3.3)
 *
 * These operate outside the scan → issue → correction pipeline because they
 * are sitewide CSS rules with no meaningful per-element selector.  They still
 * respect the global fixes_enabled kill-switch.
 */
class SitewideEnhancementsEngine {

	public function register(): void {
		add_action( 'wp_head', [ $this, 'inject_css' ], 99 );
	}

	public function inject_css(): void {
		$settings = (array) get_option( 'trailproof_settings', [] );

		if ( ! ( $settings['fixes_enabled'] ?? true ) ) {
			return;
		}

		$blocks = [];

		// All rules are scoped under body:not(.trailproof-preview-off) so the admin-bar
		// toggle can show a before/after comparison without a page reload.

		if ( $settings['focus_style_enabled'] ?? false ) {
			$color    = sanitize_hex_color( $settings['focus_style_color'] ?? '#0066CC' ) ?: '#0066CC';
			$blocks[] = "body:not(.trailproof-preview-off) *:focus-visible { outline: 2px solid {$color} !important; outline-offset: 2px !important; }";
		}

		if ( $settings['touch_target_enabled'] ?? false ) {
			$blocks[] =
				"body:not(.trailproof-preview-off) button,\n" .
				"body:not(.trailproof-preview-off) [role=\"button\"],\n" .
				"body:not(.trailproof-preview-off) input[type=\"submit\"],\n" .
				"body:not(.trailproof-preview-off) input[type=\"button\"],\n" .
				"body:not(.trailproof-preview-off) input[type=\"reset\"],\n" .
				"body:not(.trailproof-preview-off) summary { min-height: 44px; min-width: 44px; }\n" .
				"body:not(.trailproof-preview-off) a[href]:not(.tp-skip-link):not(:has(img)) { min-height: 44px; display: inline-flex; align-items: center; }\n" .
				"#wpadminbar a, #wpadminbar button, #wpadminbar [role=\"button\"] { min-height: 0; min-width: 0; display: revert; }";
		}

		if ( $settings['reduced_motion_enabled'] ?? false ) {
			$blocks[] =
				"@media (prefers-reduced-motion: reduce) {\n" .
				"  body:not(.trailproof-preview-off) *,\n" .
				"  body:not(.trailproof-preview-off) *::before,\n" .
				"  body:not(.trailproof-preview-off) *::after {\n" .
				"    animation-duration: 0.01ms !important;\n" .
				"    animation-iteration-count: 1 !important;\n" .
				"    transition-duration: 0.01ms !important;\n" .
				"    scroll-behavior: auto !important;\n" .
				"  }\n" .
				"}";
		}

		$font_size = (int) ( $settings['base_font_size'] ?? 0 );
		if ( in_array( $font_size, [ 16, 18, 20, 22 ], true ) ) {
			// font-size on html affects rem units sitewide; body:not() scoping isn't usable here
			$blocks[] = "html { font-size: {$font_size}px !important; }";
		}

		if ( empty( $blocks ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<style data-trailproof="sitewide-enhancements">' . "\n" . implode( "\n", $blocks ) . "\n</style>\n";
	}
}
