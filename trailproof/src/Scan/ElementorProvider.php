<?php

declare(strict_types=1);

namespace Trailproof\Scan;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Trailproof\Issue\BucketClassifier;
use Trailproof\Issue\Fingerprint;
use Trailproof\Issue\WcagMap;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

/**
 * Server-side structural pass targeting Elementor widget patterns.
 *
 * Detects accessibility issues that are specific to how Elementor renders its
 * widgets: Image, Button, Image Carousel, and Icon Box patterns. Skips pages
 * that do not contain Elementor markup so it adds no overhead for non-Elementor
 * installs. Runs server-side via DOMDocument; compatible with WP-Cron.
 */
class ElementorProvider implements ScanProvider {

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo
	) {}

	public function getLabel(): string {
		return 'Elementor';
	}

	public function getKey(): string {
		return 'elementor';
	}

	public function isAvailable(): bool {
		// Elementor defines a plugin constant when active; fall back to class check.
		return defined( 'ELEMENTOR_VERSION' ) || class_exists( '\Elementor\Plugin' );
	}

	public function scan( string $url, int $post_id ): ?int {
		$response = wp_remote_get(
			$url,
			[ 'timeout' => 30, 'sslverify' => false, 'redirection' => 3 ]
		);

		if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return null;
		}

		$html = wp_remote_retrieve_body( $response );

		// Only scan pages that actually contain Elementor widget markup.
		if ( ! $this->has_elementor_markup( $html ) ) {
			return null;
		}

		$scan_id = $this->scan_repo->create( $url, $post_id, $this->getKey() );
		$issues  = $this->analyze( $html, $url, $post_id );
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

	public function analyze( string $html, string $url, int $post_id ): array {
		if ( '' === trim( $html ) ) {
			return [];
		}

		$dom = new DOMDocument();
		libxml_use_internal_errors( true );
		$dom->loadHTML( '<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR );
		libxml_clear_errors();

		$xpath = new DOMXPath( $dom );

		return array_merge(
			$this->check_image_widgets( $xpath, $url, $post_id ),
			$this->check_button_widgets( $xpath, $url, $post_id ),
			$this->check_carousel_widgets( $xpath, $url, $post_id ),
			$this->check_icon_box_widgets( $xpath, $url, $post_id )
		);
	}

	// -------------------------------------------------------------------------
	// Individual checks
	// -------------------------------------------------------------------------

	private function check_image_widgets( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," elementor-widget-image ")]//img[not(@alt)]'
		);
		if ( ! $nodes ) {
			return [];
		}
		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$issues[] = $this->make_issue(
				$this->build_selector( $node ),
				'elementor-image-alt',
				$url,
				$post_id,
				'critical'
			);
		}
		return $issues;
	}

	private function check_button_widgets( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues  = [];
		$generic = [ 'click here', 'here', 'read more', 'more', 'learn more', 'details', 'button', 'submit' ];
		$nodes   = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," elementor-widget-button ")]//a'
		);
		if ( ! $nodes ) {
			return [];
		}
		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$text     = trim( $node->textContent );
			$aria     = trim( $node->getAttribute( 'aria-label' ) );
			$selector = $this->build_selector( $node );

			if ( $text === '' && $aria === '' ) {
				$issues[] = $this->make_issue( $selector, 'elementor-button-text', $url, $post_id, 'serious' );
				continue;
			}

			if ( $aria === '' && in_array( strtolower( $text ), $generic, true ) ) {
				$issues[] = $this->make_issue( $selector, 'elementor-button-text', $url, $post_id, 'moderate' );
			}
		}
		return $issues;
	}

	/**
	 * Elementor Image Carousel — the slide track should declare role="list" and each
	 * slide should have role="listitem" so screen readers can count and navigate slides.
	 */
	private function check_carousel_widgets( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," elementor-widget-image-carousel ")]
			 [not(descendant::*[@role="list"])]'
		);
		if ( ! $nodes ) {
			return [];
		}
		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$issues[] = $this->make_issue(
				$this->build_selector( $node ),
				'elementor-carousel-aria',
				$url,
				$post_id,
				'serious'
			);
		}
		return $issues;
	}

	/**
	 * Elementor Icon Box — the wrapping link has no accessible name beyond the icon
	 * glyph; the title text inside the box is often the right accessible name.
	 */
	private function check_icon_box_widgets( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," elementor-widget-icon-box ")]
			 //a[not(@aria-label) and not(@aria-labelledby)]
			   [not(normalize-space(.))]'
		);
		if ( ! $nodes ) {
			return [];
		}
		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$issues[] = $this->make_issue(
				$this->build_selector( $node ),
				'elementor-icon-box-name',
				$url,
				$post_id,
				'serious'
			);
		}
		return $issues;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private function has_elementor_markup( string $html ): bool {
		return str_contains( $html, 'elementor-widget-' ) || str_contains( $html, 'elementor-section' );
	}

	private function make_issue( string $selector, string $rule_id, string $url, int $post_id, string $severity ): array {
		$bucket = BucketClassifier::classify( $rule_id );
		$wcag   = WcagMap::get( $rule_id );

		return [
			'fingerprint'    => Fingerprint::compute( $selector, $rule_id, $post_id, $url ),
			'url'            => $url,
			'post_id'        => $post_id,
			'selector'       => $selector,
			'rule_id'        => $rule_id,
			'wcag_sc'        => $wcag['wcag_sc'],
			'bucket'         => $bucket,
			'severity'       => $severity,
			'priority_score' => BucketClassifier::priority_score( $rule_id, $severity, $bucket ),
			'description'    => $wcag['description'],
		];
	}

	private function build_selector( DOMElement $node ): string {
		$tag = strtolower( $node->nodeName );

		if ( $id = $node->getAttribute( 'id' ) ) {
			return '#' . $id;
		}

		$classes = trim( $node->getAttribute( 'class' ) );
		if ( $classes ) {
			$first = preg_split( '/\s+/', $classes )[0];
			if ( $first ) {
				return $tag . '.' . $first;
			}
		}

		$position = 1;
		$sibling  = $node->previousSibling;
		while ( $sibling ) {
			if ( $sibling->nodeName === $node->nodeName ) {
				++$position;
			}
			$sibling = $sibling->previousSibling;
		}

		return "{$tag}:nth-of-type({$position})";
	}
}
