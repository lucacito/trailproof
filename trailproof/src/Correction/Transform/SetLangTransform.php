<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Sets the lang attribute on the <html> element.
 * Selector in the correction record should be "html".
 * Payload: { "lang": "en" }
 */
class SetLangTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		$lang = sanitize_text_field( $payload['lang'] ?? '' );
		if ( ! $lang ) {
			return false;
		}

		$element->setAttribute( 'lang', $lang );
		return true;
	}
}
