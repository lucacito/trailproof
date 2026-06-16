<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Sets a meaningful alt attribute on an image.
 * This is a Bucket B transform — the alt text is human-authored.
 * Selector: the img element (e.g. "#hero-img", "img.et-pb-image").
 * Payload: { "alt": "Sunrise over the Grand Canyon" }
 */
class SetAltTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element || strtolower( $element->nodeName ) !== 'img' ) {
			return false;
		}

		$alt = $payload['alt'] ?? null;
		if ( $alt === null ) {
			return false;
		}

		$element->setAttribute( 'alt', sanitize_text_field( (string) $alt ) );
		return true;
	}
}
