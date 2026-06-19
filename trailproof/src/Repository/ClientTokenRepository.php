<?php

declare(strict_types=1);

namespace Trailproof\Repository;

// Custom plugin table; direct queries are required and caching is not appropriate here.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

class ClientTokenRepository {

	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'tp_client_tokens';
	}

	/**
	 * Create a new token and return the raw token string.
	 */
	public function create( string $label, ?string $expires_at, int $user_id ): string {
		global $wpdb;

		$token = bin2hex( random_bytes( 32 ) );

		// Exclude expires_at entirely when null so the column uses its DB DEFAULT (NULL).
		// Passing null in the format array misaligns subsequent column formats in wpdb->insert().
		$data    = [ 'token' => $token, 'label' => $label, 'created_by' => $user_id ];
		$formats = [ '%s', '%s', '%d' ];

		if ( null !== $expires_at ) {
			$data['expires_at'] = $expires_at;
			$formats            = [ '%s', '%s', '%s', '%d' ];
		}

		$wpdb->insert( $this->table(), $data, $formats );

		return $token;
	}

	/**
	 * Find a token row — returns null if not found, revoked, or expired.
	 */
	public function find( string $token ): ?array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->table()} WHERE token = %s AND revoked = 0",
				$token
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return null;
		}

		if ( $row['expires_at'] !== null && strtotime( $row['expires_at'] ) < time() ) {
			return null;
		}

		return $row;
	}

	/**
	 * Return all tokens for the admin list, newest first.
	 */
	public function list(): array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (array) $wpdb->get_results(
			"SELECT id, label, expires_at, revoked, created_by, created_at FROM {$this->table()} ORDER BY created_at DESC",
			ARRAY_A
		);
	}

	/**
	 * Revoke a token by ID.
	 */
	public function revoke( int $id ): void {
		global $wpdb;

		$wpdb->update(
			$this->table(),
			[ 'revoked' => 1 ],
			[ 'id' => $id ],
			[ '%d' ],
			[ '%d' ]
		);
	}
}
