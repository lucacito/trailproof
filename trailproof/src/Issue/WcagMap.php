<?php

declare(strict_types=1);

namespace Trailproof\Issue;

class WcagMap {

	/**
	 * Maps axe-core rule IDs to [ WCAG SC, plain-English "who this affects and why" ].
	 * Plain-English descriptions are written for a non-technical audience (clients, lawyers).
	 */
	private const MAP = [
		'html-has-lang'                       => [ '3.1.1', 'Screen readers use the page language attribute to select the correct pronunciation engine; without it, non-English text sounds garbled and navigation by language is impossible.' ],
		'document-title'                       => [ '2.4.2', 'Browser tabs and bookmarks use the page title; a missing or generic title leaves users unable to identify the page without loading it.' ],
		'bypass'                               => [ '2.4.1', 'Keyboard-only users must tab through every navigation link on every page load unless a skip link lets them jump directly to the main content.' ],
		'image-alt'                            => [ '1.1.1', 'Screen reader users hear alt text instead of seeing the image; without it the image conveys no information and may be announced as a file path.' ],
		'input-image-alt'                      => [ '1.1.1', 'Image buttons need alt text so screen reader users know what action the button performs.' ],
		'area-alt'                             => [ '1.1.1', 'Clickable image-map areas need alt text so keyboard and screen reader users can navigate them.' ],
		'label'                                => [ '1.3.1', 'Form fields without a programmatic label are anonymous to screen reader users — they cannot know what to enter.' ],
		'link-name'                            => [ '2.4.4', 'Links with no accessible name are announced as "link" with no destination, leaving screen reader users unable to decide whether to follow them.' ],
		'button-name'                          => [ '4.1.2', 'Unlabeled buttons are announced as "button" with no action, so screen reader users cannot activate them meaningfully.' ],
		'landmark-one-main'                    => [ '1.3.1', 'A main landmark lets screen reader users skip directly to the page content without navigating every surrounding element.' ],
		'landmark-complementary-is-top-level'  => [ '1.3.1', 'Aside/complementary landmarks must be at the top level so screen reader users can reach them as expected from the document outline.' ],
		'landmark-no-duplicate-banner'         => [ '1.3.1', 'Multiple banner landmarks confuse screen reader users about which contains the site header.' ],
		'landmark-no-duplicate-contentinfo'    => [ '1.3.1', 'Multiple contentinfo landmarks confuse screen reader users about which contains the site footer.' ],
		'landmark-no-duplicate-main'           => [ '1.3.1', 'Multiple main landmarks contradict the document model and confuse users navigating by landmark.' ],
		'frame-title'                          => [ '2.4.1', 'Iframes without titles are announced as "frame" with no description, leaving screen reader users unable to decide whether to enter them.' ],
		'color-contrast'                       => [ '1.4.3', 'Low-contrast text is hard or impossible to read for people with low vision, colour-blindness, or when viewing in bright sunlight.' ],
		'color-contrast-enhanced'              => [ '1.4.6', 'Enhanced contrast (7:1 ratio) is required at AAA level for users with more significant vision loss.' ],
		'heading-order'                        => [ '1.3.1', 'Screen reader users navigate by headings; skipped levels break the document outline and disrupt non-visual page navigation.' ],
		'link-in-text-block'                   => [ '2.4.4', '"Read more" and "click here" are meaningless when a screen reader user navigates the links list — the link must make sense out of context.' ],
		'identical-links-same-purpose'         => [ '2.4.9', 'Multiple links with identical text but different destinations confuse users who navigate by link text.' ],
		'tabindex'                             => [ '2.4.3', 'Positive tabindex values disrupt natural focus order, confusing keyboard users who expect to tab through elements in visual/DOM order.' ],
		'scrollable-region-focusable'          => [ '2.1.1', 'Scrollable regions that cannot receive keyboard focus are inaccessible to users who cannot use a mouse.' ],
		'focus-order-semantics'                => [ '2.4.3', 'Interactive elements that are out of the expected focus sequence disrupt keyboard navigation.' ],
		'p-as-heading'                         => [ '1.3.1', 'Bold paragraphs styled to look like headings do not function as headings for screen reader users navigating by heading structure.' ],

		// Divi module-specific patterns (detected by StaticProvider, fixed by widget_aria_pattern transform)
		'divi-accordion' => [ '4.1.2', 'Divi accordion panels lack aria-expanded and aria-controls attributes; screen reader users cannot tell whether a panel is open or closed and cannot navigate between panels using AT shortcuts.' ],
		'divi-tabs'      => [ '4.1.2', 'Divi tab widgets are missing role="tablist", role="tab", and aria-selected, so screen reader users cannot distinguish the tab interface from a plain list of links.' ],
		'divi-toggle'    => [ '4.1.2', 'Divi toggle widgets lack aria-expanded and aria-controls; screen reader users hear the title as plain text with no indication that activating it reveals or hides content below.' ],
		'divi-menu'      => [ '4.1.2', 'Divi navigation menu items with sub-menus do not declare aria-haspopup or aria-expanded, leaving screen reader users unaware that activating the item will open a sub-menu.' ],
		'divi-gallery'   => [ '1.3.1', 'Divi gallery grids are not marked as lists; screen reader users cannot determine how many images are in the gallery or use list-navigation shortcuts to move efficiently between items.' ],

		// PDF links (detected by StaticProvider; remediation requires external PDF repair tool)
		'pdf-untagged-link' => [ '1.1.1', 'Linked PDF files are frequently untagged, making them inaccessible to screen reader users. Each PDF must be tagged, have a document title, and provide logical reading order. Flag for external remediation.' ],

		// Gutenberg (Block Editor) patterns
		'gutenberg-image-alt'      => [ '1.1.1', 'A Gutenberg Image block contains an image without alt text; screen reader users hear a file path or "image" with no description of what it shows.' ],
		'gutenberg-gallery-alt'    => [ '1.1.1', 'One or more images inside a Gutenberg Gallery block are missing alt text; screen reader users cannot identify individual images in the gallery.' ],
		'gutenberg-button-text'    => [ '2.4.4', 'A Gutenberg Button block uses generic link text ("Click here", "Read more") that is meaningless when navigated out of context by a screen reader or links list.' ],
		'gutenberg-cover-alt'      => [ '1.1.1', 'A Gutenberg Cover block contains a background image element without alt text; without it the decorative-vs-informative intent is ambiguous and the image is invisible to screen reader users.' ],

		// Elementor patterns
		'elementor-image-alt'      => [ '1.1.1', 'An Elementor Image widget contains an image without alt text; screen reader users hear a file path or "image" with no description of what it shows.' ],
		'elementor-button-text'    => [ '2.4.4', 'An Elementor Button widget uses generic link text ("Click here", "Read more") that is meaningless when navigated out of context.' ],
		'elementor-carousel-aria'  => [ '4.1.2', 'An Elementor Image Carousel widget is missing role="list" on the slide track and role="listitem" on individual slides, leaving screen reader users unable to determine how many slides exist or navigate between them.' ],
		'elementor-icon-box-name'  => [ '4.1.2', 'An Elementor Icon Box widget link has no accessible name beyond the icon itself; screen reader users hear "link" with no indication of the destination or purpose.' ],
	];

	public static function get_sc( string $rule_id ): ?string {
		return self::MAP[ $rule_id ][0] ?? null;
	}

	public static function get_description( string $rule_id ): ?string {
		return self::MAP[ $rule_id ][1] ?? null;
	}

	public static function get( string $rule_id ): array {
		return [
			'wcag_sc'     => self::MAP[ $rule_id ][0] ?? null,
			'description' => self::MAP[ $rule_id ][1] ?? null,
		];
	}
}
