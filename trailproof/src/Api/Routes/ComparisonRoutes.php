<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

class ComparisonRoutes {

	private const OPTION_KEY = 'trailproof_comparison';

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/comparison',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_comparison' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update_comparison' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/comparison/reset',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'reset_comparison' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_comparison( \WP_REST_Request $request ): \WP_REST_Response {
		$data = (array) get_option( self::OPTION_KEY, [] );
		return new \WP_REST_Response( $this->normalize( $data ), 200 );
	}

	public function update_comparison( \WP_REST_Request $request ): \WP_REST_Response {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid request body' ], 400 );
		}

		$current = (array) get_option( self::OPTION_KEY, [] );
		$phase   = sanitize_text_field( $body['phase'] ?? '' );

		if ( $phase === 'before' ) {
			$current['before']                 = $this->sanitize_snapshot( $body['snapshot'] ?? [] );
			$current['before']['recorded_at']  = current_time( 'c' );
			$current['step']                   = 'before_recorded';
		} elseif ( $phase === 'after' ) {
			$current['after']                  = $this->sanitize_snapshot( $body['snapshot'] ?? [] );
			$current['after']['recorded_at']   = current_time( 'c' );
			$current['step']                   = 'after_recorded';
		}

		update_option( self::OPTION_KEY, $current );
		return new \WP_REST_Response( $this->normalize( $current ), 200 );
	}

	public function reset_comparison( \WP_REST_Request $request ): \WP_REST_Response {
		delete_option( self::OPTION_KEY );
		return new \WP_REST_Response( $this->normalize( [] ), 200 );
	}

	private function sanitize_snapshot( array $data ): array {
		return [
			'errors'     => max( 0, (int) ( $data['errors']     ?? 0 ) ),
			'warnings'   => max( 0, (int) ( $data['warnings']   ?? 0 ) ),
			'contrast'   => max( 0, (int) ( $data['contrast']   ?? 0 ) ),
			'navigation' => max( 0, (int) ( $data['navigation'] ?? 0 ) ),
			'images'     => max( 0, (int) ( $data['images']     ?? 0 ) ),
			'tool'       => sanitize_text_field( $data['tool']  ?? '' ),
		];
	}

	private function normalize( array $data ): array {
		return [
			'step'   => $data['step']   ?? 'start',
			'before' => $data['before'] ?? null,
			'after'  => $data['after']  ?? null,
		];
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
