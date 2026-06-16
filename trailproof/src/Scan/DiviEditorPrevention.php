<?php

declare(strict_types=1);

namespace Trailproof\Scan;

/**
 * Enqueues the Divi editor prevention script when the Divi 5 Visual Builder is active.
 *
 * The script uses MutationObserver to watch the builder DOM. When a module settings
 * panel opens it inspects the relevant form fields and surfaces inline accessibility
 * nudges: missing alt text on image modules, skipped heading levels, and contrast
 * values that appear to be below the 4.5:1 threshold.
 *
 * Detection strategy:
 *  - Divi 5 builder is active when et_fb_is_enabled() returns true (frontend builder).
 *  - The Divi 5 admin Visual Builder (VB) loads on post-edit screens when the
 *    "Use Divi Builder" button has been clicked; ET_Builder defines the constant
 *    ET_BUILDER_VERSION >= 5.0 and registers et_core hooks.
 *
 * We only enqueue on pages where the builder is actually active to avoid interfering
 * with any other admin screen.
 */
class DiviEditorPrevention {

	public function register(): void {
		// Frontend Visual Builder
		add_action( 'wp_enqueue_scripts', [ $this, 'maybe_enqueue_frontend' ] );

		// Backend VB (post edit screen with Divi builder active)
		add_action( 'admin_enqueue_scripts', [ $this, 'maybe_enqueue_backend' ] );
	}

	public function maybe_enqueue_frontend(): void {
		if ( ! $this->is_divi_active() ) {
			return;
		}
		// et_fb_is_enabled() is true when the frontend builder is loaded for this request.
		if ( ! function_exists( 'et_fb_is_enabled' ) || ! et_fb_is_enabled() ) {
			return;
		}
		$this->enqueue();
	}

	public function maybe_enqueue_backend( string $hook ): void {
		if ( ! $this->is_divi_active() ) {
			return;
		}
		// Only on post edit screens that use the Divi builder.
		if ( ! in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) {
			return;
		}
		// Divi 5 admin builder is present when ET_Builder_Module is loaded and
		// the 'et_pb_use_builder' post meta is set.
		global $post;
		if ( ! $post || get_post_meta( $post->ID, '_et_pb_use_builder', true ) !== 'on' ) {
			return;
		}
		$this->enqueue();
	}

	private function enqueue(): void {
		$handle  = 'trailproof-divi-prevention';
		$src     = TRAILPROOF_URL . 'assets/admin/divi-editor-prevention.js';
		$version = TRAILPROOF_VERSION;

		wp_enqueue_script( $handle, $src, [], $version, true );

		// Pass the plugin URL for the nudge icon asset (if needed in future).
		wp_localize_script( $handle, 'trailproofDiviPrevention', [
			'pluginUrl' => TRAILPROOF_URL,
			'version'   => $version,
		] );
	}

	private function is_divi_active(): bool {
		return defined( 'ET_BUILDER_VERSION' ) || function_exists( 'et_setup_theme' );
	}
}
