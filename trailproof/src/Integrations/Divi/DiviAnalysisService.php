<?php

declare(strict_types=1);

namespace Trailproof\Integrations\Divi;

use Trailproof\Integrations\BuilderIntegration;

/**
 * Core Divi analysis service — implements BuilderIntegration.
 *
 * Computes the Divi Accessibility Score and per-module status by combining:
 *   1. DiviDetector: which modules appear in post content.
 *   2. tp_corrections: which modules have enabled TrailProof corrections.
 *   3. DiviModuleRegistry: enhancement metadata displayed in the UI.
 *
 * Score = optimized_modules / detected_modules * 100
 *   - "Optimized" means at least one enabled correction exists for that module.
 *   - "Needs review" means detected in content but no corrections yet.
 *
 * History is sourced from tp_corrections (widget_aria_pattern type) so it
 * reflects real remediation activity rather than synthetic data.
 */
class DiviAnalysisService implements BuilderIntegration {

	public function __construct( private readonly DiviDetector $detector ) {}

	// ── BuilderIntegration ───────────────────────────────────────────────────

	public function get_key(): string {
		return 'divi';
	}

	public function get_label(): string {
		return 'Divi 5';
	}

	public function is_active(): bool {
		return $this->detector->is_active();
	}

	public function get_analysis(): array {
		return $this->compute_analysis();
	}

	// ── Internal ─────────────────────────────────────────────────────────────

	private function compute_analysis(): array {
		$divi_active = $this->detector->is_active();
		$version     = $this->detector->get_version();

		if ( ! $divi_active ) {
			return [
				'divi_active'          => false,
				'divi_version'         => null,
				'score'                => null,
				'modules_analyzed'     => 0,
				'modules_optimized'    => 0,
				'modules_needs_review' => 0,
				'modules'              => [],
				'history'              => [],
			];
		}

		$registry         = DiviModuleRegistry::get_modules();
		$detected_in_site = $this->detector->detect_modules_in_content();
		$enabled_patterns = $this->get_enabled_correction_patterns();

		$modules   = [];
		$optimized = 0;
		$analyzed  = 0;

		foreach ( $registry as $key => $def ) {
			$is_detected = isset( $detected_in_site[ $key ] );
			$has_pattern = $def['pattern'] !== null;
			$is_enabled  = $has_pattern && in_array( $def['pattern'], $enabled_patterns, true );

			if ( $is_detected ) {
				++$analyzed;
				if ( $is_enabled ) {
					++$optimized;
				}
			}

			$status = match ( true ) {
				$is_detected && $is_enabled        => 'optimized',
				$is_detected && ! $is_enabled      => 'needs_review',
				! $is_detected && $has_pattern     => 'not_detected',
				default                             => 'not_detected',
			};

			$modules[] = [
				'key'          => $key,
				'label'        => $def['label'],
				'detected'     => $is_detected,
				'supported'    => $def['supported'],
				'status'       => $status,
				'page_count'   => $detected_in_site[ $key ] ?? 0,
				'enhancements' => $def['enhancements'],
				'aria_attrs'   => $def['aria_attrs'],
				'before_code'  => $def['before_code'],
				'after_code'   => $def['after_code'],
				'explanation'  => $def['explanation'],
			];
		}

		$score = $analyzed > 0 ? (int) round( ( $optimized / $analyzed ) * 100 ) : null;

		return [
			'divi_active'          => true,
			'divi_version'         => $version,
			'score'                => $score,
			'modules_analyzed'     => $analyzed,
			'modules_optimized'    => $optimized,
			'modules_needs_review' => max( 0, $analyzed - $optimized ),
			'modules'              => $modules,
			'history'              => $this->get_history(),
		];
	}

	/**
	 * Returns distinct pattern values from enabled widget_aria_pattern corrections.
	 * e.g. [ 'divi-accordion', 'divi-tabs', 'divi-menu' ]
	 */
	private function get_enabled_correction_patterns(): array {
		global $wpdb;

		$table = $wpdb->prefix . 'tp_corrections';
		$rows  = $wpdb->get_col(
			"SELECT DISTINCT payload_json FROM {$table}
			 WHERE transform_type = 'widget_aria_pattern'
			 AND enabled = 1"
		);

		$patterns = [];
		foreach ( $rows as $json ) {
			$payload = json_decode( $json, true );
			if ( isset( $payload['pattern'] ) ) {
				$patterns[] = $payload['pattern'];
			}
		}

		return $patterns;
	}

	/**
	 * Returns the 10 most recent Divi correction events for the history feed.
	 */
	private function get_history(): array {
		global $wpdb;

		$table = $wpdb->prefix . 'tp_corrections';
		$rows  = $wpdb->get_results(
			"SELECT payload_json, created_at, url
			 FROM {$table}
			 WHERE transform_type = 'widget_aria_pattern'
			 ORDER BY created_at DESC
			 LIMIT 10",
			ARRAY_A
		);

		$registry = DiviModuleRegistry::get_modules();
		$history  = [];

		foreach ( $rows as $row ) {
			$payload = json_decode( $row['payload_json'] ?? '{}', true );
			$pattern = $payload['pattern'] ?? '';

			// Resolve pattern → module label
			$label = $pattern;
			foreach ( $registry as $def ) {
				if ( $def['pattern'] === $pattern ) {
					$label = $def['label'];
					break;
				}
			}

			$history[] = [
				'module' => $label,
				'action' => 'Improvements applied',
				'url'    => $row['url'] ?? '',
				'date'   => $row['created_at'] ?? '',
			];
		}

		return $history;
	}
}
