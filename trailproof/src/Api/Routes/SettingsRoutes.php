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

		register_rest_route(
			$namespace,
			'/reset-data',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'reset_data' ],
				'permission_callback' => [ $this, 'require_admin' ],
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
			// Sitewide CSS enhancements
			'focus_style_enabled'    => (bool) ( $s['focus_style_enabled'] ?? false ),
			'focus_style_color'      => $s['focus_style_color'] ?? '#0066CC',
			'touch_target_enabled'   => (bool) ( $s['touch_target_enabled'] ?? false ),
			'reduced_motion_enabled' => (bool) ( $s['reduced_motion_enabled'] ?? false ),
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
		if ( array_key_exists( 'focus_style_enabled', $body ) ) {
			$current['focus_style_enabled'] = (bool) $body['focus_style_enabled'];
		}
		if ( array_key_exists( 'focus_style_color', $body ) ) {
			$current['focus_style_color'] = sanitize_hex_color( (string) $body['focus_style_color'] ) ?: '#0066CC';
		}
		if ( array_key_exists( 'touch_target_enabled', $body ) ) {
			$current['touch_target_enabled'] = (bool) $body['touch_target_enabled'];
		}
		if ( array_key_exists( 'reduced_motion_enabled', $body ) ) {
			$current['reduced_motion_enabled'] = (bool) $body['reduced_motion_enabled'];
		}

		update_option( 'trailproof_settings', $current );

		return $this->get_settings( $request );
	}

	public function reset_data( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		// Truncate scan data and corrections; leave tp_decisions_log (append-only audit trail).
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
		$wpdb->query( "TRUNCATE TABLE {$wpdb->prefix}tp_corrections" );
		$wpdb->query( "TRUNCATE TABLE {$wpdb->prefix}tp_issues" );
		$wpdb->query( "TRUNCATE TABLE {$wpdb->prefix}tp_scans" );
		// phpcs:enable

		return new \WP_REST_Response( [ 'reset' => true ], 200 );
	}

	public function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}
}
