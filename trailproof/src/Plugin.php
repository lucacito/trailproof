<?php

declare(strict_types=1);

namespace Trailproof;

use Trailproof\Admin\AdminMenu;
use Trailproof\Admin\SettingsPage;
use Trailproof\Api\RestApi;
use Trailproof\Correction\CorrectionEngine;
use Trailproof\Cron\StaticScanScheduler;
use Trailproof\Repository\CorrectionRepository;
use Trailproof\Scan\DiviEditorPrevention;

class Plugin {

	private static bool $initialized = false;

	public static function init(): void {
		if ( self::$initialized ) {
			return;
		}
		self::$initialized = true;

		$settings_page     = new SettingsPage();
		$admin_menu        = new AdminMenu( $settings_page );
		$rest_api          = new RestApi();
		$scheduler         = new StaticScanScheduler();
		$correction_engine = new CorrectionEngine( new CorrectionRepository() );
		$divi_prevention   = new DiviEditorPrevention();

		// Cron hook + custom schedule must be registered on every load
		$scheduler->register();

		// Render-time correction layer (non-destructive, output buffering)
		$correction_engine->register();

		// Divi 5 editor prevention — author-side nudges in the Visual Builder
		$divi_prevention->register();

		if ( is_admin() ) {
			add_action( 'admin_menu', [ $admin_menu, 'register_menus' ] );
			add_action( 'admin_enqueue_scripts', [ $admin_menu, 'enqueue_assets' ] );
			add_action( 'admin_init', [ $settings_page, 'register_settings' ] );

			// Re-sync the cron schedule whenever settings are saved
			add_action(
				'update_option_trailproof_settings',
				[ $scheduler, 'sync_schedule' ]
			);
		}

		add_action( 'rest_api_init', [ $rest_api, 'register_routes' ] );
	}
}
