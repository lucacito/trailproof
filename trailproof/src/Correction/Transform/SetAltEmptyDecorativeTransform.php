<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Marks an image as decorative by setting alt="" and adding role="presentation".
 * This is a Bucket A transform — only applied to images confirmed as decorative.
 * Selector: the img element.
 * Payload: {} (no payload needed — empty alt is the whole fix)
 */
class SetAltEmptyDecorativeTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element || strtolower( $element->nodeName ) !== 'img' ) {
			return false;
		}

		$element->setAttribute( 'alt', '' );
		$element->setAttribute( 'role', 'presentation' );
		return true;
	}
}
