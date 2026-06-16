<?php

declare(strict_types=1);

namespace Trailproof;

class Schema {

	/**
	 * Bump this integer whenever table structure changes.
	 * run_migrations() applies each version's changes in order.
	 */
	private const CURRENT_VERSION = 2;

	private const OPTION_KEY = 'trailproof_schema_version';

	public static function get_schema_version(): int {
		return (int) get_option( self::OPTION_KEY, 0 );
	}

	public static function run_migrations(): void {
		$installed = self::get_schema_version();

		if ( $installed < 1 ) {
			self::migrate_v1();
			update_option( self::OPTION_KEY, 1 );
		}

		if ( $installed < 2 ) {
			self::migrate_v2();
			update_option( self::OPTION_KEY, 2 );
		}
	}

	/**
	 * Add node_data_json to tp_issues.
	 * Stores per-node axe-core data (HTML snippet, fg/bg colors for contrast) needed by the decision UI.
	 */
	private static function migrate_v2(): void {
		global $wpdb;

		$column_exists = $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
			 WHERE TABLE_SCHEMA = DATABASE()
			 AND TABLE_NAME = %s
			 AND COLUMN_NAME = 'node_data_json'",
			$wpdb->prefix . 'tp_issues'
		) );

		if ( ! $column_exists ) {
			$wpdb->query( "ALTER TABLE {$wpdb->prefix}tp_issues ADD COLUMN node_data_json LONGTEXT DEFAULT NULL AFTER description" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		}
	}

	private static function migrate_v1(): void {
		global $wpdb;

		$c = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}tp_scans (
				id          bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				url         varchar(2083)       NOT NULL,
				post_id     bigint(20) UNSIGNED DEFAULT NULL,
				provider    varchar(20)         NOT NULL,
				score       tinyint(3) UNSIGNED DEFAULT NULL,
				summary_json longtext           DEFAULT NULL,
				created_at  datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				KEY provider (provider),
				KEY post_id  (post_id)
			) $c;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}tp_issues (
				id               bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scan_id          bigint(20) UNSIGNED NOT NULL,
				fingerprint      varchar(64)         NOT NULL,
				url              varchar(2083)       NOT NULL,
				post_id          bigint(20) UNSIGNED DEFAULT NULL,
				selector         text                NOT NULL,
				rule_id          varchar(100)        NOT NULL,
				wcag_sc          varchar(20)         DEFAULT NULL,
				bucket           char(1)             NOT NULL,
				severity         varchar(20)         NOT NULL DEFAULT 'moderate',
				priority_score   tinyint(3) UNSIGNED NOT NULL DEFAULT 50,
				status           varchar(20)         NOT NULL DEFAULT 'open',
				confirmed_by_json text               DEFAULT NULL,
				description      text                DEFAULT NULL,
				created_at       datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at       datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				UNIQUE KEY fingerprint (fingerprint),
				KEY scan_id (scan_id),
				KEY bucket  (bucket),
				KEY status  (status)
			) $c;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}tp_corrections (
				id             bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				fingerprint    varchar(64)         NOT NULL,
				post_id        bigint(20) UNSIGNED DEFAULT NULL,
				url            varchar(2083)       NOT NULL,
				selector       text                NOT NULL,
				transform_type varchar(50)         NOT NULL,
				payload_json   longtext            NOT NULL,
				original_json  longtext            NOT NULL,
				enabled        tinyint(1)          NOT NULL DEFAULT 1,
				created_by     bigint(20) UNSIGNED NOT NULL,
				created_at     datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP,
				decided_by     bigint(20) UNSIGNED DEFAULT NULL,
				decided_at     datetime            DEFAULT NULL,
				PRIMARY KEY (id),
				KEY fingerprint (fingerprint),
				KEY enabled     (enabled),
				KEY post_id     (post_id)
			) $c;"
		);

		// Append-only audit trail: never UPDATE or DELETE rows from this table.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}tp_decisions_log (
				id          bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				ts          datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP,
				user_id     bigint(20) UNSIGNED NOT NULL,
				action      varchar(50)         NOT NULL,
				fingerprint varchar(64)         NOT NULL,
				before_json longtext            DEFAULT NULL,
				after_json  longtext            DEFAULT NULL,
				note        text                DEFAULT NULL,
				PRIMARY KEY (id),
				KEY fingerprint (fingerprint),
				KEY user_id     (user_id),
				KEY ts          (ts)
			) $c;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}tp_reports (
				id           bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				type         varchar(30)         NOT NULL,
				snapshot_json longtext           NOT NULL,
				generated_at datetime            NOT NULL DEFAULT CURRENT_TIMESTAMP,
				generated_by bigint(20) UNSIGNED NOT NULL,
				PRIMARY KEY (id),
				KEY type         (type),
				KEY generated_at (generated_at)
			) $c;"
		);
	}
}
