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

		$items = [];
		foreach ( $rows as $row ) {
			$node       = json_decode( $row['node_data_json'] ?? '{}', true ) ?: [];
			$color_data = $this->extract_color_data( $node );

			$items[] = [
				'id'           => (int) $row['id'],
				'fingerprint'  => $row['fingerprint'],
				'selector'     => $row['selector'],
				'description'  => $row['description'],
				'status'       => $row['status'],
				'url'          => $row['url'],
				'post_id'      => $row['post_id'],
				'fg_color'     => $color_data['fg'] ?? null,
				'bg_color'     => $color_data['bg'] ?? null,
				'ratio'        => $color_data['ratio'] !== null ? (float) $color_data['ratio'] : null,
				'font_size'    => $color_data['fontSize'] ?? null,
				'font_weight'  => $color_data['fontWeight'] ?? null,
				'html_snippet' => $node['html'] ?? null,
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
	 * Extract fg/bg color data from the axe-core node_data_json structure.
	 * axe stores check results in `any`, `all`, or `none` arrays; fgColor lives in check.data.
	 */
	private function extract_color_data( array $node ): array {
		foreach ( [ 'any', 'all', 'none' ] as $key ) {
			foreach ( (array) ( $node[ $key ] ?? [] ) as $check ) {
				$data = $check['data'] ?? [];
				if ( isset( $data['fgColor'] ) ) {
					return [
						'fg'         => $data['fgColor'],
						'bg'         => $data['bgColor']       ?? null,
						'ratio'      => $data['contrastRatio'] ?? null,
						'fontSize'   => $data['fontSize']      ?? null,
						'fontWeight' => $data['fontWeight']    ?? null,
					];
				}
			}
		}
		return [];
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
