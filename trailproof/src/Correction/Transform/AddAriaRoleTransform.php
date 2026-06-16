<?php

declare(strict_types=1);

namespace Trailproof\Correction\Transform;

use DOMDocument;
use DOMElement;
use Trailproof\Correction\TransformInterface;

/**
 * Sets the role attribute on any element.
 * Use for adding semantics to non-semantic wrappers (e.g. role="navigation",
 * role="banner", role="contentinfo", role="complementary").
 * Payload: { "role": "navigation" }
 */
class AddAriaRoleTransform implements TransformInterface {

	private const VALID_ROLES = [
		'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
		'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
		'contentinfo', 'definition', 'dialog', 'directory', 'document',
		'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
		'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
		'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
		'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
		'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
		'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
		'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
		'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
		'treeitem',
	];

	public function apply( DOMDocument $dom, ?DOMElement $element, array $payload ): bool {
		if ( ! $element ) {
			return false;
		}

		$role = sanitize_text_field( $payload['role'] ?? '' );
		if ( ! $role || ! in_array( $role, self::VALID_ROLES, true ) ) {
			return false;
		}

		$element->setAttribute( 'role', $role );
		return true;
	}
}
