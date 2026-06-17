<?php

declare(strict_types=1);

namespace Trailproof\Integrations\Divi;

// Direct DB queries against wp_posts are required; caching not appropriate here.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

/**
 * Detects whether Divi (theme or builder plugin) is active on this installation,
 * and which Divi module types appear in published post content.
 *
 * Detection strategy mirrors DiviEditorPrevention: ET_BUILDER_VERSION constant
 * is defined by both the Divi theme (≥ 4.0) and the Divi Builder plugin.
 * et_setup_theme() is registered by the Divi theme loader.
 *
 * Module scanning searches wp_posts for Divi 4 shortcode markers
 * ([et_pb_accordion) and Divi 5 block-JSON markers ("type":"et_pb_accordion").
 * Results are transient-cached for 1 hour to avoid repeated table scans.
 */
class DiviDetector {

	private const CACHE_KEY = 'trailproof_divi_modules_detected';
	private const CACHE_TTL = HOUR_IN_SECONDS;

	public function is_active(): bool {
		return defined( 'ET_BUILDER_VERSION' ) || function_exists( 'et_setup_theme' );
	}

	public function get_version(): ?string {
		if ( defined( 'ET_BUILDER_VERSION' ) ) {
			return ET_BUILDER_VERSION;
		}
		if ( defined( 'ET_THEME_VERSION' ) ) {
			return ET_THEME_VERSION;
		}
		return null;
	}

	public function get_major_version(): int {
		$v = $this->get_version();
		if ( $v === null ) {
			return 0;
		}
		return (int) explode( '.', $v )[0];
	}

	/**
	 * Returns an array of module keys that appear in published posts.
	 * Example: [ 'accordion' => 4, 'tabs' => 2, 'menu' => 6 ]
	 */
	public function detect_modules_in_content(): array {
		$cached = get_transient( self::CACHE_KEY );
		if ( $cached !== false ) {
			return $cached;
		}

		$found   = [];
		$modules = DiviModuleRegistry::get_modules();

		global $wpdb;

		foreach ( $modules as $key => $module ) {
			$class = $module['css_class'];

			// Divi 4 shortcode format: [et_pb_accordion
			$shortcode_count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->posts}
					 WHERE post_status = 'publish'
					 AND post_content LIKE %s",
					'%[' . $wpdb->esc_like( $class ) . '%'
				)
			);

			// Divi 5 block-JSON format: "type":"et_pb_accordion"
			$block_count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->posts}
					 WHERE post_status = 'publish'
					 AND post_content LIKE %s",
					'%"type":"' . $wpdb->esc_like( $class ) . '"%'
				)
			);

			$total = $shortcode_count + $block_count;
			if ( $total > 0 ) {
				$found[ $key ] = $total;
			}
		}

		set_transient( self::CACHE_KEY, $found, self::CACHE_TTL );
		return $found;
	}

	/** Bust the module-detection cache (call after content changes). */
	public function bust_cache(): void {
		delete_transient( self::CACHE_KEY );
	}
}
