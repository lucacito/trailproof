<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Injects a scoped <style> block into <head> that overrides the text color for
 * the given CSS selector. Used for color-contrast fixes on shared elements
 * (headers, footers) where editing theme CSS directly is not an option.
 *
 * Payload: { "selector": "a.my-link", "color": "#848484" }
 */
class SetTextColorTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		$selector = sanitize_text_field( $payload['selector'] ?? '' );
		$color    = sanitize_hex_color( $payload['color'] ?? '' );

		if ( ! $selector || ! $color ) {
			return false;
		}

		$head_list = $dom->getElementsByTagName( 'head' );
		if ( $head_list->length === 0 ) {
			return false;
		}

		$css   = esc_attr( $selector ) . ' { color: ' . esc_attr( $color ) . ' !important; }';
		$style = $dom->createElement( 'style' );
		$style->setAttribute( 'data-trailproof', 'contrast-fix' );
		$style->appendChild( $dom->createTextNode( $css ) );

		$head_list->item( 0 )->appendChild( $style );

		return true;
	}
}
