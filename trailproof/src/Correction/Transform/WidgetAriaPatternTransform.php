<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Trailproof\Correction\TransformInterface;

/**
 * Applies full ARIA widget patterns to known Divi module markup.
 *
 * Unlike most transforms, this one ignores the passed $element and instead
 * searches the full $dom for all matching containers — so one correction
 * entry fixes every accordion/tab/etc. on the page in a single pass.
 *
 * Payload: { "pattern": "divi-accordion" | "divi-tabs" | "divi-toggle" | "divi-menu" | "divi-gallery" }
 *
 * IDs injected follow the prefix "tp-" to avoid collision with site IDs.
 * All transforms are idempotent: if a container is already annotated (e.g.
 * aria-expanded present on a toggle title) it is skipped.
 */
class WidgetAriaPatternTransform implements TransformInterface {

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		$pattern = $payload['pattern'] ?? '';
		$xpath   = new DOMXPath( $dom );

		return match ( $pattern ) {
			'divi-accordion' => $this->accordion( $dom, $xpath ),
			'divi-tabs'      => $this->tabs( $dom, $xpath ),
			'divi-toggle'    => $this->toggle( $dom, $xpath ),
			'divi-menu'      => $this->menu( $dom, $xpath ),
			'divi-gallery'   => $this->gallery( $dom, $xpath ),
			default          => false,
		};
	}

	// -------------------------------------------------------------------------
	// divi-accordion
	// -------------------------------------------------------------------------

	private function accordion( DOMDocument $dom, DOMXPath $xpath ): bool {
		$containers = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_accordion ")]'
		);
		if ( ! $containers || $containers->length === 0 ) {
			return false;
		}

		$changed  = false;
		$acc_idx  = 0;

		foreach ( $containers as $container ) {
			if ( ! ( $container instanceof DOMElement ) ) {
				continue;
			}
			$items = $xpath->query(
				'descendant::div[contains(concat(" ",normalize-space(@class)," ")," et_pb_accordion_item ")]',
				$container
			);
			if ( ! $items ) {
				continue;
			}
			foreach ( $items as $idx => $item ) {
				if ( ! ( $item instanceof DOMElement ) ) {
					continue;
				}

				$btn_id   = "tp-acc-btn-{$acc_idx}-{$idx}";
				$panel_id = "tp-acc-panel-{$acc_idx}-{$idx}";
				$is_open  = str_contains( $item->getAttribute( 'class' ), 'et_pb_active_content' );

				$title = $xpath->query(
					'descendant::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_title ")]',
					$item
				);
				if ( $title && $title->length > 0 && $title->item( 0 ) instanceof DOMElement ) {
					$title_el = $title->item( 0 );
					// Idempotent: skip if already annotated
					if ( ! $title_el->hasAttribute( 'aria-expanded' ) ) {
						$title_el->setAttribute( 'id', $btn_id );
						$title_el->setAttribute( 'role', 'button' );
						$title_el->setAttribute( 'tabindex', '0' );
						$title_el->setAttribute( 'aria-expanded', $is_open ? 'true' : 'false' );
						$title_el->setAttribute( 'aria-controls', $panel_id );
						$changed = true;
					}
				}

				$content = $xpath->query(
					'descendant::div[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_content ")]',
					$item
				);
				if ( $content && $content->length > 0 && $content->item( 0 ) instanceof DOMElement ) {
					$content_el = $content->item( 0 );
					if ( ! $content_el->hasAttribute( 'role' ) ) {
						$content_el->setAttribute( 'id', $panel_id );
						$content_el->setAttribute( 'role', 'region' );
						$content_el->setAttribute( 'aria-labelledby', $btn_id );
						$changed = true;
					}
				}
			}
			++$acc_idx;
		}

		return $changed;
	}

	// -------------------------------------------------------------------------
	// divi-tabs
	// -------------------------------------------------------------------------

	private function tabs( DOMDocument $dom, DOMXPath $xpath ): bool {
		$containers = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_tabs ")]'
		);
		if ( ! $containers || $containers->length === 0 ) {
			return false;
		}

		$changed   = false;
		$tabs_idx  = 0;

		foreach ( $containers as $container ) {
			if ( ! ( $container instanceof DOMElement ) ) {
				continue;
			}

			// Tablist
			$tablist_nodes = $xpath->query(
				'descendant::ul[contains(concat(" ",normalize-space(@class)," ")," et_pb_tabs_controls ")]',
				$container
			);
			if ( ! $tablist_nodes || $tablist_nodes->length === 0 ) {
				continue;
			}
			$tablist = $tablist_nodes->item( 0 );
			if ( ! ( $tablist instanceof DOMElement ) ) {
				continue;
			}

			if ( ! $tablist->hasAttribute( 'role' ) ) {
				$tablist->setAttribute( 'role', 'tablist' );
				$changed = true;
			}

			// Tabs (the <a> links inside the tablist <li>)
			$tab_links = $xpath->query( 'descendant::li/a', $tablist );

			// Panels (.et_pb_tab divs inside the container, not the controls)
			$panels = $xpath->query(
				'descendant::div[contains(concat(" ",normalize-space(@class)," ")," et_pb_tab ") '
				. 'and not(contains(concat(" ",normalize-space(@class)," ")," et_pb_tabs_controls "))]',
				$container
			);

			$tab_count = $tab_links ? $tab_links->length : 0;

			for ( $i = 0; $i < $tab_count; $i++ ) {
				$tab_id   = "tp-tab-{$tabs_idx}-{$i}";
				$panel_id = "tp-tab-panel-{$tabs_idx}-{$i}";
				$li       = $tab_links ? $tab_links->item( $i ) : null;
				$panel    = $panels ? $panels->item( $i ) : null;

				if ( $li instanceof DOMElement && ! $li->hasAttribute( 'role' ) ) {
					$parent_li = $li->parentNode;
					if ( $parent_li instanceof DOMElement ) {
						$is_active = str_contains( $parent_li->getAttribute( 'class' ), 'et_pb_tab_active' );
						$parent_li->setAttribute( 'role', 'presentation' );
					} else {
						$is_active = false;
					}
					$li->setAttribute( 'id', $tab_id );
					$li->setAttribute( 'role', 'tab' );
					$li->setAttribute( 'aria-selected', $is_active ? 'true' : 'false' );
					$li->setAttribute( 'tabindex', $is_active ? '0' : '-1' );
					$li->setAttribute( 'aria-controls', $panel_id );
					$changed = true;
				}

				if ( $panel instanceof DOMElement && ! $panel->hasAttribute( 'role' ) ) {
					$panel->setAttribute( 'id', $panel_id );
					$panel->setAttribute( 'role', 'tabpanel' );
					$panel->setAttribute( 'tabindex', '0' );
					$panel->setAttribute( 'aria-labelledby', $tab_id );
					$changed = true;
				}
			}

			++$tabs_idx;
		}

		return $changed;
	}

	// -------------------------------------------------------------------------
	// divi-toggle
	// -------------------------------------------------------------------------

	private function toggle( DOMDocument $dom, DOMXPath $xpath ): bool {
		// Standalone toggles only — excludes those wrapped in an accordion
		$toggles = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle ")
			   and not(ancestor::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_accordion ")])]'
		);
		if ( ! $toggles || $toggles->length === 0 ) {
			return false;
		}

		$changed = false;

		foreach ( $toggles as $idx => $toggle ) {
			if ( ! ( $toggle instanceof DOMElement ) ) {
				continue;
			}

			$btn_id   = "tp-toggle-btn-{$idx}";
			$panel_id = "tp-toggle-panel-{$idx}";
			$is_open  = str_contains( $toggle->getAttribute( 'class' ), 'et_pb_open' );

			$title = $xpath->query(
				'descendant::*[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_title ")]',
				$toggle
			);
			if ( $title && $title->length > 0 && $title->item( 0 ) instanceof DOMElement ) {
				$title_el = $title->item( 0 );
				if ( ! $title_el->hasAttribute( 'aria-expanded' ) ) {
					$title_el->setAttribute( 'id', $btn_id );
					$title_el->setAttribute( 'role', 'button' );
					$title_el->setAttribute( 'tabindex', '0' );
					$title_el->setAttribute( 'aria-expanded', $is_open ? 'true' : 'false' );
					$title_el->setAttribute( 'aria-controls', $panel_id );
					$changed = true;
				}
			}

			$content = $xpath->query(
				'descendant::div[contains(concat(" ",normalize-space(@class)," ")," et_pb_toggle_content ")]',
				$toggle
			);
			if ( $content && $content->length > 0 && $content->item( 0 ) instanceof DOMElement ) {
				$content_el = $content->item( 0 );
				if ( ! $content_el->hasAttribute( 'role' ) ) {
					$content_el->setAttribute( 'id', $panel_id );
					$content_el->setAttribute( 'role', 'region' );
					$content_el->setAttribute( 'aria-labelledby', $btn_id );
					$changed = true;
				}
			}
		}

		return $changed;
	}

	// -------------------------------------------------------------------------
	// divi-menu
	// -------------------------------------------------------------------------

	private function menu( DOMDocument $dom, DOMXPath $xpath ): bool {
		// Parent links in Divi nav menus that have child sub-menus
		$parent_links = $xpath->query(
			'//nav[contains(concat(" ",normalize-space(@class)," ")," et_pb_menu ")]'
			. '//li[contains(concat(" ",normalize-space(@class)," ")," menu-item-has-children ")]'
			. '/a[not(@aria-haspopup)]'
		);
		if ( ! $parent_links || $parent_links->length === 0 ) {
			return false;
		}

		$changed = false;
		foreach ( $parent_links as $link ) {
			if ( ! ( $link instanceof DOMElement ) ) {
				continue;
			}
			$link->setAttribute( 'aria-haspopup', 'true' );
			$link->setAttribute( 'aria-expanded', 'false' );
			$changed = true;
		}

		return $changed;
	}

	// -------------------------------------------------------------------------
	// divi-gallery
	// -------------------------------------------------------------------------

	private function gallery( DOMDocument $dom, DOMXPath $xpath ): bool {
		$grids = $xpath->query(
			'//div[contains(concat(" ",normalize-space(@class)," ")," et_pb_gallery_grid ") and not(@role)]'
		);
		if ( ! $grids || $grids->length === 0 ) {
			return false;
		}

		$changed = false;

		foreach ( $grids as $grid ) {
			if ( ! ( $grid instanceof DOMElement ) ) {
				continue;
			}
			$grid->setAttribute( 'role', 'list' );
			$changed = true;

			$items = $xpath->query(
				'descendant::div[contains(concat(" ",normalize-space(@class)," ")," et_pb_gallery_item ") and not(@role)]',
				$grid
			);
			if ( ! $items ) {
				continue;
			}
			foreach ( $items as $item ) {
				if ( $item instanceof DOMElement ) {
					$item->setAttribute( 'role', 'listitem' );
				}
			}
		}

		return $changed;
	}
}
