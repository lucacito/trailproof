<?php

declare(strict_types=1);

namespace Trailproof\Issue;

class Fingerprint {

	/**
	 * Stable hash for a detected issue.
	 *
	 * Uses post_id rather than URL so the same issue on a page is still the same
	 * fingerprint if the slug changes. For non-post URLs (post_id = 0) we fall
	 * back to the normalized URL.
	 */
	public static function compute( string $selector, string $rule_id, int $post_id, string $url = '' ): string {
		$context = $post_id > 0 ? "post:{$post_id}" : 'url:' . self::normalize_url( $url );

		$parts = implode( '|', [
			self::normalize_selector( $selector ),
			strtolower( trim( $rule_id ) ),
			$context,
		] );

		return hash( 'sha256', $parts );
	}

	private static function normalize_selector( string $selector ): string {
		$selector = strtolower( trim( $selector ) );
		$selector = (string) preg_replace( '/\s+/', ' ', $selector );
		// Normalize attribute quotes: [attr='val'] → [attr="val"]
		$selector = (string) preg_replace( "/\[([^\]]+)'([^']*)'\]/", '[$1"$2"]', $selector );
		return $selector;
	}

	private static function normalize_url( string $url ): string {
		$parsed = wp_parse_url( $url );
		$path   = $parsed['path'] ?? '/';
		// Strip trailing slash for consistency, but keep root
		return rtrim( $path, '/' ) ?: '/';
	}
}
