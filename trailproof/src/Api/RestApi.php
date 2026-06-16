<?php

declare(strict_types=1);

namespace Trailproof\Api;

use Trailproof\Api\Routes\ChecklistRoutes;
use Trailproof\Api\Routes\CorrectionRoutes;
use Trailproof\Api\Routes\DashboardRoutes;
use Trailproof\Api\Routes\DecisionRoutes;
use Trailproof\Api\Routes\IssueRoutes;
use Trailproof\Api\Routes\PageRoutes;
use Trailproof\Api\Routes\ReportRoutes;
use Trailproof\Api\Routes\ScanRoutes;
use Trailproof\Repository\CorrectionRepository;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;
use Trailproof\Scan\ScanRunner;
use Trailproof\Scan\WaveProvider;

class RestApi {

	public const REST_NAMESPACE = 'trailproof/v1';

	public function register_routes(): void {
		$scan_repo    = new ScanRepository();
		$issue_repo   = new IssueRepository();
		$corr_repo    = new CorrectionRepository();
		$log_repo     = new DecisionLogRepository();

		// Wire WAVE provider into runner if API key is configured
		$settings = (array) get_option( 'trailproof_settings', [] );
		$wave_key = $settings['wave_api_key'] ?? '';
		$runner   = new ScanRunner();
		if ( $wave_key !== '' ) {
			$runner->register_provider( new WaveProvider( $scan_repo, $issue_repo, $wave_key ) );
		}

		// Status stub kept for quick health checks / CI pings
		register_rest_route(
			self::REST_NAMESPACE,
			'/status',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_status' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);

		( new PageRoutes( $runner ) )->register( self::REST_NAMESPACE );
		( new ScanRoutes( $scan_repo, $issue_repo ) )->register( self::REST_NAMESPACE );
		( new IssueRoutes( $issue_repo, $log_repo ) )->register( self::REST_NAMESPACE );
		( new DashboardRoutes( $scan_repo, $issue_repo ) )->register( self::REST_NAMESPACE );
		( new CorrectionRoutes( $corr_repo, $issue_repo, $log_repo ) )->register( self::REST_NAMESPACE );
		( new DecisionRoutes( $issue_repo, $corr_repo, $log_repo ) )->register( self::REST_NAMESPACE );
		( new ChecklistRoutes( $log_repo ) )->register( self::REST_NAMESPACE );
		( new ReportRoutes( $issue_repo, $scan_repo, $log_repo ) )->register( self::REST_NAMESPACE );
	}

	public function get_status( \WP_REST_Request $request ): \WP_REST_Response {
		$settings = (array) get_option( 'trailproof_settings', [] );
		return new \WP_REST_Response( [
			'version'        => TRAILPROOF_VERSION,
			'schema_version' => \Trailproof\Schema::get_schema_version(),
			'status'         => 'ok',
			'wave_enabled'   => ! empty( $settings['wave_api_key'] ),
		], 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
