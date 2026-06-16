<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Issue\ChecklistItems;
use Trailproof\Repository\DecisionLogRepository;

/**
 * GET  /checklist        — return all Bucket C items with current sign-off status per item
 * POST /checklist/signoff — log a sign-off (or un-sign-off) for a specific checklist item
 */
class ChecklistRoutes {

	// Prefix used to namespace checklist entries in tp_decisions_log
	private const LOG_ACTION_PREFIX = 'checklist_';

	public function __construct( private readonly DecisionLogRepository $log_repo ) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/checklist',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_checklist' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);

		register_rest_route(
			$namespace,
			'/checklist/signoff',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'sign_off' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_checklist( \WP_REST_Request $request ): \WP_REST_Response {
		$items = ChecklistItems::all();

		// Retrieve the latest sign-off log entry keyed by fingerprint for each item.
		// Checklist items use fingerprint = 'checklist:{item_key}' as their log key.
		$latest_logs = $this->log_repo->get_latest_per_fingerprint( self::LOG_ACTION_PREFIX );

		$result = [];
		foreach ( $items as $key => $item ) {
			$fp    = 'checklist:' . $key;
			$entry = $latest_logs[ $fp ] ?? null;

			$result[] = array_merge(
				[ 'key' => $key ],
				$item,
				[
					'status'     => $this->status_from_log( $entry ),
					'note'       => $entry ? $entry['note'] : '',
					'decided_at' => $entry ? $entry['ts'] : null,
					'decided_by' => $entry ? (int) $entry['user_id'] : null,
				]
			);
		}

		return new \WP_REST_Response( $result, 200 );
	}

	public function sign_off( \WP_REST_Request $request ): \WP_REST_Response {
		$params = $request->get_json_params();

		$item_key = sanitize_key( $params['item_key'] ?? '' );
		$status   = sanitize_key( $params['status'] ?? '' );
		$note     = sanitize_text_field( $params['note'] ?? '' );

		$valid_statuses = [ 'pass', 'fail', 'na', 'defer', 'pending' ];

		if ( ! $item_key || ! array_key_exists( $item_key, ChecklistItems::all() ) ) {
			return new \WP_REST_Response( [ 'error' => 'Unknown checklist item key.' ], 400 );
		}

		if ( ! in_array( $status, $valid_statuses, true ) ) {
			return new \WP_REST_Response(
				[ 'error' => 'status must be one of: pass, fail, na, defer, pending.' ],
				400
			);
		}

		$fp     = 'checklist:' . $item_key;
		$action = self::LOG_ACTION_PREFIX . $status;  // e.g. checklist_pass, checklist_fail

		$log_id = $this->log_repo->log(
			$action,
			$fp,
			null,
			[ 'item_key' => $item_key, 'status' => $status ],
			$note
		);

		return new \WP_REST_Response( [ 'ok' => true, 'log_id' => $log_id, 'status' => $status ], 200 );
	}

	private function status_from_log( ?array $log_entry ): string {
		if ( ! $log_entry ) {
			return 'pending';
		}
		// action is 'checklist_{status}'
		$action = $log_entry['action'] ?? '';
		$suffix = substr( $action, strlen( self::LOG_ACTION_PREFIX ) );
		$valid  = [ 'pass', 'fail', 'na', 'defer', 'pending' ];
		return in_array( $suffix, $valid, true ) ? $suffix : 'pending';
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
