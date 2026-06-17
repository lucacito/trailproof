<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Admin\SettingsPage;

class SettingsRoutes {

	public function __construct( private readonly SettingsPage $settings_page ) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/settings',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_settings' ],
					'permission_callback' => [ $this, 'require_admin' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update_settings' ],
					'permission_callback' => [ $this, 'require_admin' ],
				],
			]
		);
	}

	public function get_settings( \WP_REST_Request $request ): \WP_REST_Response {
		$s = $this->settings_page->get_settings();
		return new \WP_REST_Response( [
			'fixes_enabled'        => (bool) ( $s['fixes_enabled'] ?? true ),
			'scan_schedule'        => $s['scan_schedule'] ?? 'weekly',
			'white_label'          => (bool) ( $s['white_label'] ?? false ),
			'notify_on_regression' => (bool) ( $s['notify_on_regression'] ?? true ),
			'notification_email'   => $s['notification_email'] ?? '',
			'wave_enabled'         => ! empty( $s['wave_api_key'] ),
			'claude_enabled'       => ! empty( $s['claude_api_key'] ),
		], 200 );
	}

	public function update_settings( \WP_REST_Request $request ): \WP_REST_Response {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid request body' ], 400 );
		}

		$current = (array) get_option( 'trailproof_settings', [] );

		if ( array_key_exists( 'fixes_enabled', $body ) ) {
			$current['fixes_enabled'] = (bool) $body['fixes_enabled'];
		}
		if ( isset( $body['scan_schedule'] ) && in_array( $body['scan_schedule'], [ 'off', 'daily', 'weekly', 'monthly' ], true ) ) {
			$current['scan_schedule'] = $body['scan_schedule'];
		}
		if ( array_key_exists( 'notify_on_regression', $body ) ) {
			$current['notify_on_regression'] = (bool) $body['notify_on_regression'];
		}
		if ( array_key_exists( 'notification_email', $body ) ) {
			$current['notification_email'] = sanitize_email( (string) $body['notification_email'] );
		}

		update_option( 'trailproof_settings', $current );

		return $this->get_settings( $request );
	}

	public function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}
}
