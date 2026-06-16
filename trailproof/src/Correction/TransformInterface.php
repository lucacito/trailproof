<?php

declare(strict_types=1);

namespace Trailproof\Correction;

use DOMDocument;
use DOMElement;

interface TransformInterface {

	/**
	 * Apply this transform to the DOM.
	 *
	 * @param DOMDocument  $dom     The full document (needed to create new elements).
	 * @param DOMElement|null $element The element located by the correction's CSS selector.
	 *                               Null when the selector matched nothing — transform should return false.
	 * @param array        $payload  The correction payload (e.g. ['alt' => 'Sunrise photo']).
	 * @return bool True if the DOM was modified; false if unchanged (selector miss, etc.).
	 */
	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool;
}
