<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Sets the text content of the <title> element.
 * Used for document-title issues where a human supplies the correct title.
 * Ignores the $element parameter (which axe-core reports as "html") and
 * operates directly on <head><title> instead.
 *
 * Payload: { "title": "About Us | My Company" }
 */
class SetTitleTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		$title = sanitize_text_field( $payload['title'] ?? '' );
		if ( ! $title ) {
			return false;
		}

		$title_nodes = $dom->getElementsByTagName( 'title' );

		if ( $title_nodes->length > 0 ) {
			$title_el = $title_nodes->item( 0 );
			while ( $title_el->firstChild ) {
				$title_el->removeChild( $title_el->firstChild );
			}
			$title_el->appendChild( $dom->createTextNode( $title ) );
			return true;
		}

		// No <title> element — create one and append to <head>
		$head_nodes = $dom->getElementsByTagName( 'head' );
		if ( $head_nodes->length === 0 ) {
			return false;
		}

		$new_title = $dom->createElement( 'title' );
		$new_title->appendChild( $dom->createTextNode( $title ) );
		$head_nodes->item( 0 )->appendChild( $new_title );
		return true;
	}
}
