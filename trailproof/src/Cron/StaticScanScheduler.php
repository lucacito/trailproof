<?php

declare(strict_types=1);

namespace Trailproof\Cron;

use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;
use Trailproof\Scan\ElementorProvider;
use Trailproof\Scan\GutenbergProvider;
use Trailproof\Scan\ScanRunner;
use Trailproof\Scan\StaticProvider;
use Trailproof\Scan\WaveProvider;

class StaticScanScheduler {

	private const HOOK           = 'trailproof_static_scan';
	private const SUMMARY_OPTION = 'trailproof_last_cron_summary';

	public function register(): void {
		add_action( self::HOOK, [ $this, 'run_scan' ] );
		add_filter( 'cron_schedules', [ $this, 'add_schedules' ] );
		add_action( 'admin_notices', [ $this, 'maybe_show_cron_notice' ] );
	}

	public function add_schedules( array $schedules ): array {
		$schedules['trailproof_monthly'] = [
			'interval' => 30 * DAY_IN_SECONDS,
			'display'  => __( 'Once Monthly (Trailproof)', 'trailproof' ),
		];
		return $schedules;
	}

	public function sync_schedule(): void {
		$settings = (array) get_option( 'trailproof_settings', [] );
		$freq     = $settings['scan_schedule'] ?? 'weekly';

		$this->unschedule();

		if ( 'off' === $freq ) {
			return;
		}

		$wp_schedule = match ( $freq ) {
			'daily'   => 'daily',
			'monthly' => 'trailproof_monthly',
			default   => 'weekly',
		};

		wp_schedule_event( time(), $wp_schedule, self::HOOK );
	}

	public function unschedule(): void {
		$timestamp = wp_next_scheduled( self::HOOK );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::HOOK );
		}
	}

	public function run_scan(): void {
		$scan_repo  = new ScanRepository();
		$issue_repo = new IssueRepository();
		$runner     = new ScanRunner();

		$runner->register_provider( new StaticProvider( $scan_repo, $issue_repo ) );
		$runner->register_provider( new GutenbergProvider( $scan_repo, $issue_repo ) );
		$runner->register_provider( new ElementorProvider( $scan_repo, $issue_repo ) );

		// Add WAVE provider if key is configured
		$settings = (array) get_option( 'trailproof_settings', [] );
		$wave_key = $settings['wave_api_key'] ?? '';
		if ( $wave_key !== '' ) {
			$runner->register_provider( new WaveProvider( $scan_repo, $issue_repo, $wave_key ) );
		}

		$pages      = $runner->get_in_scope_pages();
		$scanned    = 0;
		$new_issues = 0;
		$regressed  = 0;

		// Count issues before scan to detect new/regressed after
		$before_open      = $issue_repo->count_open();
		$before_statuses  = $issue_repo->count_by_status();
		$before_regressed = (int) ( $before_statuses['regressed'] ?? 0 );

		foreach ( $pages as $page ) {
			foreach ( $runner->get_providers() as $provider ) {
				if ( $provider->isAvailable() ) {
					$provider->scan( $page['url'], $page['post_id'] );
					++$scanned;
				}
			}
		}

		$after_open      = $issue_repo->count_open();
		$after_statuses  = $issue_repo->count_by_status();
		$after_regressed = (int) ( $after_statuses['regressed'] ?? 0 );

		$new_issues = max( 0, $after_open - $before_open );
		$regressed  = max( 0, $after_regressed - $before_regressed );

		$summary = [
			'pages_scanned' => count( $pages ),
			'new_issues'    => $new_issues,
			'regressed'     => $regressed,
			'total_open'    => $after_open,
			'ran_at'        => current_time( 'mysql' ),
		];

		// Store summary as a WP option so admin_notices can display it on next admin load
		update_option( self::SUMMARY_OPTION, $summary, false );

		do_action( 'trailproof_scan_complete', $summary );
	}

	/**
	 * Show the cron summary as an admin notice once, then clear it.
	 * Only shown on Trailproof admin pages to avoid cluttering the entire dashboard.
	 */
	public function maybe_show_cron_notice(): void {
		// Only show on Trailproof admin pages
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! str_contains( $screen->id ?? '', 'trailproof' ) ) {
			return;
		}

		$summary = get_option( self::SUMMARY_OPTION );
		if ( ! is_array( $summary ) || empty( $summary ) ) {
			return;
		}

		// Clear immediately so it only shows once
		delete_option( self::SUMMARY_OPTION );

		$type    = ( $summary['regressed'] > 0 ) ? 'warning' : 'info';
		$ran_at  = esc_html( $summary['ran_at'] ?? '' );
		$pages   = (int) ( $summary['pages_scanned'] ?? 0 );
		$new     = (int) ( $summary['new_issues'] ?? 0 );
		$reg     = (int) ( $summary['regressed'] ?? 0 );
		$open    = (int) ( $summary['total_open'] ?? 0 );

		$msg = sprintf(
			/* translators: 1: scan date, 2: page count, 3: new issue count, 4: regressed count, 5: total open */
			__( '<strong>Trailproof scheduled scan</strong> ran at %1$s — %2$d pages · %3$d new issues · %4$d regressions · %5$d open total.', 'trailproof' ),
			$ran_at, $pages, $new, $reg, $open
		);

		printf( '<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr( $type ), wp_kses_post( $msg ) );
	}
}
