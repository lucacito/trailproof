<?php

declare(strict_types=1);

namespace Trailproof\Scan;

use Trailproof\Issue\BucketClassifier;
use Trailproof\Issue\Fingerprint;
use Trailproof\Issue\WcagMap;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

/**
 * Second-opinion scan via the WebAIM WAVE API (bring-your-own-key).
 *
 * IMPORTANT: This relay uses the user's own WAVE API key, obtained and paid
 * for directly from WebAIM (wave.webaim.org). Before enabling this in production,
 * review WebAIM's API Terms of Use at https://wave.webaim.org/api/
 * to confirm your usage is permitted.
 *
 * Trailproof does NOT resell or proxy WAVE credits; each API call is made
 * using the key the site owner stored in their own settings.
 */
class WaveProvider implements ScanProvider {

	private const API_URL = 'https://wave.webaim.org/api/request';

	// WAVE category → severity mapping
	private const CATEGORY_SEVERITY = [
		'error'          => 'serious',
		'contrast'       => 'serious',
		'alert'          => 'moderate',
		'feature'        => 'minor',
		'structure'      => 'minor',
		'aria'           => 'moderate',
	];

	// Best-effort mapping from WAVE item types to our rule IDs
	private const WAVE_TYPE_TO_RULE = [
		'alt_missing'        => 'image-alt',
		'alt_link_missing'   => 'image-alt',
		'label_missing'      => 'label',
		'empty_link'         => 'link-name',
		'empty_button'       => 'button-name',
		'language_missing'   => 'html-has-lang',
		'title_missing'      => 'document-title',
		'skip_disabled'      => 'bypass',
		'contrast'           => 'color-contrast',
		'heading_possible'   => 'heading-order',
	];

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo,
		private readonly string          $api_key
	) {}

	public function getLabel(): string {
		return 'WAVE (WebAIM API)';
	}

	public function getKey(): string {
		return 'wave';
	}

	public function isAvailable(): bool {
		return $this->api_key !== '';
	}

	public function scan( string $url, int $post_id ): ?int {
		if ( ! $this->isAvailable() ) {
			return null;
		}

		$response = wp_remote_get(
			add_query_arg( [
				'key'      => $this->api_key,
				'url'      => rawurlencode( $url ),
				'format'   => 'json',
				'reporttype' => '1',    // full WAVE report
			], self::API_URL ),
			[ 'timeout' => 30 ]
		);

		if ( is_wp_error( $response ) ) {
			return null;
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== (int) $code ) {
			return null;
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( ! is_array( $data ) || ! isset( $data['categories'] ) ) {
			return null;
		}

		$scan_id = $this->scan_repo->create( $url, $post_id, $this->getKey() );
		$issues  = $this->parse_wave_response( $data, $url, $post_id );
		$count   = 0;

		foreach ( $issues as $issue ) {
			$issue['scan_id']  = $scan_id;
			$issue['provider'] = $this->getKey();
			$this->issue_repo->upsert( $issue );
			++$count;
		}

		$critical = count( array_filter( $issues, fn( $i ) => $i['severity'] === 'critical' ) );
		$serious  = count( array_filter( $issues, fn( $i ) => $i['severity'] === 'serious' ) );
		$score    = max( 0, 100 - ( $critical * 10 ) - ( $serious * 5 ) - ( ( $count - $critical - $serious ) * 2 ) );

		$this->scan_repo->update_score( $scan_id, $score, [
			'issue_count' => $count,
			'critical'    => $critical,
			'serious'     => $serious,
		] );

		return $scan_id;
	}

	/**
	 * Parse a WAVE API JSON response into our internal issue format.
	 *
	 * @return array<int, array>
	 */
	private function parse_wave_response( array $data, string $url, int $post_id ): array {
		$issues     = [];
		$categories = $data['categories'] ?? [];

		foreach ( $categories as $cat_key => $category ) {
			if ( empty( $category['items'] ) || ! is_array( $category['items'] ) ) {
				continue;
			}

			$severity = self::CATEGORY_SEVERITY[ $cat_key ] ?? 'minor';

			foreach ( $category['items'] as $type => $item ) {
				if ( empty( $item['count'] ) || (int) $item['count'] === 0 ) {
					continue;
				}

				$rule_id = self::WAVE_TYPE_TO_RULE[ $type ] ?? 'wave-' . $type;
				$wcag    = WcagMap::get( $rule_id );
				$bucket  = BucketClassifier::classify( $rule_id );

				// WAVE doesn't return per-element selectors in the basic API response;
				// use the item type as the selector for fingerprinting. If WAVE returns
				// xpaths in a future version, swap this out.
				$selector = 'wave:' . $type;

				$issues[] = [
					'fingerprint'    => Fingerprint::compute( $selector, $rule_id, $post_id, $url ),
					'url'            => $url,
					'post_id'        => $post_id,
					'selector'       => $selector,
					'rule_id'        => $rule_id,
					'wcag_sc'        => $wcag['wcag_sc'],
					'bucket'         => $bucket,
					'severity'       => $severity,
					'priority_score' => BucketClassifier::priority_score( $rule_id, $severity, $bucket ),
					'description'    => $item['description'] ?? $wcag['description'],
				];
			}
		}

		return $issues;
	}
}
