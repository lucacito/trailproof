<?php

declare(strict_types=1);

namespace Trailproof\Correction;

use DOMDocument;
use DOMXPath;
use Symfony\Component\CssSelector\CssSelectorConverter;
use Trailproof\Repository\CorrectionRepository;

/**
 * Applies enabled corrections to the rendered HTML of each page.
 *
 * Hooks onto template_redirect to start output buffering. When the buffer
 * flushes, the callback fetches all enabled corrections for this post/URL,
 * locates each target element with symfony/css-selector → DOMXPath, and
 * runs the typed transform.
 *
 * Fast-path: if no corrections exist for this page, buffering is never started.
 *
 * Note: results are not cached in Phase 2. Transient caching is Phase 3.
 * The DOM parse adds <20ms on a typical page; acceptable for now.
 */
class CorrectionEngine {

	public function __construct( private readonly CorrectionRepository $correction_repo ) {}

	public function register(): void {
		add_action( 'template_redirect', [ $this, 'maybe_start_buffering' ], 1 );
	}

	public function maybe_start_buffering(): void {
		// Skip admin, AJAX, REST, feed, and search result pages
		if (
			is_admin()
			|| wp_doing_ajax()
			|| ( defined( 'REST_REQUEST' ) && REST_REQUEST )
			|| is_feed()
			|| is_search()
		) {
			return;
		}

		// Global kill-switch: when fixes_enabled is false all corrections are bypassed.
		$settings = (array) get_option( 'trailproof_settings', [] );
		if ( ! ( $settings['fixes_enabled'] ?? true ) ) {
			return;
		}

		global $post;
		$post_id = is_a( $post, 'WP_Post' ) ? (int) $post->ID : 0;

		// Fast path: skip entirely if there are no enabled corrections for this page
		if ( ! $this->correction_repo->has_enabled_for( $post_id ) ) {
			return;
		}

		ob_start( [ $this, 'filter_output' ] );
	}

	/**
	 * Output buffer callback: receives the full rendered HTML, returns the corrected version.
	 */
	public function filter_output( string $html ): string {
		global $post;
		$post_id = is_a( $post, 'WP_Post' ) ? (int) $post->ID : 0;

		$corrections = $this->correction_repo->get_enabled_for( $post_id );
		if ( empty( $corrections ) ) {
			return $html;
		}

		return $this->apply_corrections( $html, $corrections );
	}

	/**
	 * Parse HTML, apply all corrections, and return the result.
	 * Public so it can be called directly in tests and from WP-CLI.
	 *
	 * @param array<int, array> $corrections Rows from tp_corrections.
	 */
	public function apply_corrections( string $html, array $corrections ): string {
		if ( empty( trim( $html ) ) || empty( $corrections ) ) {
			return $html;
		}

		$dom = new DOMDocument();
		libxml_use_internal_errors( true );
		$dom->loadHTML( '<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR );
		libxml_clear_errors();

		$xpath     = new DOMXPath( $dom );
		$converter = new CssSelectorConverter();
		$changed   = false;

		foreach ( $corrections as $correction ) {
			$type     = $correction['transform_type'] ?? '';
			$selector = $correction['selector'] ?? '';
			$payload  = json_decode( $correction['payload_json'] ?? '{}', true ) ?: [];

			if ( ! $type || ! $selector ) {
				continue;
			}

			try {
				$transform = TransformFactory::create( $type );
			} catch ( \InvalidArgumentException ) {
				continue;
			}

			try {
				$xpath_expr = $converter->toXPath( $selector );
				$nodes      = $xpath->query( $xpath_expr );
			} catch ( \Exception ) {
				continue;
			}

			$element = ( $nodes && $nodes->length > 0 ) ? $nodes->item( 0 ) : null;

			// DOMNode → DOMElement cast safety
			if ( $element !== null && ! ( $element instanceof \DOMElement ) ) {
				continue;
			}

			try {
				if ( $transform->apply( $dom, $element, $payload ) ) {
					$changed = true;
				}
			} catch ( \Exception ) {
				// Transform failure must never break the page
				continue;
			}
		}

		if ( ! $changed ) {
			return $html;
		}

		$result = $dom->saveHTML();
		return $result !== false ? $result : $html;
	}
}
