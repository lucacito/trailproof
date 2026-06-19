<?php

declare(strict_types=1);

namespace Trailproof\Report;

use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

/**
 * Generates a dated ZIP evidence package containing:
 *   - accessibility-statement.html
 *   - issues.csv
 *   - decisions.csv
 *   - scans.json
 *   - README.txt
 *
 * The ZIP is written to the trailproof-reports sub-folder inside wp-content/uploads.
 * A .htaccess in that folder denies direct HTTP access; the file is served only
 * through the authenticated ReportRoutes download endpoint.
 */
class BundleExporter {

	public function __construct(
		private readonly IssueRepository       $issue_repo,
		private readonly ScanRepository        $scan_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	/**
	 * Generate the bundle and return its metadata.
	 *
	 * @throws \RuntimeException if ZipArchive is unavailable or the file cannot be written.
	 * @return array{path: string, url: string, filename: string, generated_at: string}
	 */
	public function export(): array {
		if ( ! class_exists( 'ZipArchive' ) ) {
			throw new \RuntimeException( 'ZipArchive PHP extension is required to generate report bundles.' );
		}

		$this->ensure_reports_dir();

		$filename     = 'trailproof-' . wp_date( 'Y-m-d-His' ) . '-' . wp_generate_password( 8, false ) . '.zip';
		$upload_dir   = $this->reports_dir();
		$file_path    = $upload_dir['path'] . '/' . $filename;
		$file_url     = $upload_dir['url'] . '/' . $filename;
		$generated_at = current_time( 'mysql' );

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $file_path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE ) ) {
			throw new \RuntimeException( 'Could not create ZIP file at: ' . $file_path ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		$zip->addFromString( 'README.txt', $this->readme() );
		$zip->addFromString( 'accessibility-statement.html', $this->statement() );
		$zip->addFromString( 'issues.csv', $this->issues_csv() );
		$zip->addFromString( 'decisions.csv', $this->decisions_csv() );
		$zip->addFromString( 'scans.json', $this->scans_json() );

		$zip->close();

		// Store metadata in tp_reports
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->insert(
			$wpdb->prefix . 'tp_reports',
			[
				'type'          => 'bundle',
				'snapshot_json' => wp_json_encode( [
					'file_path' => $file_path,
					'file_url'  => $file_url,
					'filename'  => $filename,
				] ),
				'generated_at' => $generated_at,
				'generated_by' => get_current_user_id(),
			],
			[ '%s', '%s', '%s', '%d' ]
		);

		return [
			'id'           => (int) $wpdb->insert_id,
			'filename'     => $filename,
			'url'          => $file_url,
			'generated_at' => $generated_at,
		];
	}

	private function readme(): string {
		$site = get_bloginfo( 'name' );
		$date = wp_date( 'Y-m-d H:i:s T' );
		return "Trailproof Accessibility Evidence Bundle\n"
			. "Site:      {$site}\n"
			. "Generated: {$date}\n"
			. "\n"
			. "Contents\n"
			. "--------\n"
			. "accessibility-statement.html  Formatted accessibility statement (WCAG 2.1 AA)\n"
			. "issues.csv                    All detected issues with WCAG mapping and status\n"
			. "decisions.csv                 Append-only audit log of all remediation decisions\n"
			. "scans.json                    Scan history (provider, timestamp, score, summary)\n"
			. "README.txt                    This file\n"
			. "\n"
			. "Conformance framing\n"
			. "-------------------\n"
			. "This site is engaged in systematic, documented remediation toward WCAG 2.1 Level AA.\n"
			. "No claim of full or complete conformance is made. \"Partially conformant\" is the\n"
			. "accurate characterisation where open issues remain.\n"
			. "\n"
			. "Do not represent this bundle as proof of 100% compliance.\n";
	}

	private function statement(): string {
		$stmt = new AccessibilityStatement( $this->scan_repo, $this->issue_repo );
		return $stmt->generate();
	}

	private function issues_csv(): string {
		$issues = $this->issue_repo->export_all();
		$rows   = [];

		$rows[] = $this->csv_row( [
			'ID', 'Rule ID', 'WCAG SC', 'Bucket', 'Severity', 'Priority Score',
			'Status', 'Description', 'Selector', 'URL', 'Post ID',
			'Confirmed By', 'Detected At',
		] );

		foreach ( $issues as $i ) {
			$confirmed = json_decode( $i['confirmed_by_json'] ?? '[]', true );
			$rows[] = $this->csv_row( [
				$i['id'],
				$i['rule_id'],
				$i['wcag_sc'] ?? '',
				$i['bucket'],
				$i['severity'],
				$i['priority_score'],
				$i['status'],
				$i['description'] ?? '',
				$i['selector'],
				$i['url'],
				$i['post_id'] ?? '',
				is_array( $confirmed ) ? implode( '|', $confirmed ) : '',
				$i['created_at'],
			] );
		}

		return implode( "\r\n", $rows );
	}

	private function decisions_csv(): string {
		$logs = $this->log_repo->get_recent( 10000 );
		$rows = [];

		$rows[] = $this->csv_row( [ 'ID', 'Timestamp', 'User ID', 'Action', 'Fingerprint', 'Before', 'After', 'Note' ] );

		foreach ( $logs as $l ) {
			$rows[] = $this->csv_row( [
				$l['id'],
				$l['ts'],
				$l['user_id'],
				$l['action'],
				$l['fingerprint'],
				$l['before_json'] ?? '',
				$l['after_json'] ?? '',
				$l['note'] ?? '',
			] );
		}

		return implode( "\r\n", $rows );
	}

	private function scans_json(): string {
		$scans = $this->scan_repo->get_recent( 500 );
		return wp_json_encode( $scans, JSON_PRETTY_PRINT ) ?: '[]';
	}

	private function csv_row( array $fields ): string {
		$escaped = array_map( function ( $v ) {
			$v = (string) $v;
			// Escape double-quotes, wrap fields that need it
			if ( str_contains( $v, '"' ) || str_contains( $v, ',' ) || str_contains( $v, "\n" ) ) {
				$v = '"' . str_replace( '"', '""', $v ) . '"';
			}
			return $v;
		}, $fields );
		return implode( ',', $escaped );
	}

	private function reports_dir(): array {
		$upload  = wp_upload_dir();
		$subdir  = '/trailproof-reports';
		return [
			'path' => $upload['basedir'] . $subdir,
			'url'  => $upload['baseurl'] . $subdir,
		];
	}

	private function ensure_reports_dir(): void {
		$dir = $this->reports_dir()['path'];

		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		// Block direct HTTP access to this directory
		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			if ( false === file_put_contents( $htaccess, "deny from all\n" ) ) {
				throw new \RuntimeException( 'Could not write .htaccess to the reports directory — check filesystem permissions. ZIP bundles would be publicly accessible without this file.' );
			}
		}

		// Block directory listing even if .htaccess is ignored
		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			file_put_contents( $index, "<?php // Silence is golden.\n" );
		}
	}
}
