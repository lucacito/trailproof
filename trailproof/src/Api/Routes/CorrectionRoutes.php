<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Correction\TransformFactory;
use Trailproof\Repository\CorrectionRepository;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;

class CorrectionRoutes {

	public function __construct(
		private readonly CorrectionRepository  $correction_repo,
		private readonly IssueRepository       $issue_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/corrections',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'list_corrections' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create_correction' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/corrections/(?P<id>\d+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_correction' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
				[
					'methods'             => 'PATCH',
					'callback'            => [ $this, 'update_correction' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
			]
		);
	}

	public function list_corrections( \WP_REST_Request $request ): \WP_REST_Response {
		return new \WP_REST_Response( $this->correction_repo->get_list(), 200 );
	}

	public function get_correction( \WP_REST_Request $request ): \WP_REST_Response {
		$correction = $this->correction_repo->get_by_id( (int) $request->get_param( 'id' ) );
		if ( ! $correction ) {
			return new \WP_REST_Response( [ 'error' => 'Not found.' ], 404 );
		}
		return new \WP_REST_Response( $correction, 200 );
	}

	public function create_correction( \WP_REST_Request $request ): \WP_REST_Response {
		$params = $request->get_json_params();

		$fingerprint    = sanitize_text_field( $params['fingerprint'] ?? '' );
		$issue_id       = (int) ( $params['issue_id'] ?? 0 );
		$post_id        = (int) ( $params['post_id'] ?? 0 );
		$url            = esc_url_raw( $params['url'] ?? '' );
		$selector       = sanitize_text_field( $params['selector'] ?? '' );
		$transform_type = sanitize_key( $params['transform_type'] ?? '' );
		$payload        = is_array( $params['payload'] ?? null ) ? $params['payload'] : [];
		$original       = is_array( $params['original'] ?? null ) ? $params['original'] : [];
		$note           = sanitize_text_field( $params['note'] ?? '' );

		if ( ! $fingerprint || ! $selector || ! $transform_type ) {
			return new \WP_REST_Response( [ 'error' => 'fingerprint, selector, and transform_type are required.' ], 400 );
		}

		// Validate the transform type exists
		try {
			TransformFactory::create( $transform_type );
		} catch ( \InvalidArgumentException $e ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid transform_type.' ], 400 );
		}

		// Avoid duplicate rows: if an enabled correction already exists for this fingerprint,
		// update its payload rather than inserting another row.
		$existing = $this->correction_repo->get_first_enabled_by_fingerprint( $fingerprint );

		if ( $existing ) {
			$this->correction_repo->update_payload( (int) $existing['id'], $payload );
			$correction_id = (int) $existing['id'];
		} else {
			$correction_id = $this->correction_repo->create( [
				'fingerprint'    => $fingerprint,
				'post_id'        => $post_id,
				'url'            => $url,
				'selector'       => $selector,
				'transform_type' => $transform_type,
				'payload'        => $payload,
				'original'       => $original,
			] );
		}

		if ( ! $correction_id ) {
			return new \WP_REST_Response( [ 'error' => 'Failed to save correction.' ], 500 );
		}

		// Mark the issue as fixed and log the decision
		if ( $issue_id ) {
			$issue = $this->issue_repo->get_by_id( $issue_id );
			if ( $issue ) {
				$this->issue_repo->set_status( $issue_id, 'fixed' );
				$this->log_repo->log( 'apply_fix', $fingerprint, $original, $payload, $note );
			}
		}

		// For global CSS corrections (set_text_color), the same selector on every page is
		// fixed by a single injected rule — mark all matching issues fixed in one shot.
		if ( 'set_text_color' === $transform_type && $selector ) {
			$this->issue_repo->set_status_by_selector_and_rules(
				$selector,
				[ 'color-contrast', 'color-contrast-enhanced' ],
				'fixed'
			);
		}

		return new \WP_REST_Response( [ 'correction_id' => $correction_id ], 201 );
	}

	public function update_correction( \WP_REST_Request $request ): \WP_REST_Response {
		$id     = (int) $request->get_param( 'id' );
		$params = $request->get_json_params();

		$correction = $this->correction_repo->get_by_id( $id );
		if ( ! $correction ) {
			return new \WP_REST_Response( [ 'error' => 'Not found.' ], 404 );
		}

		// Toggle enabled (revert / re-enable)
		if ( isset( $params['enabled'] ) ) {
			$enabled = (bool) $params['enabled'];
			$this->correction_repo->set_enabled( $id, $enabled );

			$action = $enabled ? 'correction_enabled' : 'correction_reverted';
			$this->log_repo->log( $action, $correction['fingerprint'], null, [ 'enabled' => $enabled ] );

			// For global CSS corrections, bulk-sync every matching issue across all pages.
			if ( 'set_text_color' === ( $correction['transform_type'] ?? '' ) && ! empty( $correction['selector'] ) ) {
				$this->issue_repo->set_status_by_selector_and_rules(
					$correction['selector'],
					[ 'color-contrast', 'color-contrast-enhanced' ],
					$enabled ? 'fixed' : 'open'
				);
			} else {
				// For page-specific corrections, sync just the fingerprinted issue.
				$issue_id = $this->find_issue_id_by_fingerprint( $correction['fingerprint'] );
				if ( $issue_id ) {
					$this->issue_repo->set_status( $issue_id, $enabled ? 'fixed' : 'open' );
				}
			}
		}

		// Update payload (editing the correction value)
		if ( isset( $params['payload'] ) && is_array( $params['payload'] ) ) {
			$this->correction_repo->update_payload( $id, $params['payload'] );
			$this->log_repo->log( 'correction_updated', $correction['fingerprint'],
				json_decode( $correction['payload_json'], true ),
				$params['payload'],
				sanitize_text_field( $params['note'] ?? '' )
			);
		}

		return new \WP_REST_Response( [ 'ok' => true ], 200 );
	}

	private function find_issue_id_by_fingerprint( string $fingerprint ): int {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id FROM {$wpdb->prefix}tp_issues WHERE fingerprint = %s LIMIT 1",
				$fingerprint
			)
		);
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
