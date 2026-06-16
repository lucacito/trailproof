<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Issue\BucketClassifier;
use Trailproof\Issue\Fingerprint;
use Trailproof\Issue\WcagMap;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;
use Trailproof\Scan\ElementorProvider;
use Trailproof\Scan\GutenbergProvider;
use Trailproof\Scan\WaveProvider;

class ScanRoutes {

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo
	) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/scans',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'list_scans' ],
					'permission_callback' => [ $this, 'require_editor' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create_scan' ],
					'permission_callback' => [ $this, 'require_editor' ],
					'args'                => [
						'url'      => [ 'required' => true, 'type' => 'string', 'format' => 'uri' ],
						'post_id'  => [ 'required' => true, 'type' => 'integer', 'minimum' => 0 ],
						'provider' => [ 'required' => false, 'type' => 'string', 'default' => 'axe', 'enum' => [ 'axe', 'static', 'wave', 'gutenberg', 'elementor' ] ],
					],
				],
			]
		);

		register_rest_route(
			$namespace,
			'/scans/(?P<id>\d+)/axe-results',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'store_axe_results' ],
				'permission_callback' => [ $this, 'require_editor' ],
				'args'                => [
					'id'      => [ 'required' => true, 'type' => 'integer', 'minimum' => 1 ],
					'url'     => [ 'required' => true, 'type' => 'string' ],
					'post_id' => [ 'required' => true, 'type' => 'integer', 'minimum' => 0 ],
					'results' => [ 'required' => true, 'type' => 'object' ],
				],
			]
		);
	}

	public function list_scans( \WP_REST_Request $request ): \WP_REST_Response {
		$scans = $this->scan_repo->get_recent( 50 );
		return new \WP_REST_Response( $scans, 200 );
	}

	public function create_scan( \WP_REST_Request $request ): \WP_REST_Response {
		$url      = esc_url_raw( $request->get_param( 'url' ) );
		$post_id  = (int) $request->get_param( 'post_id' );
		$provider = sanitize_key( $request->get_param( 'provider' ) );
		$run_now  = (bool) $request->get_param( 'run_now' );

		if ( ! $url ) {
			return new \WP_REST_Response( [ 'error' => 'Invalid URL.' ], 400 );
		}

		// WAVE: server-side scan executed synchronously when run_now=true
		if ( 'wave' === $provider && $run_now ) {
			$settings = (array) get_option( 'trailproof_settings', [] );
			$wave_key = $settings['wave_api_key'] ?? '';
			if ( '' === $wave_key ) {
				return new \WP_REST_Response( [ 'error' => 'WAVE API key not configured.' ], 400 );
			}
			$wave_provider = new WaveProvider( $this->scan_repo, $this->issue_repo, $wave_key );
			if ( ! $wave_provider->isAvailable() ) {
				return new \WP_REST_Response( [ 'error' => 'WAVE provider is not available.' ], 400 );
			}
			$scan_id = $wave_provider->scan( $url, $post_id );
			if ( ! $scan_id ) {
				return new \WP_REST_Response( [ 'error' => 'WAVE API call failed. Check your API key and that the URL is publicly accessible.' ], 502 );
			}
			return new \WP_REST_Response( [ 'scan_id' => $scan_id ], 201 );
		}

		// Gutenberg / Elementor: on-demand server-side DOMDocument scan.
		if ( in_array( $provider, [ 'gutenberg', 'elementor' ], true ) && $run_now ) {
			$server_provider = match ( $provider ) {
				'gutenberg' => new GutenbergProvider( $this->scan_repo, $this->issue_repo ),
				'elementor' => new ElementorProvider( $this->scan_repo, $this->issue_repo ),
			};
			if ( ! $server_provider->isAvailable() ) {
				return new \WP_REST_Response( [ 'error' => ucfirst( $provider ) . ' is not active on this site.' ], 400 );
			}
			$scan_id = $server_provider->scan( $url, $post_id );
			if ( ! $scan_id ) {
				return new \WP_REST_Response( [ 'error' => 'No ' . $provider . ' markup found on this page, or the page could not be fetched.' ], 200 );
			}
			return new \WP_REST_Response( [ 'scan_id' => $scan_id ], 201 );
		}

		$scan_id = $this->scan_repo->create( $url, $post_id, $provider );

		return new \WP_REST_Response( [ 'scan_id' => $scan_id ], 201 );
	}

	/**
	 * Receives axe-core violation results from the client-side iframe scan.
	 * The browser JS drives the scan and posts the raw axe output here for storage.
	 */
	public function store_axe_results( \WP_REST_Request $request ): \WP_REST_Response {
		$scan_id = (int) $request->get_param( 'id' );
		$url     = esc_url_raw( (string) $request->get_param( 'url' ) );
		$post_id = (int) $request->get_param( 'post_id' );
		$results = $request->get_param( 'results' );

		// Validate the scan record exists
		$scan = $this->scan_repo->get_by_id( $scan_id );
		if ( ! $scan ) {
			return new \WP_REST_Response( [ 'error' => 'Scan not found.' ], 404 );
		}

		$violations = is_array( $results['violations'] ?? null ) ? $results['violations'] : [];
		$count      = 0;
		$critical   = 0;
		$serious    = 0;

		foreach ( $violations as $violation ) {
			if ( ! is_array( $violation ) ) {
				continue;
			}

			$rule_id  = sanitize_key( $violation['id'] ?? '' );
			$impact   = sanitize_text_field( $violation['impact'] ?? 'moderate' );
			$help     = sanitize_text_field( $violation['help'] ?? '' );
			$nodes    = is_array( $violation['nodes'] ?? null ) ? $violation['nodes'] : [];

			if ( ! $rule_id ) {
				continue;
			}

			$severity = BucketClassifier::impact_to_severity( $impact );
			$bucket   = BucketClassifier::classify( $rule_id );
			$wcag     = WcagMap::get( $rule_id );

			foreach ( $nodes as $node ) {
				if ( ! is_array( $node ) ) {
					continue;
				}

				// axe-core target is an array of selectors; use the innermost
				$targets  = is_array( $node['target'] ?? null ) ? $node['target'] : [];
				$selector = is_string( end( $targets ) ) ? (string) end( $targets ) : '';
				if ( ! $selector ) {
					continue;
				}

				$fingerprint = Fingerprint::compute( $selector, $rule_id, $post_id, $url );

				// Capture per-node data for the decision UI (contrast colors, HTML snippet)
				$node_data = array_filter( [
					'html'             => sanitize_text_field( $node['html'] ?? '' ),
					'failure_summary'  => sanitize_text_field( $node['failureSummary'] ?? '' ),
					'fg_color'         => sanitize_text_field( $node['data']['fgColor'] ?? '' ),
					'bg_color'         => sanitize_text_field( $node['data']['bgColor'] ?? '' ),
					'contrast_ratio'   => is_numeric( $node['data']['contrastRatio'] ?? null )
						? (float) $node['data']['contrastRatio'] : null,
					'font_size'        => sanitize_text_field( $node['data']['fontSize'] ?? '' ),
					'font_weight'      => sanitize_text_field( $node['data']['fontWeight'] ?? '' ),
				] );

				$this->issue_repo->upsert( [
					'scan_id'        => $scan_id,
					'fingerprint'    => $fingerprint,
					'url'            => $url,
					'post_id'        => $post_id,
					'selector'       => $selector,
					'rule_id'        => $rule_id,
					'wcag_sc'        => $wcag['wcag_sc'],
					'bucket'         => $bucket,
					'severity'       => $severity,
					'priority_score' => BucketClassifier::priority_score( $rule_id, $severity, $bucket ),
					'description'    => $wcag['description'] ?? sanitize_text_field( $help ),
					'node_data_json' => ! empty( $node_data ) ? $node_data : null,
					'provider'       => 'axe',
				] );

				++$count;
				if ( $severity === 'critical' ) { ++$critical; }
				if ( $severity === 'serious' )  { ++$serious; }
			}
		}

		$score = max( 0, 100 - ( $critical * 10 ) - ( $serious * 5 ) - ( ( $count - $critical - $serious ) * 2 ) );
		$this->scan_repo->update_score( $scan_id, $score, [
			'issue_count' => $count,
			'critical'    => $critical,
			'serious'     => $serious,
			'passes'      => count( is_array( $results['passes'] ?? null ) ? $results['passes'] : [] ),
		] );

		return new \WP_REST_Response( [ 'stored' => $count ], 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
