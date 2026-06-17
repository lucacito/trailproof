<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Correction\TransformFactory;
use Trailproof\Issue\BucketClassifier;
use Trailproof\Repository\CorrectionRepository;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;

/**
 * POST /issues/{id}/decide — the core human decision endpoint for Bucket B issues.
 *
 * Actions:
 *   apply   — create a correction, mark issue fixed, log the decision
 *   na      — mark issue not-applicable, log the decision
 *   defer   — mark issue deferred, log the decision
 */
class DecisionRoutes {

	private const ALLOWED_ACTIONS = [ 'apply', 'na', 'defer' ];

	public function __construct(
		private readonly IssueRepository       $issue_repo,
		private readonly CorrectionRepository  $correction_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/issues/(?P<id>\d+)/decide',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'decide' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function decide( \WP_REST_Request $request ): \WP_REST_Response {
		$issue_id = (int) $request->get_param( 'id' );
		$params   = $request->get_json_params();

		$issue = $this->issue_repo->get_by_id( $issue_id );
		if ( ! $issue ) {
			return new \WP_REST_Response( [ 'error' => 'Issue not found.' ], 404 );
		}

		$action = sanitize_key( $params['action'] ?? '' );
		if ( ! in_array( $action, self::ALLOWED_ACTIONS, true ) ) {
			return new \WP_REST_Response( [ 'error' => 'action must be one of: apply, na, defer.' ], 400 );
		}

		$note        = sanitize_text_field( $params['note'] ?? '' );
		$fingerprint = $issue['fingerprint'];
		$bucket      = BucketClassifier::classify( $issue['rule_id'] );

		if ( 'apply' === $action ) {
			return $this->handle_apply( $issue, $params, $note, $fingerprint, $bucket );
		}

		// na or defer: just update status and log
		$status_map = [ 'na' => 'na', 'defer' => 'deferred' ];
		$new_status = $status_map[ $action ];

		$this->issue_repo->set_status( $issue_id, $new_status );
		$this->log_repo->log(
			'decision_' . $action,
			$fingerprint,
			[ 'status' => $issue['status'] ],
			[ 'status' => $new_status ],
			$note
		);

		return new \WP_REST_Response( [ 'ok' => true, 'new_status' => $new_status ], 200 );
	}

	private function handle_apply( array $issue, array $params, string $note, string $fingerprint, string $bucket ): \WP_REST_Response {
		$transform_type = sanitize_key( $params['transform_type'] ?? '' );
		$payload        = is_array( $params['payload'] ?? null ) ? $params['payload'] : [];

		if ( ! $transform_type ) {
			return new \WP_REST_Response( [ 'error' => 'transform_type is required when action is apply.' ], 400 );
		}

		// Validate transform type
		try {
			TransformFactory::create( $transform_type );
		} catch ( \InvalidArgumentException ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid transform_type.' ], 400 );
		}

		// Bucket B: human must supply payload; Bucket A: auto_payload may pre-fill
		if ( 'A' === $bucket && empty( $payload ) ) {
			$auto = TransformFactory::auto_payload( $transform_type, $issue['rule_id'] );
			if ( $auto !== null ) {
				$payload = $auto;
			}
		}

		$original = is_array( $params['original'] ?? null ) ? $params['original'] : [];

		// If a correction already exists for this fingerprint, update its payload rather than
		// inserting a duplicate row — this handles the "revise a previous decision" flow.
		$existing = $this->correction_repo->get_first_enabled_by_fingerprint( $fingerprint );

		if ( $existing ) {
			$this->correction_repo->update_payload( (int) $existing['id'], $payload );
			$correction_id = (int) $existing['id'];
		} else {
			$correction_id = $this->correction_repo->create( [
				'fingerprint'    => $fingerprint,
				'post_id'        => (int) $issue['post_id'],
				'url'            => $issue['url'],
				'selector'       => $issue['selector'],
				'transform_type' => $transform_type,
				'payload'        => $payload,
				'original'       => $original,
			] );
		}

		$this->issue_repo->set_status( (int) $issue['id'], 'fixed' );

		$this->log_repo->log(
			'decision_apply',
			$fingerprint,
			[
				'status'    => $issue['status'],
				'rule_id'   => $issue['rule_id'],
				'bucket'    => $bucket,
				'original'  => $original,
			],
			[
				'status'         => 'fixed',
				'transform_type' => $transform_type,
				'correction_id'  => $correction_id,
				'payload'        => $payload,
				'revised'        => (bool) $existing,
			],
			$note
		);

		return new \WP_REST_Response(
			[ 'ok' => true, 'new_status' => 'fixed', 'correction_id' => $correction_id ],
			201
		);
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
