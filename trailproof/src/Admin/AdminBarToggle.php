<?php

declare(strict_types=1);

namespace Trailproof\Admin;

/**
 * Admin-bar toggle for TrailProof front-end preview.
 *
 * ON/OFF state is stored in localStorage ('tp_preview': omitted = on, 'off' = off).
 * Nothing is written to the database — this is a per-session, per-browser toggle.
 *
 * When toggled OFF the script adds the class 'trailproof-preview-off' to <body>,
 * which the inline CSS uses to hide TrailProof-injected elements (skip links,
 * sitewide style blocks). This lets the admin compare before/after without a reload.
 *
 * The actual fixes_enabled backend setting lives in Remediation Settings.
 */
class AdminBarToggle {

	private const LS_KEY = 'tp_preview'; // localStorage key — omitted | 'off'

	public function register(): void {
		add_action( 'admin_bar_menu',        [ $this, 'add_node' ], 999 );
		add_action( 'wp_enqueue_scripts',    [ $this, 'enqueue' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'wp_head',               [ $this, 'inline_styles' ] );
		add_action( 'admin_head',            [ $this, 'inline_styles' ] );
	}

	// ── Admin bar node ───────────────────────────────────────────────────────

	public function add_node( \WP_Admin_Bar $bar ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// JS updates the pill from localStorage on DOMContentLoaded.
		// PHP renders the "ON" default so there is no layout shift without JS.
		$bar->add_node( [
			'id'    => 'trailproof-toggle',
			'title' => sprintf(
				'<span class="tp-ab-wrap">
					<span class="tp-ab-label">%s</span>
					<span class="tp-ab-pill tp-ab-pill--on">ON</span>
				</span>',
				esc_html__( 'TrailProof', 'trailproof' )
			),
			'href' => '#',
			'meta' => [
				'title' => esc_attr__( 'Preview TrailProof with / without injected elements', 'trailproof' ),
			],
		] );
	}

	// ── Toggle script ────────────────────────────────────────────────────────

	public function enqueue(): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$ls_key = esc_js( self::LS_KEY );

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		wp_add_inline_script( 'admin-bar', $this->build_script( $ls_key ) );
	}

	private function build_script( string $ls_key ): string {
		return <<<JS
(function () {
	var LS_KEY = '{$ls_key}';

	function isOn() {
		try { return localStorage.getItem(LS_KEY) !== 'off'; } catch(e) { return true; }
	}

	function applyState(on) {
		var pill = document.querySelector('#wp-admin-bar-trailproof-toggle .tp-ab-pill');
		if (pill) {
			pill.className   = 'tp-ab-pill tp-ab-pill--' + (on ? 'on' : 'off');
			pill.textContent = on ? 'ON' : 'OFF';
		}
		if (document.body) document.body.classList.toggle('trailproof-preview-off', !on);
	}

	// Apply saved state once the admin bar is in the DOM
	document.addEventListener('DOMContentLoaded', function () {
		applyState(isOn());
	});

	// Use event delegation so we don't need to find the element at script-load time
	document.addEventListener('click', function (e) {
		var t = e.target;
		if (!t || typeof t.closest !== 'function') return;
		if (!t.closest('#wp-admin-bar-trailproof-toggle')) return;
		e.preventDefault();
		var next = !isOn();
		try {
			if (next) localStorage.removeItem(LS_KEY);
			else localStorage.setItem(LS_KEY, 'off');
		} catch(ex) {}
		applyState(next);
	});
})();
JS;
	}

	// ── Admin bar pill styles ────────────────────────────────────────────────

	public function inline_styles(): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<style>
		#wp-admin-bar-trailproof-toggle .tp-ab-wrap {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			line-height: 1;
		}
#wp-admin-bar-trailproof-toggle .tp-ab-pill {
			display: inline-block;
			font-size: 10px;
			font-weight: 700;
			letter-spacing: 0.04em;
			border-radius: 99px;
			padding: 1px 7px;
			line-height: 16px;
		}
		#wp-admin-bar-trailproof-toggle .tp-ab-pill--on  { background: #22C55E; color: #fff; }
		#wp-admin-bar-trailproof-toggle .tp-ab-pill--off { background: #94A3B8; color: #fff; }

		/* When preview is OFF, hide TrailProof-injected elements */
		body.trailproof-preview-off .tp-skip-link,
		body.trailproof-preview-off [data-trailproof] {
			display: none !important;
		}
		</style>
		<?php
	}
}
