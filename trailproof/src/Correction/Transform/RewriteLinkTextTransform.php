<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Gives a link an accessible name.
 *
 * Strategy:
 * - If the link is pure text (no child elements): replaces the visible text.
 * - If the link has child elements (images, spans): adds aria-label so the visible
 *   presentation is preserved but screen readers get the correct name.
 *
 * Selector: the <a> element.
 * Payload: { "text": "Read more about our pricing plans" }
 */
class RewriteLinkTextTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element || strtolower( $element->nodeName ) !== 'a' ) {
			return false;
		}

		$text = sanitize_text_field( $payload['text'] ?? '' );
		if ( ! $text ) {
			return false;
		}

		$has_element_children = false;
		foreach ( $element->childNodes as $child ) {
			if ( $child->nodeType === XML_ELEMENT_NODE ) {
				$has_element_children = true;
				break;
			}
		}

		if ( $has_element_children ) {
			// Don't touch visual content; set aria-label instead
			$element->setAttribute( 'aria-label', $text );
		} else {
			// Replace text content directly
			while ( $element->firstChild ) {
				$element->removeChild( $element->firstChild );
			}
			$element->appendChild( $dom->createTextNode( $text ) );
		}

		return true;
	}
}
