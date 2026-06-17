<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Integrations\Divi\DiviAnalysisService;
use Trailproof\Integrations\Divi\DiviDetector;

class DiviRoutes {

	public function __construct( private readonly DiviAnalysisService $analysis ) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/divi/analysis',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_analysis' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);

		// Allows the React page to bust the module-detection cache after content changes.
		register_rest_route(
			$namespace,
			'/divi/analysis/refresh',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'refresh_analysis' ],
				'permission_callback' => [ $this, 'require_admin' ],
			]
		);

		register_rest_route(
			$namespace,
			'/divi/report',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_report' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_analysis( \WP_REST_Request $request ): \WP_REST_Response {
		return new \WP_REST_Response( $this->analysis->get_analysis(), 200 );
	}

	public function refresh_analysis( \WP_REST_Request $request ): \WP_REST_Response {
		( new DiviDetector() )->bust_cache();
		return new \WP_REST_Response( $this->analysis->get_analysis(), 200 );
	}

	public function get_report( \WP_REST_Request $request ): \WP_REST_Response {
		$analysis = $this->analysis->get_analysis();

		$report = [
			'generated_at'            => current_time( 'c' ),
			'site_url'                => get_site_url(),
			'site_name'               => get_bloginfo( 'name' ),
			'divi_active'             => $analysis['divi_active'],
			'divi_version'            => $analysis['divi_version'],
			'score'                   => $analysis['score'],
			'modules_analyzed'        => $analysis['modules_analyzed'],
			'automatic_enhancements'  => $analysis['modules_optimized'],
			'manual_recommendations'  => $analysis['modules_needs_review'],
			'modules'                 => array_map(
				fn( $m ) => [
					'label'        => $m['label'],
					'status'       => $m['status'],
					'enhancements' => $m['enhancements'],
				],
				$analysis['modules']
			),
		];

		return new \WP_REST_Response( $report, 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}

	public function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}
}
