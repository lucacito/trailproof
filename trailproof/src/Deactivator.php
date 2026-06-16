<?php

declare(strict_types=1);

namespace Trailproof;

class Deactivator {

	public static function deactivate(): void {
		// Unschedule all Trailproof cron hooks; tables are preserved so data survives reactivation.
		foreach ( [ 'trailproof_static_scan' ] as $hook ) {
			$timestamp = wp_next_scheduled( $hook );
			if ( $timestamp ) {
				wp_unschedule_event( $timestamp, $hook );
			}
		}

		flush_rewrite_rules();
	}
}
