<?php
/**
 * Fires when the plugin is deleted (not deactivated) via the WordPress admin.
 * Drops all plugin database tables and removes all stored options.
 *
 * All six tp_* tables and both plugin options are removed.
 * Once deleted, this data cannot be recovered — this is intentional.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$tables = [
	$wpdb->prefix . 'tp_decisions_log', // Must go before tp_issues (no FK, but logical dependency)
	$wpdb->prefix . 'tp_corrections',
	$wpdb->prefix . 'tp_client_tokens',
	$wpdb->prefix . 'tp_reports',
	$wpdb->prefix . 'tp_issues',
	$wpdb->prefix . 'tp_scans',
];

foreach ( $tables as $table ) {
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
}

delete_option( 'trailproof_settings' );
delete_option( 'trailproof_schema_version' );
