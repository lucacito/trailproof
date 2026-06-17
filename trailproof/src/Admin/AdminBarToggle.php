<?php

declare(strict_types=1);

namespace Trailproof\Admin;

class AdminBarToggle {

	public function register(): void {
		add_action( 'admin_bar_menu',        [ $this, 'add_node' ], 999 );
		add_action( 'wp_enqueue_scripts',    [ $this, 'enqueue' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'wp_head',               [ $this, 'inline_styles' ] );
		add_action( 'admin_head',            [ $this, 'inline_styles' ] );
	}

	public function add_node( \WP_Admin_Bar $bar ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings = (array) get_option( 'trailproof_settings', [] );
		$enabled  = (bool) ( $settings['fixes_enabled'] ?? true );

		$bar->add_node( [
			'id'    => 'trailproof-toggle',
			'title' => sprintf(
				'<span class="tp-ab-wrap">
					<span class="tp-ab-icon" aria-hidden="true">%s</span>
					<span class="tp-ab-label">%s</span>
					<span class="tp-ab-pill tp-ab-pill--%s">%s</span>
				</span>',
				$enabled ? '&#128737;' : '&#9208;',
				esc_html__( 'TrailProof', 'trailproof' ),
				$enabled ? 'on' : 'off',
				$enabled ? esc_html__( 'ON', 'trailproof' ) : esc_html__( 'OFF', 'trailproof' )
			),
			// Fallback href (no-JS): goes to Remediation Settings page
			'href'  => admin_url( 'admin.php?page=trailproof#remediation' ),
			'meta'  => [
				'title' => $enabled
					? esc_attr__( 'TrailProof fixes are ON — click to disable', 'trailproof' )
					: esc_attr__( 'TrailProof fixes are OFF — click to enable', 'trailproof' ),
			],
		] );
	}

	public function enqueue(): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$nonce    = wp_create_nonce( 'wp_rest' );
		$rest_url = rest_url( 'trailproof/v1/settings' );

		// Piggyback on the always-present admin-bar script handle
		wp_add_inline_script( 'admin-bar', $this->build_script( $nonce, $rest_url ) );
	}

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
		#wp-admin-bar-trailproof-toggle .tp-ab-icon { font-size: 14px; }
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
		#wp-admin-bar-trailproof-toggle .tp-ab-pill--busy {
			background: #94A3B8;
			color: #fff;
			opacity: 0.6;
		}
		</style>
		<?php
	}

	private function build_script( string $nonce, string $rest_url ): string {
		$nonce_js    = esc_js( $nonce );
		$rest_url_js = esc_js( $rest_url );

		return <<<JS
(function () {
	var nonce   = '{$nonce_js}';
	var restUrl = '{$rest_url_js}';

	function init() {
		var link = document.querySelector('#wp-admin-bar-trailproof-toggle > .ab-item');
		if (!link) return;

		link.addEventListener('click', function (e) {
			e.preventDefault();

			var pill = link.querySelector('.tp-ab-pill');
			var icon = link.querySelector('.tp-ab-icon');
			var isOn = pill && pill.classList.contains('tp-ab-pill--on');
			var next = !isOn;

			// Optimistic update
			if (pill) {
				pill.className   = 'tp-ab-pill tp-ab-pill--busy';
				pill.textContent = '…';
			}

			fetch(restUrl, {
				method:  'PUT',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify({ fixes_enabled: next }),
			})
			.then(function (r) { return r.json(); })
			.then(function (data) {
				var actual = !!data.fixes_enabled;
				if (pill) {
					pill.className   = 'tp-ab-pill tp-ab-pill--' + (actual ? 'on' : 'off');
					pill.textContent = actual ? 'ON' : 'OFF';
				}
				if (icon) icon.textContent = actual ? '\u{1F6E1}' : '⏸';
				// Reload so the correction engine (server-side) picks up the new setting.
				window.location.reload();
			})
			.catch(function () {
				// Revert on failure
				if (pill) {
					pill.className   = 'tp-ab-pill tp-ab-pill--' + (isOn ? 'on' : 'off');
					pill.textContent = isOn ? 'ON' : 'OFF';
				}
				if (icon) icon.textContent = isOn ? '\u{1F6E1}' : '⏸';
			});
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
JS;
	}
}
