<?php

declare(strict_types=1);

namespace Trailproof\Scan;

/**
 * axe-core scan provider (stub — full implementation in Phase 1).
 *
 * The real flow is client-side: the admin Scan screen loads each in-scope URL in a
 * hidden same-origin iframe, injects axe-core, runs it, and POSTs the results to
 * trailproof/v1/scans/axe/results.  PHP only stores the results; it does not drive
 * the browser.  This class exists so the ScanProvider interface is satisfied and
 * future WP-CLI / server triggers have a hook point.
 */
class AxeCoreProvider implements ScanProvider {

	public function getLabel(): string {
		return 'axe-core';
	}

	public function getKey(): string {
		return 'axe';
	}

	public function scan( string $url, int $post_id ): ?int {
		// Client-side provider: PHP does not initiate this scan.
		// The admin JS will POST results once the iframe scan completes.
		return null;
	}

	public function isAvailable(): bool {
		return true;
	}
}
