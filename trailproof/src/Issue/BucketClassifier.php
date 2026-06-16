<?php

declare(strict_types=1);

namespace Trailproof\Issue;

class BucketClassifier {

	/**
	 * Rules where a safe, machine-derivable fix exists — Bucket A, one-click apply.
	 * Expand as Phase 2 correction transforms are built for each rule.
	 */
	private const BUCKET_A = [
		'html-has-lang',
		'bypass',                   // skip-to-content link
		'landmark-one-main',
		'landmark-complementary-is-top-level',
		'landmark-no-duplicate-banner',
		'landmark-no-duplicate-contentinfo',
		'landmark-no-duplicate-main',
		'image-alt',                // empty alt on decorative; content alt → Bucket B
		'input-image-alt',
		'area-alt',
		'label',                    // when a label is programmatically associable
		'link-name',                // when destination gives accessible name
		'button-name',
		'frame-title',

		// Divi module ARIA patterns — safe to auto-fix via widget_aria_pattern transform
		'divi-accordion',
		'divi-tabs',
		'divi-toggle',
		'divi-menu',
		'divi-gallery',

		// Gutenberg — auto-fixable (alt text set to empty for decorative, or derivable from context)
		'gutenberg-image-alt',
		'gutenberg-gallery-alt',
		'gutenberg-cover-alt',

		// Elementor — auto-fixable
		'elementor-image-alt',
	];

	/**
	 * Rules where the fix is a human judgment call — Bucket B, decision screen.
	 * Never auto-fix these.
	 */
	private const BUCKET_B = [
		'document-title',           // correct title is human knowledge; use set_title transform
		'color-contrast',
		'color-contrast-enhanced',
		'heading-order',
		'link-in-text-block',
		'identical-links-same-purpose',
		'tabindex',
		'focus-order-semantics',
		'scrollable-region-focusable',
		'frame-focusable-content',
		'p-as-heading',

		// Gutenberg / Elementor — judgment call on what the accessible name should be
		'gutenberg-button-text',
		'elementor-button-text',
		'elementor-carousel-aria',
		'elementor-icon-box-name',
	];

	/**
	 * All other rules default to Bucket C (guided checklist with logged sign-off).
	 */
	public static function classify( string $rule_id ): string {
		if ( in_array( $rule_id, self::BUCKET_A, true ) ) {
			return 'A';
		}
		if ( in_array( $rule_id, self::BUCKET_B, true ) ) {
			return 'B';
		}
		return 'C';
	}

	public static function impact_to_severity( string $impact ): string {
		return match ( strtolower( $impact ) ) {
			'critical' => 'critical',
			'serious'  => 'serious',
			'moderate' => 'moderate',
			'minor'    => 'minor',
			default    => 'moderate',
		};
	}

	/**
	 * 0–100 score weighting legal exposure and user impact.
	 * Higher = fix first. Drives the worklist sort order.
	 */
	public static function priority_score( string $rule_id, string $impact, string $bucket ): int {
		$base = match ( strtolower( $impact ) ) {
			'critical' => 90,
			'serious'  => 70,
			'moderate' => 50,
			'minor'    => 30,
			default    => 50,
		};

		// High legal-exposure rules (keyboard traps, unlabeled fields, missing lang)
		$high_exposure = [ 'label', 'bypass', 'keyboard', 'focus-trap', 'html-has-lang', 'scrollable-region' ];
		foreach ( $high_exposure as $fragment ) {
			if ( str_contains( $rule_id, $fragment ) ) {
				$base = min( 100, $base + 10 );
				break;
			}
		}

		// Bucket A issues are immediately actionable — slight boost so they surface first
		if ( $bucket === 'A' ) {
			$base = min( 100, $base + 5 );
		}

		return $base;
	}
}
