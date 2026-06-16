<?php

declare(strict_types=1);

namespace Trailproof\Issue;

/**
 * Bucket C guided-checklist items.
 * These are issues that cannot be reliably detected by automated scanning.
 * Each item maps to one or more WCAG SCs and requires a human sign-off
 * recorded in tp_decisions_log.
 */
class ChecklistItems {

	/**
	 * @return array<string, array{description: string, wcag_sc: string, guidance: string}>
	 */
	public static function all(): array {
		return [
			'image-purpose'        => [
				'description' => 'Images: Is each non-decorative image described appropriately by its alt text?',
				'wcag_sc'     => '1.1.1',
				'guidance'    => 'Review every image. Decorative images should have alt="". Informative images need alt text that conveys their meaning. Functional images (e.g. logo linking to home) need alt text describing the action or destination.',
			],
			'link-purpose'         => [
				'description' => 'Links and buttons: Does each link and button name clearly describe its purpose in context?',
				'wcag_sc'     => '2.4.4',
				'guidance'    => 'Read each link/button name as if you can only hear that text. "Click here", "Read more", "Submit" are ambiguous without visual context. Every link should make sense when read in a list of links.',
			],
			'keyboard-operability' => [
				'description' => 'Keyboard operability: Can all interactive elements be reached and operated using only a keyboard (Tab, Enter, Space, arrow keys)?',
				'wcag_sc'     => '2.1.1',
				'guidance'    => 'Test without a mouse: Tab through the entire page. Every clickable or interactive element must be reachable and operable. No element should trap focus.',
			],
			'focus-visible'        => [
				'description' => 'Focus visibility: Is the keyboard focus indicator clearly visible on all interactive elements?',
				'wcag_sc'     => '2.4.7',
				'guidance'    => 'Tab through the page and confirm you can always see a visible outline or indicator on the focused element. A visible focus style must not be suppressed globally.',
			],
			'reading-order'        => [
				'description' => 'Reading and focus order: Does the content reading and focus order match the visual presentation?',
				'wcag_sc'     => '1.3.2',
				'guidance'    => 'The DOM order determines screen reader and keyboard order. Visually reordered content (CSS flex-order, absolute positioning) may not match DOM order. Test with a screen reader or by disabling CSS.',
			],
			'color-only'           => [
				'description' => 'Color alone: Is color used as the only visual means to convey information (errors, required fields, status)?',
				'wcag_sc'     => '1.4.1',
				'guidance'    => 'Any use of color to convey meaning must also use another indicator: icon, label, pattern, or text. Red alone is not sufficient for error states.',
			],
			'form-errors'          => [
				'description' => 'Form errors: Are error messages clear, specific, and programmatically associated with the field in error?',
				'wcag_sc'     => '3.3.1',
				'guidance'    => 'Error messages must identify which field has the error and describe how to fix it. Use aria-describedby to associate the error message with the field so screen readers announce it on focus.',
			],
			'captions-transcripts' => [
				'description' => 'Captions and transcripts: Do all videos have accurate captions and all audio-only content have transcripts?',
				'wcag_sc'     => '1.2.2',
				'guidance'    => 'Pre-recorded videos need accurate captions (not auto-generated unless reviewed). Pre-recorded audio-only content needs a text transcript. Live video needs live captions.',
			],
			'motion-autoplay'      => [
				'description' => 'Motion and autoplay: Can users stop, pause, or hide all moving, blinking, or auto-updating content?',
				'wcag_sc'     => '2.2.2',
				'guidance'    => 'Any animation, slideshow, video, or auto-updating content that lasts more than 5 seconds must have a mechanism to pause, stop, or hide it. Parallax effects and carousels are common failure points.',
			],
			'content-without-styles' => [
				'description' => 'Content without styles: Does the page still present meaningful content when CSS and images are disabled?',
				'wcag_sc'     => '1.3.3',
				'guidance'    => 'Disable CSS (browser dev tools → uncheck stylesheets). All content should still be readable and navigation still functional. Icons used without text labels must not convey information visible only via CSS.',
			],
		];
	}
}
