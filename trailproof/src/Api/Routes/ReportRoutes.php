<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Report\BundleExporter;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

class ReportRoutes {

	public function __construct(
		private readonly IssueRepository       $issue_repo,
		private readonly ScanRepository        $scan_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/reports',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'list_reports' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'generate_report' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/reports/(?P<id>\d+)/download',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'download_report' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function list_reports( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, type, generated_at, generated_by, snapshot_json
				 FROM {$wpdb->prefix}tp_reports
				 ORDER BY generated_at DESC LIMIT %d",
				50
			),
			ARRAY_A
		);

		// Decode snapshot_json and attach filename for display; never expose file_path
		$reports = array_map( function ( $row ) {
			$snap = json_decode( $row['snapshot_json'] ?? '{}', true ) ?: [];
			return [
				'id'           => (int) $row['id'],
				'type'         => $row['type'],
				'generated_at' => $row['generated_at'],
				'generated_by' => (int) $row['generated_by'],
				'filename'     => $snap['filename'] ?? '',
			];
		}, $rows );

		return new \WP_REST_Response( $reports, 200 );
	}

	public function generate_report( \WP_REST_Request $request ): \WP_REST_Response {
		$exporter = new BundleExporter( $this->issue_repo, $this->scan_repo, $this->log_repo );

		try {
			$result = $exporter->export();
		} catch ( \RuntimeException $e ) {
			return new \WP_REST_Response( [ 'error' => $e->getMessage() ], 500 );
		}

		return new \WP_REST_Response( [
			'id'           => $result['id'],
			'filename'     => $result['filename'],
			'generated_at' => $result['generated_at'],
		], 201 );
	}

	public function download_report( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;

		$id  = (int) $request->get_param( 'id' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$wpdb->prefix}tp_reports WHERE id = %d",
				$id
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return new \WP_REST_Response( [ 'error' => 'Report not found.' ], 404 );
		}

		$snap      = json_decode( $row['snapshot_json'] ?? '{}', true ) ?: [];
		$file_path = $snap['file_path'] ?? '';
		$filename  = $snap['filename'] ?? 'trailproof-report.zip';

		if ( ! $file_path || ! file_exists( $file_path ) ) {
			return new \WP_REST_Response( [ 'error' => 'Report file not found on disk.' ], 404 );
		}

		// Validate the file is inside the expected uploads sub-directory
		$upload   = wp_upload_dir();
		$expected = realpath( $upload['basedir'] . '/trailproof-reports' );
		$resolved = realpath( $file_path );

		if ( ! $expected || ! $resolved || ! str_starts_with( $resolved, $expected ) ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid file path.' ], 403 );
		}

		// Serve the file — exit early so WP doesn't send JSON headers
		header( 'Content-Type: application/zip' );
		header( 'Content-Disposition: attachment; filename="' . rawurlencode( $filename ) . '"' );
		header( 'Content-Length: ' . (string) filesize( $file_path ) );
		header( 'Cache-Control: no-store, no-cache, must-revalidate' );
		header( 'Pragma: no-cache' );
		@ob_end_clean();
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		readfile( $file_path );
		exit;
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
