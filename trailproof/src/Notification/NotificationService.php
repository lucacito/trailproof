<?php

declare(strict_types=1);

namespace Trailproof\Notification;

use Trailproof\Repository\IssueRepository;

class NotificationService {

	public function __construct( private readonly IssueRepository $issue_repo ) {}

	/**
	 * Called via the trailproof_scan_complete action after each scheduled scan.
	 * Sends an email alert if regressions were detected and notifications are enabled.
	 */
	public function on_scan_complete( array $summary ): void {
		$settings  = (array) get_option( 'trailproof_settings', [] );
		$enabled   = (bool) ( $settings['notify_on_regression'] ?? true );
		$to        = sanitize_email( $settings['notification_email'] ?? '' );

		if ( ! $enabled ) {
			return;
		}

		if ( $to === '' ) {
			$to = (string) get_option( 'admin_email' );
		}

		if ( $to === '' ) {
			return;
		}

		$regressed = (int) ( $summary['regressed'] ?? 0 );
		if ( $regressed < 1 ) {
			return;
		}

		$site_name  = get_bloginfo( 'name' );
		$new_issues = (int) ( $summary['new_issues'] ?? 0 );
		$total_open = (int) ( $summary['total_open'] ?? 0 );
		$ran_at     = $summary['ran_at'] ?? '';
		$dashboard  = admin_url( 'admin.php?page=trailproof' );

		$top_rules = $this->issue_repo->get_grouped_by_rule( [ 'only_open' => true ], 5 );
		$rule_lines = '';
		foreach ( $top_rules as $rule ) {
			if ( (int) $rule['regressed_count'] > 0 ) {
				$rule_lines .= sprintf(
					"  - %s: %d regression(s)\n",
					$rule['rule_id'],
					(int) $rule['regressed_count']
				);
			}
		}

		$subject = sprintf(
			/* translators: site name */
			__( '[Trailproof] Accessibility regression detected on %s', 'trailproof' ),
			$site_name
		);

		$body = sprintf(
			/* translators: 1: regression count, 2: site name, 3: scan date, 4: new issues, 5: regressions, 6: total open, 7: rule breakdown, 8: dashboard URL */
			__(
				"%1\$d accessibility regression(s) were detected on %2\$s.\n\nScan ran at: %3\$s\nNew issues:  %4\$d\nRegressions: %5\$d\nTotal open:  %6\$d\n\nTop regressed rules:\n%7\$s\nReview in dashboard: %8\$s",
				'trailproof'
			),
			$regressed,
			$site_name,
			$ran_at,
			$new_issues,
			$regressed,
			$total_open,
			$rule_lines ?: "  (none with regression data)\n",
			$dashboard
		);

		$result = wp_mail( $to, $subject, $body );

		if ( ! $result ) {
			error_log( '[Trailproof] Failed to send regression alert email to ' . $to ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
	}
}
