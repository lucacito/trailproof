<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Issue\HealthScore;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;
use Trailproof\Report\AccessibilityStatement;

class DashboardRoutes {

	public function __construct(
		private readonly ScanRepository       $scan_repo,
		private readonly IssueRepository      $issue_repo,
		private readonly DecisionLogRepository $log_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/dashboard',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_dashboard' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);

		register_rest_route(
			$namespace,
			'/statement',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_statement' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_dashboard( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		$unique_open      = $this->issue_repo->count_unique_open();
		$unique_by_bucket = $this->issue_repo->count_unique_by_bucket();
		$unique_total     = $this->issue_repo->count_unique_total();
		$unique_addressed = $this->issue_repo->count_unique_addressed();

		// Top grouped issues: unique problem types, highest priority first
		$top_grouped = $this->issue_repo->get_grouped_by_rule( [ 'only_open' => true ], 5 );

		// Health score (cached 60s)
		$health_score = HealthScore::compute( $this->issue_repo, $this->log_repo );

		// Deduplicated recent activity: group same (action, fingerprint) pairs,
		// keep the latest occurrence, expose repeat_count for the UI.
		$recent_activity = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT
				     MAX(l.id)          AS id,
				     MAX(l.ts)          AS ts,
				     l.action,
				     l.fingerprint,
				     MAX(l.note)        AS note,
				     COUNT(*)           AS repeat_count,
				     MAX(i.rule_id)     AS rule_id,
				     MAX(i.description) AS description,
				     MAX(i.bucket)      AS bucket
				 FROM {$wpdb->prefix}tp_decisions_log l
				 LEFT JOIN {$wpdb->prefix}tp_issues i ON i.fingerprint = l.fingerprint
				 GROUP BY l.action, l.fingerprint
				 ORDER BY MAX(l.id) DESC
				 LIMIT %d",
				10
			),
			ARRAY_A
		);

		// Stepper flags: has the user generated a statement / bundle?
		$report_types = (array) $wpdb->get_results(
			"SELECT type FROM {$wpdb->prefix}tp_reports GROUP BY type",
			ARRAY_A
		);
		$report_type_keys = array_column( $report_types, 'type' );
		$has_statement    = in_array( 'statement', $report_type_keys, true );
		$has_bundle       = in_array( 'bundle', $report_type_keys, true );

		return new \WP_REST_Response( [
			// Unique problem-type counts
			'unique_open'      => $unique_open,
			'unique_by_bucket' => $unique_by_bucket,
			'unique_total'     => $unique_total,
			'unique_addressed' => $unique_addressed,
			'progress_pct'     => $unique_total > 0
				? (int) round( ( $unique_addressed / $unique_total ) * 100 )
				: 0,

			// Raw row counts (kept for the accessibility statement)
			'by_bucket'  => $this->issue_repo->count_by_bucket(),
			'by_status'  => $this->issue_repo->count_by_status(),
			'total_open' => $this->issue_repo->count_open(),

			// Health score
			'health_score' => $health_score,

			// Top grouped issues for dashboard list
			'top_grouped' => $top_grouped,

			// Scan metadata
			'recent_scans'    => $this->scan_repo->get_recent( 5 ),
			'last_scan_at'    => $this->scan_repo->get_last_scan_at(),
			'recent_activity' => $recent_activity,

			// Stepper completion flags
			'has_statement' => $has_statement,
			'has_bundle'    => $has_bundle,
		], 200 );
	}

	public function get_statement( \WP_REST_Request $request ): \WP_REST_Response {
		$generator = new AccessibilityStatement( $this->scan_repo, $this->issue_repo );
		$html      = $generator->generate();

		return new \WP_REST_Response( [ 'html' => $html ], 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
