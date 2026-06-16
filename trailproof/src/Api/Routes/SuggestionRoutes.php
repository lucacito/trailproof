<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Ai\SuggestionService;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;

class SuggestionRoutes {

	public function __construct(
		private readonly IssueRepository      $issue_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/issues/(?P<id>\d+)/suggest',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'suggest' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'id' => [
						'validate_callback' => fn( $v ) => is_numeric( $v ) && (int) $v > 0,
					],
				],
			]
		);
	}

	public function suggest( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$settings   = (array) get_option( 'trailproof_settings', [] );
		$api_key    = $settings['claude_api_key'] ?? '';

		if ( $api_key === '' ) {
			return new \WP_Error( 'ai_unavailable', 'Claude API key not configured.', [ 'status' => 503 ] );
		}

		$issue = $this->issue_repo->get_by_id( (int) $request['id'] );
		if ( ! $issue ) {
			return new \WP_Error( 'not_found', 'Issue not found.', [ 'status' => 404 ] );
		}

		$node_data_raw = $issue['node_data_json'] ?? '';
		$node_data     = ( $node_data_raw !== '' ) ? json_decode( $node_data_raw, true ) : [];
		if ( ! is_array( $node_data ) ) {
			$node_data = [];
		}

		try {
			$service    = new SuggestionService( $api_key );
			$suggestion = $service->suggest( $issue, $node_data );
		} catch ( \RuntimeException $e ) {
			return new \WP_Error( 'ai_unavailable', $e->getMessage(), [ 'status' => 503 ] );
		}

		$this->log_repo->log(
			'suggestion_generated',
			$issue['fingerprint'],
			[ 'rule_id' => $issue['rule_id'], 'node_data' => $node_data ],
			[ 'suggestion' => $suggestion ]
		);

		return new \WP_REST_Response( [ 'suggestion' => $suggestion ], 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
