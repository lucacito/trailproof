<?php

declare(strict_types=1);

namespace Trailproof\Repository;

// Custom plugin table; direct queries are required and caching not appropriate for scan records.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

class ScanRepository {

	public function create( string $url, int $post_id, string $provider ): int {
		global $wpdb;

		$wpdb->insert(
			$wpdb->prefix . 'tp_scans',
			[
				'url'        => $url,
				'post_id'    => $post_id ?: null,
				'provider'   => $provider,
				'created_at' => current_time( 'mysql' ),
			],
			[ '%s', '%d', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function update_score( int $scan_id, int $score, array $summary ): void {
		global $wpdb;

		$wpdb->update(
			$wpdb->prefix . 'tp_scans',
			[
				'score'        => max( 0, min( 100, $score ) ),
				'summary_json' => wp_json_encode( $summary ),
			],
			[ 'id' => $scan_id ],
			[ '%d', '%s' ],
			[ '%d' ]
		);
	}

	public function get_by_id( int $id ): ?array {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tp_scans WHERE id = %d", $id ),
			ARRAY_A
		);

		return $row ?: null;
	}

	public function get_recent( int $limit = 20 ): array {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_scans ORDER BY created_at DESC LIMIT %d",
				$limit
			),
			ARRAY_A
		);
	}

	public function clear_all(): int {
		global $wpdb;
		return (int) $wpdb->query( "DELETE FROM {$wpdb->prefix}tp_scans" );
	}

	public function get_last_scan_at(): ?string {
		global $wpdb;

		return $wpdb->get_var(
			"SELECT created_at FROM {$wpdb->prefix}tp_scans ORDER BY created_at DESC LIMIT 1"
		);
	}
}
