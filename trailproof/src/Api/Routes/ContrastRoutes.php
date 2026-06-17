<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Repository\IssueRepository;

class ContrastRoutes {

	public function __construct( private readonly IssueRepository $issue_repo ) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/contrast',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_contrast_issues' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_contrast_issues( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		$rows = (array) $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->prepare(
				"SELECT i.id, i.fingerprint, i.selector, i.description, i.status, i.url, i.post_id, i.node_data_json
				 FROM {$wpdb->prefix}tp_issues i
				 WHERE i.rule_id = %s
				 ORDER BY i.updated_at DESC
				 LIMIT 200",
				'color-contrast'
			),
			ARRAY_A
		);

		// Batch-load active correction IDs so the UI can offer a revert button.
		$active_correction_id = [];
		if ( ! empty( $rows ) ) {
			$fps          = array_unique( array_column( $rows, 'fingerprint' ) );
			$placeholders = implode( ',', array_fill( 0, count( $fps ), '%s' ) );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
			$cr_rows = (array) $wpdb->get_results(
				$wpdb->prepare(
					"SELECT fingerprint, id FROM {$wpdb->prefix}tp_corrections
					 WHERE fingerprint IN ($placeholders) AND enabled = 1
					 ORDER BY id DESC",
					...$fps
				),
				ARRAY_A
			);
			foreach ( $cr_rows as $cr ) {
				// Keep the most-recent active correction per fingerprint.
				if ( ! isset( $active_correction_id[ $cr['fingerprint'] ] ) ) {
					$active_correction_id[ $cr['fingerprint'] ] = (int) $cr['id'];
				}
			}
		}

		$items = [];
		foreach ( $rows as $row ) {
			$node       = json_decode( $row['node_data_json'] ?? '{}', true ) ?: [];
			$color_data = $this->extract_color_data( $node );

			$post_id    = (int) $row['post_id'];
			$post_title = $post_id > 0
				? get_the_title( $post_id )
				: get_bloginfo( 'name' );

			$items[] = [
				'id'           => (int) $row['id'],
				'fingerprint'  => $row['fingerprint'],
				'selector'     => $row['selector'],
				'description'  => $row['description'],
				'status'       => $row['status'],
				'url'          => $row['url'],
				'post_id'      => $post_id,
				'post_title'   => $post_title,
				'fg_color'     => $color_data['fg'] ?? null,
				'bg_color'     => $color_data['bg'] ?? null,
				'ratio'        => $color_data['ratio'] !== null ? (float) $color_data['ratio'] : null,
				'font_size'    => $color_data['fontSize'] ?? null,
				'font_weight'  => $color_data['fontWeight'] ?? null,
				'html_snippet'  => $node['html'] ?? null,
				'incomplete'    => $color_data['incomplete'] ?? false,
				'correction_id' => $active_correction_id[ $row['fingerprint'] ] ?? null,
			];
		}

		$passed = (int) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->prefix}tp_issues
				 WHERE rule_id = %s AND status IN ('fixed','na')",
				'color-contrast'
			)
		);

		return new \WP_REST_Response( [
			'items'  => $items,
			'total'  => count( $items ),
			'passed' => $passed,
		], 200 );
	}

	/**
	 * Extract fg/bg color data from the stored node_data_json flat structure written by ScanRoutes.
	 */
	private function extract_color_data( array $node ): array {
		if ( isset( $node['fg_color'] ) && $node['fg_color'] !== '' ) {
			return [
				'fg'         => $node['fg_color'],
				'bg'         => ( $node['bg_color'] ?? '' ) !== '' ? $node['bg_color'] : null,
				'ratio'      => isset( $node['contrast_ratio'] ) ? (float) $node['contrast_ratio'] : null,
				'fontSize'   => $node['font_size']   ?? null,
				'fontWeight' => $node['font_weight'] ?? null,
				'incomplete' => ! empty( $node['incomplete'] ),
			];
		}
		return [ 'incomplete' => ! empty( $node['incomplete'] ) ];
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
