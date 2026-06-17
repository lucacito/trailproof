<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;

class IssueRoutes {

	public function __construct(
		private readonly IssueRepository       $issue_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		// Grouped view — one row per problem type
		register_rest_route(
			$namespace,
			'/issues/grouped',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'list_grouped' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'bucket'    => [ 'type' => 'string', 'enum' => [ 'A', 'B', 'C' ] ],
					'only_open' => [ 'type' => 'boolean', 'default' => true ],
					'per_page'  => [ 'type' => 'integer', 'minimum' => 1, 'maximum' => 200, 'default' => 50 ],
				],
			]
		);

		// Flat individual-row view (used for per-page fix actions)
		register_rest_route(
			$namespace,
			'/issues',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'list_issues' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'bucket'   => [ 'type' => 'string', 'enum' => [ 'A', 'B', 'C' ] ],
					'status'   => [ 'type' => 'string', 'enum' => [ 'open', 'fixed', 'deferred', 'na', 'regressed' ] ],
					'scan_id'  => [ 'type' => 'integer', 'minimum' => 1 ],
					'rule_id'  => [ 'type' => 'string' ],
					'wcag_sc'  => [ 'type' => 'string' ],
					'per_page' => [ 'type' => 'integer', 'minimum' => 1, 'maximum' => 200, 'default' => 100 ],
					'page'     => [ 'type' => 'integer', 'minimum' => 1, 'default' => 1 ],
				],
			]
		);

		// Single issue detail
		register_rest_route(
			$namespace,
			'/issues/(?P<id>\d+)',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_issue' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'id' => [ 'type' => 'integer', 'required' => true, 'minimum' => 1 ],
				],
			]
		);

		// Decision history for a single issue (by fingerprint)
		register_rest_route(
			$namespace,
			'/issues/(?P<id>\d+)/history',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_history' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'id' => [ 'type' => 'integer', 'required' => true, 'minimum' => 1 ],
				],
			]
		);
	}

	public function list_grouped( \WP_REST_Request $request ): \WP_REST_Response {
		$filters = array_filter( [
			'bucket'    => $request->get_param( 'bucket' ),
			'only_open' => $request->get_param( 'only_open' ),
		], fn( $v ) => $v !== null );

		$groups = $this->issue_repo->get_grouped_by_rule(
			$filters,
			(int) $request->get_param( 'per_page' )
		);

		return new \WP_REST_Response( $groups, 200 );
	}

	public function list_issues( \WP_REST_Request $request ): \WP_REST_Response {
		$per_page = (int) $request->get_param( 'per_page' );
		$page     = (int) $request->get_param( 'page' );
		$offset   = ( $page - 1 ) * $per_page;

		$filters = array_filter( [
			'bucket'  => $request->get_param( 'bucket' ),
			'status'  => $request->get_param( 'status' ),
			'scan_id' => $request->get_param( 'scan_id' ),
			'rule_id' => $request->get_param( 'rule_id' ),
			'wcag_sc' => $request->get_param( 'wcag_sc' ),
		] );

		$issues = $this->issue_repo->get_list( $filters, $per_page, $offset );

		return new \WP_REST_Response( $issues, 200 );
	}

	public function get_issue( \WP_REST_Request $request ): \WP_REST_Response {
		$id    = (int) $request->get_param( 'id' );
		$issue = $this->issue_repo->get_by_id( $id );

		if ( ! $issue ) {
			return new \WP_REST_Response( [ 'error' => 'Issue not found.' ], 404 );
		}

		return new \WP_REST_Response( $issue, 200 );
	}

	public function get_history( \WP_REST_Request $request ): \WP_REST_Response {
		$id    = (int) $request->get_param( 'id' );
		$issue = $this->issue_repo->get_by_id( $id );

		if ( ! $issue ) {
			return new \WP_REST_Response( [ 'error' => 'Issue not found.' ], 404 );
		}

		$entries = $this->log_repo->get_by_fingerprint( $issue['fingerprint'] );

		return new \WP_REST_Response( $entries, 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
