<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Adds an autocomplete attribute to a form input.
 * If payload omits "autocomplete", the value is derived from the element's
 * type and name attributes.
 *
 * Payload: { "autocomplete": "email" }  (optional — transform self-derives if absent)
 */
class SetFormAutocompleteTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		// Skip if already set
		if ( $element->getAttribute( 'autocomplete' ) ) {
			return false;
		}

		$value = sanitize_text_field( $payload['autocomplete'] ?? '' );

		if ( ! $value ) {
			$type = strtolower( $element->getAttribute( 'type' ) );
			$name = strtolower( $element->getAttribute( 'name' ) );

			if ( $type === 'email' || str_contains( $name, 'email' ) ) {
				$value = 'email';
			} elseif ( $type === 'tel' || str_contains( $name, 'phone' ) || str_contains( $name, 'tel' ) ) {
				$value = 'tel';
			} elseif ( str_contains( $name, 'first' ) ) {
				$value = 'given-name';
			} elseif ( str_contains( $name, 'last' ) ) {
				$value = 'family-name';
			} else {
				$value = 'name';
			}
		}

		$element->setAttribute( 'autocomplete', $value );
		return true;
	}
}
