<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Adds a landmark role to an existing element.
 * For main landmark: adds role="main" and id="main" (the skip-link target) to the element.
 * Does not wrap or move content — purely additive.
 * Selector: the Divi main content wrapper, e.g. "div.et-main-area" or "#page-container".
 * Payload: { "role": "main" }
 */
class AddLandmarkTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		$role = sanitize_text_field( $payload['role'] ?? '' );
		if ( ! $role ) {
			return false;
		}

		$element->setAttribute( 'role', $role );

		// If adding a main landmark, ensure it has an id so skip links can target it
		if ( $role === 'main' && ! $element->getAttribute( 'id' ) ) {
			$element->setAttribute( 'id', 'main' );
		}

		return true;
	}
}
