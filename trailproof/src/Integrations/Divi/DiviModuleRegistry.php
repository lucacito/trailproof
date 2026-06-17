<?php

declare(strict_types=1);

namespace Trailproof\Integrations\Divi;

/**
 * Static registry of Divi modules that TrailProof knows how to enhance.
 *
 * Each entry describes:
 *  - css_class:    The Divi CSS class used to detect the module in post content.
 *  - pattern:      The widget_aria_pattern payload value (null = not yet supported).
 *  - enhancements: Human-readable list of improvements TrailProof applies.
 *  - aria_attrs:   Technical ARIA attributes added (shown in expandable detail).
 *  - before_code:  Simplified HTML before TrailProof.
 *  - after_code:   Simplified HTML after TrailProof.
 *  - explanation:  One-line benefit statement for the client-facing view.
 */
class DiviModuleRegistry {

	public static function get_modules(): array {
		return [
			'accordion' => [
				'label'       => 'Accordion',
				'css_class'   => 'et_pb_accordion',
				'pattern'     => 'divi-accordion',
				'supported'   => true,
				'enhancements' => [
					'Added accessible expanded/collapsed states',
					'Improved keyboard interaction',
					'Improved screen reader announcements',
				],
				'aria_attrs'  => [
					'aria-expanded',
					'aria-controls',
					'button semantics',
					'keyboard state handling',
				],
				'before_code' => '<div class="et_pb_toggle">
  <h5 class="et_pb_toggle_title">Section Title</h5>
  <div class="et_pb_toggle_content">…</div>
</div>',
				'after_code'  => '<div class="et_pb_toggle">
  <h5 class="et_pb_toggle_title"
      id="tp-acc-btn-0-0"
      role="button"
      tabindex="0"
      aria-expanded="false"
      aria-controls="tp-acc-panel-0-0">Section Title</h5>
  <div class="et_pb_toggle_content"
       id="tp-acc-panel-0-0"
       role="region"
       aria-labelledby="tp-acc-btn-0-0">…</div>
</div>',
				'explanation' => 'Improves how assistive technologies understand this component.',
			],

			'tabs' => [
				'label'       => 'Tabs',
				'css_class'   => 'et_pb_tabs',
				'pattern'     => 'divi-tabs',
				'supported'   => true,
				'enhancements' => [
					'Proper tab roles added',
					'aria-selected state on each tab',
					'Keyboard navigation between tabs',
					'Active tab announcements for screen readers',
				],
				'aria_attrs'  => [
					'role="tablist"',
					'role="tab"',
					'aria-selected',
					'role="tabpanel"',
					'aria-labelledby',
				],
				'before_code' => '<ul class="et_pb_tabs_controls">
  <li class="et_pb_tab_active"><a href="#">Tab 1</a></li>
  <li><a href="#">Tab 2</a></li>
</ul>',
				'after_code'  => '<ul class="et_pb_tabs_controls" role="tablist">
  <li role="presentation">
    <a id="tp-tab-0-0" role="tab"
       aria-selected="true" tabindex="0"
       aria-controls="tp-tab-panel-0-0">Tab 1</a>
  </li>
  <li role="presentation">
    <a id="tp-tab-0-1" role="tab"
       aria-selected="false" tabindex="-1"
       aria-controls="tp-tab-panel-0-1">Tab 2</a>
  </li>
</ul>',
				'explanation' => 'Screen readers can now navigate tabs and understand which is active.',
			],

			'toggle' => [
				'label'       => 'Toggle',
				'css_class'   => 'et_pb_toggle',
				'pattern'     => 'divi-toggle',
				'supported'   => true,
				'enhancements' => [
					'Expanded/collapsed state communicated',
					'Accessible button controls added',
					'Screen reader status announcements',
				],
				'aria_attrs'  => [
					'role="button"',
					'aria-expanded',
					'aria-controls',
					'tabindex="0"',
				],
				'before_code' => '<div class="et_pb_toggle et_pb_open">
  <h5 class="et_pb_toggle_title">Question</h5>
  <div class="et_pb_toggle_content">Answer…</div>
</div>',
				'after_code'  => '<div class="et_pb_toggle et_pb_open">
  <h5 class="et_pb_toggle_title"
      id="tp-toggle-btn-0"
      role="button" tabindex="0"
      aria-expanded="true"
      aria-controls="tp-toggle-panel-0">Question</h5>
  <div class="et_pb_toggle_content"
       id="tp-toggle-panel-0"
       role="region"
       aria-labelledby="tp-toggle-btn-0">Answer…</div>
</div>',
				'explanation' => 'Screen readers announce whether the toggle is open or closed.',
			],

			'menu' => [
				'label'       => 'Menu',
				'css_class'   => 'et_pb_menu',
				'pattern'     => 'divi-menu',
				'supported'   => true,
				'enhancements' => [
					'Navigation labels for sub-menus',
					'Mobile menu accessibility improved',
					'Focus handling on dropdown parents',
					'Keyboard navigation supported',
				],
				'aria_attrs'  => [
					'aria-haspopup="true"',
					'aria-expanded="false"',
				],
				'before_code' => '<nav class="et_pb_menu">
  <ul>
    <li class="menu-item-has-children">
      <a href="#">Services</a>
      <ul class="sub-menu">…</ul>
    </li>
  </ul>
</nav>',
				'after_code'  => '<nav class="et_pb_menu">
  <ul>
    <li class="menu-item-has-children">
      <a href="#"
         aria-haspopup="true"
         aria-expanded="false">Services</a>
      <ul class="sub-menu">…</ul>
    </li>
  </ul>
</nav>',
				'explanation' => 'Keyboard and screen reader users can navigate sub-menus.',
			],

			'gallery' => [
				'label'       => 'Gallery',
				'css_class'   => 'et_pb_gallery',
				'pattern'     => 'divi-gallery',
				'supported'   => true,
				'enhancements' => [
					'Gallery grid announced as a list',
					'Each item announced as list item',
					'Improved navigation for assistive technology',
				],
				'aria_attrs'  => [
					'role="list"',
					'role="listitem"',
				],
				'before_code' => '<div class="et_pb_gallery_grid">
  <div class="et_pb_gallery_item">…</div>
  <div class="et_pb_gallery_item">…</div>
</div>',
				'after_code'  => '<div class="et_pb_gallery_grid" role="list">
  <div class="et_pb_gallery_item" role="listitem">…</div>
  <div class="et_pb_gallery_item" role="listitem">…</div>
</div>',
				'explanation' => 'Screen readers understand this is a collection of related items.',
			],

			'blurb' => [
				'label'       => 'Blurb',
				'css_class'   => 'et_pb_blurb',
				'pattern'     => null,
				'supported'   => false,
				'enhancements' => [
					'Improved link labeling',
					'Heading hierarchy awareness',
				],
				'aria_attrs'  => [
					'aria-label on links',
					'heading level validation',
				],
				'before_code' => '<div class="et_pb_blurb">
  <a href="/service">Read more</a>
</div>',
				'after_code'  => '<div class="et_pb_blurb">
  <a href="/service" aria-label="Read more about Our Service">
    Read more
  </a>
</div>',
				'explanation' => 'Makes blurb links descriptive for screen reader users.',
			],

			'contact_form' => [
				'label'       => 'Contact Form',
				'css_class'   => 'et_pb_contact_form',
				'pattern'     => null,
				'supported'   => false,
				'enhancements' => [
					'Field labeling verified',
					'Error announcements improved',
					'Input relationships clarified',
				],
				'aria_attrs'  => [
					'aria-required',
					'aria-describedby',
					'role="alert" on errors',
				],
				'before_code' => '<input type="email" placeholder="Email">',
				'after_code'  => '<label for="et_pb_contact_email_0">
  Email <span aria-hidden="true">*</span>
</label>
<input type="email"
       id="et_pb_contact_email_0"
       aria-required="true"
       aria-describedby="email-error">',
				'explanation' => 'Form fields become accessible to users with assistive technology.',
			],
		];
	}
}
