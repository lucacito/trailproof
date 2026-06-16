<?php

declare(strict_types=1);

namespace Trailproof\Repository;

/**
 * Append-only write access to tp_decisions_log.
 * Never call UPDATE or DELETE on this table — it is the immutable evidence trail.
 */
class DecisionLogRepository {

	public function log( string $action, string $fingerprint, mixed $before, mixed $after, string $note = '' ): int {
		global $wpdb;

		$wpdb->insert(
			$wpdb->prefix . 'tp_decisions_log',
			[
				'ts'          => current_time( 'mysql' ),
				'user_id'     => (int) get_current_user_id(),
				'action'      => sanitize_key( $action ),
				'fingerprint' => $fingerprint,
				'before_json' => wp_json_encode( $before ),
				'after_json'  => wp_json_encode( $after ),
				'note'        => sanitize_text_field( $note ),
			],
			[ '%s', '%d', '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Retrieve the most recent log entry per fingerprint for a given action prefix.
	 * Used by the checklist to show current sign-off status per item.
	 */
	public function get_latest_per_fingerprint( string $action_prefix ): array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT l1.* FROM {$wpdb->prefix}tp_decisions_log l1
				 INNER JOIN (
				     SELECT fingerprint, MAX(id) AS max_id
				     FROM {$wpdb->prefix}tp_decisions_log
				     WHERE action LIKE %s
				     GROUP BY fingerprint
				 ) l2 ON l1.id = l2.max_id",
				$wpdb->esc_like( $action_prefix ) . '%'
			),
			ARRAY_A
		);

		$indexed = [];
		foreach ( $rows as $row ) {
			$indexed[ $row['fingerprint'] ] = $row;
		}
		return $indexed;
	}

	public function get_by_fingerprint( string $fingerprint, int $limit = 20 ): array {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_decisions_log WHERE fingerprint = %s ORDER BY ts DESC LIMIT %d",
				$fingerprint,
				$limit
			),
			ARRAY_A
		);
	}

	public function get_recent( int $limit = 50 ): array {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_decisions_log ORDER BY ts DESC LIMIT %d",
				$limit
			),
			ARRAY_A
		);
	}
}
