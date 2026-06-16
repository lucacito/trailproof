<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Issue\HealthScore;
use Trailproof\Report\AccessibilityStatement;
use Trailproof\Repository\ClientTokenRepository;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

class ClientPortalRoutes {

	public function __construct(
		private readonly ClientTokenRepository $token_repo,
		private readonly IssueRepository       $issue_repo,
		private readonly ScanRepository        $scan_repo,
		private readonly DecisionLogRepository  $log_repo
	) {}

	public function register( string $namespace ): void {
		// Public token-gated endpoints
		register_rest_route(
			$namespace,
			'/portal/(?P<token>[a-f0-9]{64})/dashboard',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_dashboard' ],
				'permission_callback' => '__return_true',
				'args'                => [
					'token' => [
						'validate_callback' => fn( $v ) => (bool) preg_match( '/^[a-f0-9]{64}$/', $v ),
					],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/portal/(?P<token>[a-f0-9]{64})/statement',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_statement' ],
				'permission_callback' => '__return_true',
				'args'                => [
					'token' => [
						'validate_callback' => fn( $v ) => (bool) preg_match( '/^[a-f0-9]{64}$/', $v ),
					],
				],
			]
		);

		// Admin token management endpoints
		register_rest_route(
			$namespace,
			'/client-tokens',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'list_tokens' ],
					'permission_callback' => [ $this, 'require_admin' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create_token' ],
					'permission_callback' => [ $this, 'require_admin' ],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/client-tokens/(?P<id>\d+)',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'revoke_token' ],
				'permission_callback' => [ $this, 'require_admin' ],
				'args'                => [
					'id' => [
						'validate_callback' => fn( $v ) => is_numeric( $v ) && (int) $v > 0,
					],
				],
			]
		);
	}

	public function get_dashboard( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$row = $this->token_repo->find( $request['token'] );
		if ( ! $row ) {
			return new \WP_Error( 'invalid_token', 'Invalid or expired token.', [ 'status' => 403 ] );
		}

		$unique_total     = $this->issue_repo->count_unique_total();
		$unique_addressed = $this->issue_repo->count_unique_addressed();
		$health_score     = HealthScore::compute( $this->issue_repo, $this->log_repo );

		return new \WP_REST_Response( [
			'site_name'    => get_bloginfo( 'name' ),
			'site_url'     => home_url(),
			'health_score' => [
				'score' => $health_score['score'],
				'band'  => $health_score['band'],
			],
			'progress_pct' => $unique_total > 0
				? (int) round( ( $unique_addressed / $unique_total ) * 100 )
				: 0,
			'by_bucket'    => $this->issue_repo->count_by_bucket(),
			'by_status'    => $this->issue_repo->count_by_status(),
			'last_scan_at' => $this->scan_repo->get_last_scan_at(),
			'generated_at' => gmdate( 'c' ),
		], 200 );
	}

	public function get_statement( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$row = $this->token_repo->find( $request['token'] );
		if ( ! $row ) {
			return new \WP_Error( 'invalid_token', 'Invalid or expired token.', [ 'status' => 403 ] );
		}

		$generator = new AccessibilityStatement( $this->scan_repo, $this->issue_repo );
		$html      = $generator->generate();

		return new \WP_REST_Response( [ 'html' => $html ], 200 );
	}

	public function list_tokens( \WP_REST_Request $request ): \WP_REST_Response {
		$tokens = $this->token_repo->list();
		$rest   = rest_url( 'trailproof/v1/portal/' );

		return new \WP_REST_Response( array_map( function ( $row ) use ( $rest ) {
			return [
				'id'         => (int) $row['id'],
				'label'      => $row['label'],
				'expires_at' => $row['expires_at'],
				'revoked'    => (bool) $row['revoked'],
				'created_at' => $row['created_at'],
				'portal_url' => $rest . $row['token'] . '/dashboard',
			];
		}, $tokens ), 200 );
	}

	public function create_token( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$label      = sanitize_text_field( $request->get_param( 'label' ) ?? '' );
		$expires_at = sanitize_text_field( $request->get_param( 'expires_at' ) ?? '' );

		if ( $label === '' ) {
			return new \WP_Error( 'missing_label', 'A label is required.', [ 'status' => 400 ] );
		}

		$expires = ( $expires_at !== '' ) ? $expires_at : null;
		$token   = $this->token_repo->create( $label, $expires, (int) get_current_user_id() );

		return new \WP_REST_Response( [
			'token'      => $token,
			'portal_url' => rest_url( 'trailproof/v1/portal/' ) . $token . '/dashboard',
		], 201 );
	}

	public function revoke_token( \WP_REST_Request $request ): \WP_REST_Response {
		$this->token_repo->revoke( (int) $request['id'] );
		return new \WP_REST_Response( [ 'revoked' => true ], 200 );
	}

	public function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}
}
