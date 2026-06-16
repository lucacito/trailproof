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
 * Server-side structural pass targeting Gutenberg (Block Editor) markup patterns.
 *
 * Complements the axe-core scan with checks that are specific to how Gutenberg
 * renders its blocks: Image, Gallery, Button, and Cover patterns that require
 * block context to detect reliably. Runs server-side via DOMDocument so it can
 * execute during WP-Cron scheduled scans without a browser.
 */
class GutenbergProvider implements ScanProvider {

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo
	) {}

	public function getLabel(): string {
		return 'Gutenberg (Block Editor)';
	}

	public function getKey(): string {
		return 'gutenberg';
	}

	public function isAvailable(): bool {
		// Block editor is available in all WordPress 5.0+ installs.
		return function_exists( 'use_block_editor_for_post_type' );
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

		// Only proceed if the page actually contains Gutenberg block markup.
		if ( ! $this->has_gutenberg_markup( $html ) ) {
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
			$this->check_image_blocks( $xpath, $url, $post_id ),
			$this->check_gallery_blocks( $xpath, $url, $post_id ),
			$this->check_button_blocks( $xpath, $url, $post_id ),
			$this->check_cover_blocks( $xpath, $url, $post_id )
		);
	}

	// -------------------------------------------------------------------------
	// Individual checks
	// -------------------------------------------------------------------------

	private function check_image_blocks( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//figure[contains(concat(" ",normalize-space(@class)," ")," wp-block-image ")]//img[not(@alt)]'
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
				'gutenberg-image-alt',
				$url,
				$post_id,
				'critical'
			);
		}
		return $issues;
	}

	private function check_gallery_blocks( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//figure[contains(concat(" ",normalize-space(@class)," ")," wp-block-gallery ")]//img[not(@alt)]'
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
				'gutenberg-gallery-alt',
				$url,
				$post_id,
				'critical'
			);
		}
		return $issues;
	}

	private function check_button_blocks( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues  = [];
		$generic = [ 'click here', 'here', 'read more', 'more', 'learn more', 'details', 'button' ];
		$nodes   = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," wp-block-button ")]//a'
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
				$issues[] = $this->make_issue( $selector, 'gutenberg-button-text', $url, $post_id, 'serious' );
				continue;
			}

			if ( $aria === '' && in_array( strtolower( $text ), $generic, true ) ) {
				$issues[] = $this->make_issue( $selector, 'gutenberg-button-text', $url, $post_id, 'moderate' );
			}
		}
		return $issues;
	}

	private function check_cover_blocks( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," wp-block-cover ")]//img[not(@alt)]'
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
				'gutenberg-cover-alt',
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

	private function has_gutenberg_markup( string $html ): bool {
		return str_contains( $html, 'wp-block-' ) || str_contains( $html, '<!-- wp:' );
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
