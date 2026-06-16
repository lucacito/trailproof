<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Adds an aria-label attribute to any element.
 * General-purpose transform used for buttons, links, iframes, and other
 * interactive elements that have no accessible name.
 * Payload: { "aria_label": "Open navigation menu" }
 */
class AddAriaLabelTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		$label = sanitize_text_field( $payload['aria_label'] ?? '' );
		if ( ! $label ) {
			return false;
		}

		$element->setAttribute( 'aria-label', $label );
		return true;
	}
}
