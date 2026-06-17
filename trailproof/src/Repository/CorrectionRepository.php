<?php

declare(strict_types=1);

namespace Trailproof\Repository;

// Custom plugin table; direct queries are required and caching not appropriate for correction records.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

class CorrectionRepository {

	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'tp_corrections';
	}

	public function create( array $data ): int {
		global $wpdb;

		$wpdb->insert(
			$this->table(),
			[
				'fingerprint'    => $data['fingerprint'],
				'post_id'        => $data['post_id'] ?: null,
				'url'            => $data['url'],
				'selector'       => $data['selector'],
				'transform_type' => $data['transform_type'],
				'payload_json'   => wp_json_encode( $data['payload'] ?? [] ),
				'original_json'  => wp_json_encode( $data['original'] ?? [] ),
				'enabled'        => 1,
				'created_by'     => get_current_user_id(),
				'decided_by'     => get_current_user_id(),
				'decided_at'     => current_time( 'mysql' ),
			],
			[ '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%d', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function set_enabled( int $id, bool $enabled ): bool {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->table(),
			[ 'enabled' => (int) $enabled ],
			[ 'id' => $id ],
			[ '%d' ],
			[ '%d' ]
		);
	}

	public function update_payload( int $id, array $payload ): bool {
		global $wpdb;

		return (bool) $wpdb->update(
			$this->table(),
			[ 'payload_json' => wp_json_encode( $payload ) ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);
	}

	/**
	 * Fast check for whether any enabled corrections exist for a given post.
	 * Called on every front-end page load; must be as fast as possible.
	 */
	public function has_enabled_for( int $post_id ): bool {
		global $wpdb;

		if ( $post_id > 0 ) {
			// Include post-specific corrections AND global ones (post_id IS NULL = applies to all pages).
			return (bool) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT 1 FROM {$wpdb->prefix}tp_corrections WHERE (post_id = %d OR post_id IS NULL) AND enabled = 1 LIMIT 1",
					$post_id
				)
			);
		}

		// Homepage (post_id = 0): check for global corrections only.
		return (bool) $wpdb->get_var(
			"SELECT 1 FROM {$wpdb->prefix}tp_corrections WHERE post_id IS NULL AND enabled = 1 LIMIT 1"
		);
	}

	/**
	 * Return all enabled corrections for a post, ordered by id (stable application order).
	 * Global corrections (post_id IS NULL) are included on every page.
	 */
	public function get_enabled_for( int $post_id ): array {
		global $wpdb;

		if ( $post_id > 0 ) {
			return (array) $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$wpdb->prefix}tp_corrections WHERE (post_id = %d OR post_id IS NULL) AND enabled = 1 ORDER BY id ASC",
					$post_id
				),
				ARRAY_A
			);
		}

		// Homepage (post_id = 0): return global corrections.
		return (array) $wpdb->get_results(
			"SELECT * FROM {$wpdb->prefix}tp_corrections WHERE post_id IS NULL AND enabled = 1 ORDER BY id ASC",
			ARRAY_A
		);
	}

	public function get_first_enabled_by_fingerprint( string $fingerprint ): ?array {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_corrections WHERE fingerprint = %s AND enabled = 1 ORDER BY id DESC LIMIT 1",
				$fingerprint
			),
			ARRAY_A
		);

		return $row ?: null;
	}

	public function get_by_id( int $id ): ?array {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tp_corrections WHERE id = %d", $id ),
			ARRAY_A
		);

		return $row ?: null;
	}

	public function get_list( int $limit = 100, int $offset = 0 ): array {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_corrections ORDER BY created_at DESC LIMIT %d OFFSET %d",
				$limit,
				$offset
			),
			ARRAY_A
		);
	}
}
