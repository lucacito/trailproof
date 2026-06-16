<?php

declare(strict_types=1);

namespace Trailproof\Api\Routes;

use Trailproof\Scan\ScanRunner;

class PageRoutes {

	public function __construct( private readonly ScanRunner $runner ) {}

	public function register( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/pages',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_pages' ],
				'permission_callback' => [ $this, 'require_editor' ],
			]
		);
	}

	public function get_pages( \WP_REST_Request $request ): \WP_REST_Response {
		$pages = $this->runner->get_in_scope_pages();
		return new \WP_REST_Response( $pages, 200 );
	}

	public function require_editor(): bool {
		return current_user_can( 'edit_posts' );
	}
}
