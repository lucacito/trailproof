<?php

declare(strict_types=1);

namespace Trailproof\Integrations;

/**
 * Contract for builder-specific accessibility integrations.
 *
 * Each builder integration (Divi, Elementor, Gutenberg, Bricks…) implements
 * this interface so DiviRoutes and future analytics can treat them uniformly.
 */
interface BuilderIntegration {

	public function get_key(): string;

	public function get_label(): string;

	public function is_active(): bool;

	/** Returns the full analysis payload served to the React dashboard. */
	public function get_analysis(): array;
}
