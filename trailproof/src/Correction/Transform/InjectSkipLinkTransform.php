<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Injects a skip-to-content link as the first child of <body>.
 * Also injects the necessary focus-reveal CSS into <head>.
 * Selector in the correction record should be "body".
 * Payload: { "target": "#main", "text": "Skip to main content" }
 */
class InjectSkipLinkTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element || strtolower( $element->nodeName ) !== 'body' ) {
			return false;
		}

		$target = sanitize_text_field( $payload['target'] ?? '#main' );
		$text   = sanitize_text_field( $payload['text'] ?? 'Skip to main content' );

		if ( ! $target || ! $text ) {
			return false;
		}

		// Don't inject if a skip link already exists
		$existing = $dom->getElementsByTagName( 'a' );
		foreach ( $existing as $a ) {
			$href = $a->getAttribute( 'href' );
			if ( str_starts_with( $href, '#' ) && str_contains( strtolower( $a->textContent ), 'skip' ) ) {
				return false;
			}
		}

		// Inject CSS into <head> for the focus-reveal pattern
		$heads = $dom->getElementsByTagName( 'head' );
		if ( $heads->length > 0 ) {
			$style = $dom->createElement( 'style' );
			$style->textContent = '.tp-skip-link{position:absolute;top:-40px;left:0;background:#fff;color:#1d2327;padding:.5rem 1rem;z-index:100000;font-weight:600;text-decoration:none;border:2px solid #1d2327}.tp-skip-link:focus{top:0}';
			$heads->item(0)->appendChild( $style );
		}

		// Build <a class="tp-skip-link" href="#main">Skip to main content</a>
		$link = $dom->createElement( 'a' );
		$link->setAttribute( 'href', $target );
		$link->setAttribute( 'class', 'tp-skip-link' );
		$link->textContent = $text;

		// Prepend to <body>
		if ( $element->firstChild ) {
			$element->insertBefore( $link, $element->firstChild );
		} else {
			$element->appendChild( $link );
		}

		return true;
	}
}
