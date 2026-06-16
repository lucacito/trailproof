<?php

declare(strict_types=1);

namespace Trailproof\Scan;

use Trailproof\Admin\SettingsPage;

/**
 * Orchestrates scan providers and resolves the list of in-scope pages.
 * Providers register themselves; the runner does not know their implementations.
 */
class ScanRunner {

	/** @var array<string, ScanProvider> */
	private array $providers = [];

	public function register_provider( ScanProvider $provider ): void {
		$this->providers[ $provider->getKey() ] = $provider;
	}

	public function get_provider( string $key ): ?ScanProvider {
		return $this->providers[ $key ] ?? null;
	}

	/** @return array<string, ScanProvider> */
	public function get_providers(): array {
		return $this->providers;
	}

	/**
	 * Return all in-scope pages as [{post_id, url, title}] arrays.
	 * Applies post-type filter, URL include/exclude globs from settings.
	 *
	 * @return array<int, array{post_id: int, url: string, title: string}>
	 */
	public function get_in_scope_pages(): array {
		$settings   = ( new SettingsPage() )->get_settings();
		$post_types = (array) ( $settings['post_types'] ?? [ 'post', 'page' ] );

		$posts = get_posts( [
			'post_type'      => $post_types,
			'post_status'    => 'publish',
			'posts_per_page' => 500,
			'fields'         => 'ids',
		] );

		// Prepend the front page so it's always first
		$front_id = (int) get_option( 'page_on_front' );
		if ( $front_id && ! in_array( $front_id, $posts, false ) ) {
			array_unshift( $posts, $front_id );
		}

		$pages = [];
		$seen  = [];

		foreach ( $posts as $post_id ) {
			$post_id = (int) $post_id;
			if ( isset( $seen[ $post_id ] ) ) {
				continue;
			}
			$seen[ $post_id ] = true;

			$url = (string) get_permalink( $post_id );
			if ( ! $url ) {
				continue;
			}

			if ( $this->is_excluded( $url, $settings ) || ! $this->is_included( $url, $settings ) ) {
				continue;
			}

			$pages[] = [
				'post_id' => $post_id,
				'url'     => $url,
				'title'   => get_the_title( $post_id ),
			];
		}

		// If no front page post, add home_url as a virtual page
		if ( ! $front_id ) {
			array_unshift( $pages, [
				'post_id' => 0,
				'url'     => home_url( '/' ),
				'title'   => __( 'Home', 'trailproof' ),
			] );
		}

		return $pages;
	}

	private function is_excluded( string $url, array $settings ): bool {
		$pattern = $settings['url_exclude'] ?? '';
		return $pattern !== '' && fnmatch( home_url( $pattern ), $url );
	}

	private function is_included( string $url, array $settings ): bool {
		$pattern = $settings['url_include'] ?? '';
		return $pattern === '' || fnmatch( home_url( $pattern ), $url );
	}
}
