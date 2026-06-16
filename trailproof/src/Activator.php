<?php

declare(strict_types=1);

namespace Trailproof;

class Activator {

	public static function activate(): void {
		Schema::run_migrations();
		flush_rewrite_rules();
	}
}
