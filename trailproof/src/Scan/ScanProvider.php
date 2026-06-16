<?php

declare(strict_types=1);

namespace Trailproof\Scan;

/**
 * Contract for pluggable scan engines.
 *
 * Implementations:
 *  - AxeCoreProvider  (Phase 1) — axe-core run client-side in a hidden iframe
 *  - StaticProvider   (Phase 1) — server-side DOMDocument structural pass via WP-Cron
 *  - WaveProvider     (Phase 3) — WebAIM WAVE API, bring-your-own-key, on-demand only
 */
interface ScanProvider {

	/**
	 * Human-readable label shown in the UI and reports (e.g. "axe-core 4.x").
	 */
	public function getLabel(): string;

	/**
	 * Short key stored in tp_scans.provider (axe|static|wave|cloud).
	 */
	public function getKey(): string;

	/**
	 * Initiate a scan of $url for $post_id.
	 * Returns the new tp_scans.id on success, null if the provider cannot run it.
	 *
	 * For client-side providers (axe-core) this may be a no-op from PHP — the admin
	 * JS drives the scan and writes results via a REST endpoint.
	 */
	public function scan( string $url, int $post_id ): ?int;

	/**
	 * Whether this provider is ready to run right now (deps met, credentials present, etc.).
	 */
	public function isAvailable(): bool;
}
