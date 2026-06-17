<?php

declare(strict_types=1);

namespace Trailproof\Scan;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;
use Trailproof\Issue\BucketClassifier;
use Trailproof\Issue\Fingerprint;
use Trailproof\Issue\WcagMap;
use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

/**
 * Server-side structural pass using PHP DOMDocument + DOMXPath.
 *
 * Detects the subset of WCAG issues that are fully machine-detectable from HTML
 * alone (no rendered styles): missing lang, missing alt, empty links, heading
 * order, unlabeled form fields, missing landmarks, generic link text, missing
 * skip link.  Used for WP-Cron regression checks between full axe-core scans.
 */
class StaticProvider implements ScanProvider {

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo
	) {}

	public function getLabel(): string {
		return 'Static (DOMDocument)';
	}

	public function getKey(): string {
		return 'static';
	}

	public function isAvailable(): bool {
		return class_exists( DOMDocument::class );
	}

	public function scan( string $url, int $post_id ): ?int {
		$response = wp_remote_get(
			$url,
			[
				'timeout'     => 30,
				'sslverify'   => apply_filters( 'trailproof_http_sslverify', true ),
				'redirection' => 3,
			]
		);

		if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return null;
		}

		$html    = wp_remote_retrieve_body( $response );
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

	/**
	 * Analyze raw HTML string and return an array of issue data arrays.
	 * Public so it can be unit-tested directly without HTTP.
	 */
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
			$this->check_html_lang( $xpath, $url, $post_id ),
			$this->check_images( $xpath, $url, $post_id ),
			$this->check_links( $xpath, $url, $post_id ),
			$this->check_headings( $xpath, $url, $post_id ),
			$this->check_labels( $xpath, $url, $post_id ),
			$this->check_landmarks( $xpath, $url, $post_id ),
			$this->check_divi_widgets( $xpath, $url, $post_id ),
			$this->check_pdf_links( $xpath, $url, $post_id )
		);
	}

	// -------------------------------------------------------------------------
	// Individual checks
	// -------------------------------------------------------------------------

	private function check_html_lang( DOMXPath $xpath, string $url, int $post_id ): array {
		$nodes = $xpath->query( '//html[not(@lang) or normalize-space(@lang)=""]' );
		if ( $nodes && $nodes->length > 0 ) {
			return [ $this->make_issue( 'html', 'html-has-lang', $url, $post_id, 'serious' ) ];
		}
		return [];
	}

	private function check_images( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query( '//img[not(@alt)]' );
		if ( ! $nodes ) {
			return [];
		}
		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$issues[] = $this->make_issue(
				$this->build_selector( $node ),
				'image-alt',
				$url,
				$post_id,
				'critical'
			);
		}
		return $issues;
	}

	private function check_links( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues  = [];
		$generic = [ 'read more', 'click here', 'here', 'more', 'learn more', 'details', 'info', 'link' ];
		$nodes   = $xpath->query( '//a[@href]' );
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
				// No accessible name at all — empty link
				$issues[] = $this->make_issue( $selector, 'link-name', $url, $post_id, 'serious' );
				continue;
			}

			if ( $aria === '' && in_array( strtolower( $text ), $generic, true ) ) {
				$issues[] = $this->make_issue( $selector, 'link-in-text-block', $url, $post_id, 'moderate' );
			}
		}

		return $issues;
	}

	private function check_headings( DOMXPath $xpath, string $url, int $post_id ): array {
		$nodes = $xpath->query( '//h1|//h2|//h3|//h4|//h5|//h6' );
		if ( ! $nodes || $nodes->length === 0 ) {
			return [];
		}

		$levels = [];
		foreach ( $nodes as $node ) {
			$levels[] = (int) substr( $node->nodeName, 1 );
		}

		$prev = 0;
		foreach ( $levels as $level ) {
			if ( $prev > 0 && $level > $prev + 1 ) {
				// Report the selector of the first offending heading
				return [ $this->make_issue( "h{$level}", 'heading-order', $url, $post_id, 'moderate' ) ];
			}
			$prev = $level;
		}

		return [];
	}

	private function check_labels( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$nodes  = $xpath->query(
			'//input[not(@type="hidden") and not(@type="submit") and not(@type="button") and not(@type="reset") and not(@type="image")]
			| //select
			| //textarea'
		);
		if ( ! $nodes ) {
			return [];
		}

		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}

			// Explicit aria-label or aria-labelledby
			if ( $node->getAttribute( 'aria-label' ) || $node->getAttribute( 'aria-labelledby' ) ) {
				continue;
			}

			// title attribute serves as accessible name
			if ( $node->getAttribute( 'title' ) ) {
				continue;
			}

			// Explicit <label for="id">
			$id = $node->getAttribute( 'id' );
			if ( $id ) {
				$label_nodes = $xpath->query( "//label[@for='" . addslashes( $id ) . "']" );
				if ( $label_nodes && $label_nodes->length > 0 ) {
					continue;
				}
			}

			// Wrapped in a <label>
			$ancestor   = $node->parentNode;
			$in_label   = false;
			$depth      = 0;
			while ( $ancestor instanceof DOMNode && $depth < 10 ) {
				if ( $ancestor->nodeName === 'label' ) {
					$in_label = true;
					break;
				}
				$ancestor = $ancestor->parentNode;
				++$depth;
			}
			if ( $in_label ) {
				continue;
			}

			$issues[] = $this->make_issue(
				$this->build_selector( $node ),
				'label',
				$url,
				$post_id,
				'critical'
			);
		}

		return $issues;
	}

	private function check_landmarks( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];

		// Main landmark
		$main = $xpath->query( '//*[@role="main"] | //main' );
		if ( ! $main || $main->length === 0 ) {
			$issues[] = $this->make_issue( 'body', 'landmark-one-main', $url, $post_id, 'moderate' );
		}

		// Skip link (bypass): an anchor near the top with href="#..." and "skip" or "main" in text
		$skip = $xpath->query(
			'//a[starts-with(@href,"#") and (
				contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"skip") or
				contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"main content")
			)]'
		);
		if ( ! $skip || $skip->length === 0 ) {
			$issues[] = $this->make_issue( 'body', 'bypass', $url, $post_id, 'moderate' );
		}

		return $issues;
	}

	/**
	 * Detect Divi module containers that are missing their required ARIA patterns.
	 * One issue per pattern per page — the widget_aria_pattern transform fixes all
	 * matching containers in one pass at render time.
	 */
	private function check_divi_widgets( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];

		// Accordion: container present but titles lack aria-expanded
		$nodes = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_accordion ")]
			 [descendant::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_title ")
			   and not(@aria-expanded)]]'
		);
		if ( $nodes && $nodes->length > 0 ) {
			$issues[] = $this->make_issue( 'div.et_pb_accordion', 'divi-accordion', $url, $post_id, 'serious' );
		}

		// Tabs: tabs_controls list lacks role="tablist"
		$nodes = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_tabs ")]
			 [descendant::ul[contains(concat(" ",normalize-space(@class)," ")," et_pb_tabs_controls ")
			   and not(@role="tablist")]]'
		);
		if ( $nodes && $nodes->length > 0 ) {
			$issues[] = $this->make_issue( 'div.et_pb_tabs', 'divi-tabs', $url, $post_id, 'serious' );
		}

		// Toggle (standalone — not inside an accordion wrapper)
		$nodes = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle ")
			   and not(ancestor::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_accordion ")])]
			 [descendant::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_title ")
			   and not(@aria-expanded)]]'
		);
		if ( $nodes && $nodes->length > 0 ) {
			$issues[] = $this->make_issue( 'div.et_pb_toggle', 'divi-toggle', $url, $post_id, 'serious' );
		}

		// Menu: sub-menu parent links lack aria-haspopup
		$nodes = $xpath->query(
			'//nav[contains(concat(" ",normalize-space(@class)," ")," et_pb_menu ")]
			 [descendant::li[contains(concat(" ",normalize-space(@class)," ")," menu-item-has-children ")
			   and not(descendant::a[@aria-haspopup])]]'
		);
		if ( $nodes && $nodes->length > 0 ) {
			$issues[] = $this->make_issue( 'nav.et_pb_menu', 'divi-menu', $url, $post_id, 'moderate' );
		}

		// Gallery: grid lacks role="list"
		$nodes = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_gallery_grid ")
			   and not(@role="list")]'
		);
		if ( $nodes && $nodes->length > 0 ) {
			$issues[] = $this->make_issue( 'div.et_pb_gallery_grid', 'divi-gallery', $url, $post_id, 'moderate' );
		}

		return $issues;
	}

	/**
	 * Flag links to PDF files — they are frequently untagged and inaccessible.
	 * One issue per unique PDF href so the worklist gives individual remediation targets.
	 */
	private function check_pdf_links( DOMXPath $xpath, string $url, int $post_id ): array {
		$issues = [];
		$seen   = [];
		$nodes  = $xpath->query(
			'//a[@href and (
				contains(translate(@href,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),".pdf")
			)]'
		);

		if ( ! $nodes ) {
			return [];
		}

		foreach ( $nodes as $node ) {
			if ( ! ( $node instanceof DOMElement ) ) {
				continue;
			}
			$href = trim( $node->getAttribute( 'href' ) );
			if ( isset( $seen[ $href ] ) ) {
				continue;
			}
			$seen[ $href ] = true;
			$selector      = $this->build_selector( $node );
			$issues[]      = $this->make_issue( $selector, 'pdf-untagged-link', $url, $post_id, 'serious' );
		}

		return $issues;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private function make_issue( string $selector, string $rule_id, string $url, int $post_id, string $severity ): array {
		$bucket = BucketClassifier::classify( $rule_id );
		$wcag   = WcagMap::get( $rule_id );

		return [
			'fingerprint'   => Fingerprint::compute( $selector, $rule_id, $post_id, $url ),
			'url'           => $url,
			'post_id'       => $post_id,
			'selector'      => $selector,
			'rule_id'       => $rule_id,
			'wcag_sc'       => $wcag['wcag_sc'],
			'bucket'        => $bucket,
			'severity'      => $severity,
			'priority_score' => BucketClassifier::priority_score( $rule_id, $severity, $bucket ),
			'description'   => $wcag['description'],
		];
	}

	/**
	 * Best-effort CSS selector for a DOM element: stable enough for fingerprinting,
	 * useful enough for display. Prefers #id, then tag.first-class, then positional.
	 */
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

		// name attribute for form fields
		if ( $name = $node->getAttribute( 'name' ) ) {
			return "{$tag}[name=\"{$name}\"]";
		}

		// Positional fallback
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
