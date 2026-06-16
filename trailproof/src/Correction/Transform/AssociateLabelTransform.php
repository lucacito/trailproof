<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Associates a form field with an accessible label.
 *
 * Strategy (safest first):
 * 1. If payload contains a label_text: add aria-label to the input (always works).
 * 2. If payload contains a label_id: wire the existing <label> by setting for/id.
 *
 * Selector: the <input>, <select>, or <textarea> element.
 * Payload: { "label_text": "Email address" }
 *       or { "label_id": "label-email", "input_id": "email-field" }
 */
class AssociateLabelTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		$label_text = sanitize_text_field( $payload['label_text'] ?? '' );
		if ( $label_text ) {
			$element->setAttribute( 'aria-label', $label_text );
			return true;
		}

		$label_id  = sanitize_html_class( $payload['label_id'] ?? '' );
		$input_id  = sanitize_html_class( $payload['input_id'] ?? '' );

		if ( $label_id && $input_id ) {
			// Ensure input has the id
			$element->setAttribute( 'id', $input_id );

			// Find the label and set for attribute
			$labels = $dom->getElementById( $label_id );
			if ( $labels ) {
				$labels->setAttribute( 'for', $input_id );
				return true;
			}
		}

		return false;
	}
}
