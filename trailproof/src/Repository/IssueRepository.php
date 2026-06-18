<?php

declare(strict_types=1);

namespace Trailproof\Repository;

// Custom plugin tables require direct queries; caching not appropriate for live issue data.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

class IssueRepository {

	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'tp_issues';
	}

	/**
	 * Insert a new issue or update the existing one if the fingerprint already exists.
	 * If the existing issue was marked fixed and the same fingerprint reappears, it
	 * becomes 'regressed' — this is the regression-detection mechanism.
	 */
	public function upsert( array $data ): int {
		global $wpdb;

		$table    = $this->table();
		$provider = $data['provider'] ?? 'axe';

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter
		$existing = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, status, confirmed_by_json FROM $table WHERE fingerprint = %s",
				$data['fingerprint']
			),
			ARRAY_A
		);

		if ( $existing ) {
			$confirmed = json_decode( $existing['confirmed_by_json'] ?? '[]', true ) ?: [];
			if ( ! in_array( $provider, $confirmed, true ) ) {
				$confirmed[] = $provider;
			}
			$new_status = ( $existing['status'] === 'fixed' ) ? 'regressed' : $existing['status'];

			$wpdb->update(
				$table,
				[
					'scan_id'           => (int) $data['scan_id'],
					'bucket'            => $data['bucket'],
					'status'            => $new_status,
					'confirmed_by_json' => wp_json_encode( $confirmed ),
					'priority_score'    => (int) ( $data['priority_score'] ?? 50 ),
				],
				[ 'id' => (int) $existing['id'] ],
				[ '%d', '%s', '%s', '%s', '%d' ],
				[ '%d' ]
			);

			return (int) $existing['id'];
		}

		$node_data = $data['node_data_json'] ?? null;
		$wpdb->insert(
			$table,
			[
				'scan_id'           => (int) $data['scan_id'],
				'fingerprint'       => $data['fingerprint'],
				'url'               => $data['url'],
				'post_id'           => $data['post_id'] ?: null,
				'selector'          => $data['selector'],
				'rule_id'           => $data['rule_id'],
				'wcag_sc'           => $data['wcag_sc'] ?? null,
				'bucket'            => $data['bucket'],
				'severity'          => $data['severity'] ?? 'moderate',
				'priority_score'    => (int) ( $data['priority_score'] ?? 50 ),
				'status'            => 'open',
				'confirmed_by_json' => wp_json_encode( [ $provider ] ),
				'description'       => $data['description'] ?? null,
				'node_data_json'    => is_array( $node_data ) ? wp_json_encode( $node_data ) : $node_data,
			],
			[ '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function get_list( array $filters = [], int $limit = 100, int $offset = 0 ): array {
		global $wpdb;

		$table = $this->table();
		$where = [ '1=1' ];
		$args  = [];

		if ( ! empty( $filters['bucket'] ) ) {
			$where[] = 'bucket = %s';
			$args[]  = $filters['bucket'];
		}
		if ( ! empty( $filters['status'] ) ) {
			$where[] = 'status = %s';
			$args[]  = $filters['status'];
		}
		if ( isset( $filters['scan_id'] ) ) {
			$where[] = 'scan_id = %d';
			$args[]  = (int) $filters['scan_id'];
		}
		if ( ! empty( $filters['rule_id'] ) ) {
			$where[] = 'rule_id = %s';
			$args[]  = $filters['rule_id'];
		}
		if ( ! empty( $filters['wcag_sc'] ) ) {
			$where[] = 'wcag_sc = %s';
			$args[]  = $filters['wcag_sc'];
		}

		$where_sql = implode( ' AND ', $where );
		$args[]    = $limit;
		$args[]    = $offset;

		// $table is a prefixed constant; $where_sql is built from internal %s/%d placeholders only.
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, PluginCheck.Security.DirectDB.UnescapedDBParameter
		$rows = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table WHERE $where_sql ORDER BY priority_score DESC, created_at DESC LIMIT %d OFFSET %d",
				...$args
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, PluginCheck.Security.DirectDB.UnescapedDBParameter

		return array_map( [ $this, 'enrich_page_title' ], $rows );
	}

	public function count_by_bucket(): array {
		global $wpdb;

		$rows = (array) $wpdb->get_results(
			"SELECT bucket, COUNT(*) AS count
			 FROM {$wpdb->prefix}tp_issues
			 WHERE status NOT IN ('na', 'fixed')
			 GROUP BY bucket",
			ARRAY_A
		);

		$out = [ 'A' => 0, 'B' => 0, 'C' => 0 ];
		foreach ( $rows as $row ) {
			if ( isset( $out[ $row['bucket'] ] ) ) {
				$out[ $row['bucket'] ] = (int) $row['count'];
			}
		}
		return $out;
	}

	public function count_by_status(): array {
		global $wpdb;

		$rows = (array) $wpdb->get_results(
			"SELECT status, COUNT(*) AS count FROM {$wpdb->prefix}tp_issues GROUP BY status",
			ARRAY_A
		);

		$out = [];
		foreach ( $rows as $row ) {
			$out[ $row['status'] ] = (int) $row['count'];
		}
		return $out;
	}

	public function get_top_priority( int $limit = 5 ): array {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_issues
				 WHERE status = 'open'
				 ORDER BY priority_score DESC, created_at DESC
				 LIMIT %d",
				$limit
			),
			ARRAY_A
		);
	}

	public function get_by_id( int $id ): ?array {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tp_issues WHERE id = %d", $id ),
			ARRAY_A
		);

		return $row ? $this->enrich_page_title( $row ) : null;
	}

	private function enrich_page_title( array $row ): array {
		// Header/footer scope: synthetic URLs written by the client-side scan.
		if ( ! empty( $row['url'] ) ) {
			$qs = wp_parse_url( $row['url'], PHP_URL_QUERY ) ?? '';
			if ( $qs ) {
				parse_str( $qs, $qp );
				$zone = $qp['trailproof_zone'] ?? '';
				if ( $zone === 'header' ) {
					$row['page_title'] = __( 'Site Header', 'trailproof' );
					return $row;
				}
				if ( $zone === 'footer' ) {
					$row['page_title'] = __( 'Site Footer', 'trailproof' );
					return $row;
				}
			}
		}

		$post_id = (int) ( $row['post_id'] ?? 0 );

		// If post_id wasn't stored (common when scanned via "ugly" permalinks like /?page_id=11),
		// try to extract it from the URL query string.
		if ( ! $post_id && ! empty( $row['url'] ) ) {
			$query = wp_parse_url( $row['url'], PHP_URL_QUERY );
			if ( $query ) {
				parse_str( $query, $qp );
				$post_id = (int) ( $qp['page_id'] ?? $qp['p'] ?? $qp['post_id'] ?? 0 );
			}
		}

		$row['page_title'] = $post_id ? (string) get_the_title( $post_id ) : '';
		return $row;
	}

	/**
	 * Mark all open/regressed issues for a rule on a specific page as fixed.
	 * Called when a scan confirms the rule passes — i.e. the problem is no longer present.
	 */
	public function mark_passed( string $rule_id, int $post_id, string $url ): void {
		global $wpdb;

		// Match by post_id when available; fall back to url for post_id=0 cases.
		if ( $post_id > 0 ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$wpdb->prefix}tp_issues
					 SET status = 'fixed'
					 WHERE rule_id = %s AND post_id = %d AND status IN ('open','regressed')",
					$rule_id,
					$post_id
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$wpdb->prefix}tp_issues
					 SET status = 'fixed'
					 WHERE rule_id = %s AND url = %s AND status IN ('open','regressed')",
					$rule_id,
					$url
				)
			);
		}
	}

	public function set_status( int $id, string $status ): void {
		global $wpdb;

		$wpdb->update(
			$wpdb->prefix . 'tp_issues',
			[ 'status' => $status ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);
	}

	/**
	 * Bulk-update status for every issue that shares the same CSS selector and rule type.
	 * Used when a global CSS correction (e.g. set_text_color) is applied or reverted:
	 * the same footer/header element on every page gets fixed/reverted in one pass.
	 */
	public function set_status_by_selector_and_rules( string $selector, array $rule_ids, string $status ): void {
		global $wpdb;

		if ( empty( $rule_ids ) || '' === $selector ) {
			return;
		}

		$placeholders = implode( ',', array_fill( 0, count( $rule_ids ), '%s' ) );

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}tp_issues
				 SET status = %s, updated_at = %s
				 WHERE selector = %s AND rule_id IN ($placeholders)",
				array_merge( [ $status, current_time( 'mysql' ), $selector ], $rule_ids )
			)
		);
		// phpcs:enable
	}

	/**
	 * Group issues by rule_id, collapsing per-page duplicates into one row.
	 * Returns one row per problem type with instance counts per status.
	 *
	 * @param array  $filters  Keys: bucket (A|B|C), only_open (bool, default true)
	 * @param int    $limit
	 * @return array<int, array>
	 */
	public function get_grouped_by_rule( array $filters = [], int $limit = 50 ): array {
		global $wpdb;

		$table      = $this->table();
		$where      = [];
		$where_args = [];

		if ( ! empty( $filters['bucket'] ) ) {
			$where[]      = 'bucket = %s';
			$where_args[] = $filters['bucket'];
		}

		$where_sql = $where ? ( 'WHERE ' . implode( ' AND ', $where ) ) : '';

		// HAVING: only groups with at least one open/regressed instance (default)
		$having_sql = '';
		if ( $filters['only_open'] ?? true ) {
			$having_sql = 'HAVING open_count > 0';
		}

		$where_args[] = $limit;

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$rows = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT
					rule_id,
					MAX(description)    AS description,
					MAX(wcag_sc)        AS wcag_sc,
					MAX(bucket)         AS bucket,
					MAX(severity)       AS max_severity,
					MAX(priority_score) AS max_priority_score,
					COUNT(*)            AS instance_count,
					SUM(CASE WHEN status IN ('open','regressed') THEN 1 ELSE 0 END) AS open_count,
					SUM(CASE WHEN status = 'regressed'           THEN 1 ELSE 0 END) AS regressed_count,
					SUM(CASE WHEN status = 'fixed'               THEN 1 ELSE 0 END) AS fixed_count,
					SUM(CASE WHEN status = 'deferred'            THEN 1 ELSE 0 END) AS deferred_count,
					SUM(CASE WHEN status = 'na'                  THEN 1 ELSE 0 END) AS na_count,
					MIN(id)             AS example_id
				FROM $table
				$where_sql
				GROUP BY rule_id
				$having_sql
				ORDER BY
					SUM(CASE WHEN status = 'regressed' THEN 1 ELSE 0 END) DESC,
					MAX(priority_score) DESC
				LIMIT %d",
				...$where_args
			),
			ARRAY_A
		);
		// phpcs:enable

		return array_map( function ( $row ) {
			return array_merge( $row, [
				'instance_count'    => (int) $row['instance_count'],
				'open_count'        => (int) $row['open_count'],
				'regressed_count'   => (int) $row['regressed_count'],
				'fixed_count'       => (int) $row['fixed_count'],
				'deferred_count'    => (int) $row['deferred_count'],
				'na_count'          => (int) $row['na_count'],
				'max_priority_score' => (int) $row['max_priority_score'],
				'example_id'        => (int) $row['example_id'],
			] );
		}, $rows );
	}

	/**
	 * Count distinct problem types (rule_ids) that still have open/regressed instances.
	 */
	public function count_unique_open(): int {
		global $wpdb;
		return (int) $wpdb->get_var(
			"SELECT COUNT(DISTINCT rule_id)
			 FROM {$wpdb->prefix}tp_issues
			 WHERE status IN ('open', 'regressed')"
		);
	}

	/**
	 * Count unique problem types by bucket, only those with open/regressed instances.
	 */
	public function count_unique_by_bucket(): array {
		global $wpdb;
		$rows = (array) $wpdb->get_results(
			"SELECT bucket, COUNT(DISTINCT rule_id) AS count
			 FROM {$wpdb->prefix}tp_issues
			 WHERE status IN ('open', 'regressed')
			 GROUP BY bucket",
			ARRAY_A
		);
		$out = [ 'A' => 0, 'B' => 0, 'C' => 0 ];
		foreach ( $rows as $row ) {
			if ( isset( $out[ $row['bucket'] ] ) ) {
				$out[ $row['bucket'] ] = (int) $row['count'];
			}
		}
		return $out;
	}

	/**
	 * Count distinct rule_ids where no instance is open/regressed (fully addressed).
	 */
	public function count_unique_addressed(): int {
		global $wpdb;
		// A rule is "addressed" when it has zero open/regressed instances
		return (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM (
				SELECT rule_id
				FROM {$wpdb->prefix}tp_issues
				GROUP BY rule_id
				HAVING SUM(CASE WHEN status IN ('open','regressed') THEN 1 ELSE 0 END) = 0
			) AS addressed"
		);
	}

	/**
	 * Total distinct rule_ids ever detected.
	 */
	public function count_unique_total(): int {
		global $wpdb;
		return (int) $wpdb->get_var(
			"SELECT COUNT(DISTINCT rule_id) FROM {$wpdb->prefix}tp_issues"
		);
	}

	/**
	 * Returns weighted open/total counts for Bucket A issues, used by HealthScore component A.
	 * Weights: critical=10, serious=6, moderate=3, minor=1.
	 */
	public function get_score_inputs_a(): array {
		global $wpdb;

		$rows = (array) $wpdb->get_results(
			"SELECT severity,
			        COUNT(*) AS total,
			        SUM(CASE WHEN status IN ('open','regressed') THEN 1 ELSE 0 END) AS open_count
			 FROM {$wpdb->prefix}tp_issues
			 WHERE bucket = 'A'
			 GROUP BY severity",
			ARRAY_A
		);

		$weight_map = [ 'critical' => 10, 'serious' => 6, 'moderate' => 3, 'minor' => 1 ];

		$weighted_total = 0;
		$weighted_open  = 0;
		$total          = 0;
		$open           = 0;

		foreach ( $rows as $row ) {
			$w               = $weight_map[ strtolower( $row['severity'] ) ] ?? 1;
			$weighted_total += (int) $row['total'] * $w;
			$weighted_open  += (int) $row['open_count'] * $w;
			$total          += (int) $row['total'];
			$open           += (int) $row['open_count'];
		}

		return [
			'total'          => $total,
			'open'           => $open,
			'weighted_total' => $weighted_total,
			'weighted_open'  => $weighted_open,
		];
	}

	/**
	 * Returns decided/total counts for Bucket B issues, used by HealthScore component B.
	 * "Decided" = any status other than open or regressed.
	 */
	public function get_score_inputs_b(): array {
		global $wpdb;

		$row = $wpdb->get_row(
			"SELECT
			    COUNT(*) AS total,
			    SUM(CASE WHEN status NOT IN ('open','regressed') THEN 1 ELSE 0 END) AS decided
			 FROM {$wpdb->prefix}tp_issues
			 WHERE bucket = 'B'",
			ARRAY_A
		);

		return [
			'total'   => (int) ( $row['total'] ?? 0 ),
			'decided' => (int) ( $row['decided'] ?? 0 ),
		];
	}

	/**
	 * Return all issues for export (no pagination limit).
	 * Ordered by priority_score DESC so the CSV is most-critical-first.
	 */
	public function export_all(): array {
		global $wpdb;
		return (array) $wpdb->get_results(
			"SELECT id, fingerprint, rule_id, wcag_sc, bucket, severity, priority_score, status,
			        description, selector, url, post_id, confirmed_by_json, created_at
			 FROM {$wpdb->prefix}tp_issues
			 ORDER BY priority_score DESC, created_at DESC",
			ARRAY_A
		);
	}

	public function count_open(): int {
		global $wpdb;

		return (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->prefix}tp_issues WHERE status IN ('open', 'regressed')"
		);
	}
}
