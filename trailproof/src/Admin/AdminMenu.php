<?php

declare(strict_types=1);

namespace Trailproof\Admin;

class AdminMenu {

	public function __construct( private readonly SettingsPage $settings_page ) {}

	public function register_menus(): void {
		add_menu_page(
			__( 'Trailproof', 'trailproof' ),
			__( 'Trailproof', 'trailproof' ),
			'manage_options',
			'trailproof',
			[ $this, 'render_dashboard' ],
			'dashicons-shield-alt',
			30
		);

		// Rename the auto-created first submenu from "Trailproof" to "Dashboard".
		add_submenu_page(
			'trailproof',
			__( 'Dashboard', 'trailproof' ),
			__( 'Dashboard', 'trailproof' ),
			'manage_options',
			'trailproof',
			[ $this, 'render_dashboard' ]
		);

		add_submenu_page(
			'trailproof',
			__( 'Settings', 'trailproof' ),
			__( 'Settings', 'trailproof' ),
			'manage_options',
			'trailproof-settings',
			[ $this->settings_page, 'render' ]
		);

		add_submenu_page(
			'trailproof',
			__( 'Client Portal', 'trailproof' ),
			__( 'Client Portal', 'trailproof' ),
			'manage_options',
			'trailproof-client-portal',
			[ $this, 'render_dashboard' ]
		);
	}

	public function enqueue_assets( string $hook ): void {
		if ( ! str_contains( $hook, 'trailproof' ) ) {
			return;
		}

		$asset_file = TRAILPROOF_DIR . 'build/admin/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'trailproof-admin',
			TRAILPROOF_URL . 'build/admin/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		$settings = (array) get_option( 'trailproof_settings', [] );
		wp_localize_script(
			'trailproof-admin',
			'trailproofData',
			[
				'restUrl'          => rest_url( 'trailproof/v1/' ),
				'nonce'            => wp_create_nonce( 'wp_rest' ),
				'version'          => TRAILPROOF_VERSION,
				'axeUrl'           => TRAILPROOF_URL . 'build/axe.min.js',
				'locale'           => str_replace( '_', '-', get_locale() ),
				'waveEnabled'      => ! empty( $settings['wave_api_key'] ),
				'claudeEnabled'    => ! empty( $settings['claude_api_key'] ),
				'whiteLabel'       => ! empty( $settings['white_label'] ),
				'fixesEnabled'     => (bool) ( $settings['fixes_enabled'] ?? true ),
				'gutenbergEnabled' => function_exists( 'use_block_editor_for_post_type' ),
				'elementorEnabled' => defined( 'ELEMENTOR_VERSION' ) || class_exists( '\Elementor\Plugin' ),
				'diviEnabled'      => defined( 'ET_BUILDER_VERSION' ) || function_exists( 'et_setup_theme' ),
			]
		);

		$css_file = TRAILPROOF_DIR . 'build/admin/index.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'trailproof-admin',
				TRAILPROOF_URL . 'build/admin/index.css',
				[],
				$asset['version']
			);
		}
	}

	public function render_dashboard(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div id="trailproof-app"></div>';
	}
}
