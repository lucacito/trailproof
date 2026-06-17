<?php

declare(strict_types=1);

namespace Trailproof\Correction;

use Trailproof\Correction\Transform\AddAriaLabelTransform;
use Trailproof\Correction\Transform\AddAriaRoleTransform;
use Trailproof\Correction\Transform\AddLandmarkTransform;
use Trailproof\Correction\Transform\AssociateLabelTransform;
use Trailproof\Correction\Transform\InjectSkipLinkTransform;
use Trailproof\Correction\Transform\RewriteLinkTextTransform;
use Trailproof\Correction\Transform\SetAltEmptyDecorativeTransform;
use Trailproof\Correction\Transform\SetAltTransform;
use Trailproof\Correction\Transform\SetLangTransform;
use Trailproof\Correction\Transform\SetTitleTransform;
use Trailproof\Correction\Transform\WidgetAriaPatternTransform;

class TransformFactory {

	public static function create( string $type ): TransformInterface {
		return match ( $type ) {
			'set_lang'                 => new SetLangTransform(),
			'set_title'                => new SetTitleTransform(),
			'inject_skiplink'          => new InjectSkipLinkTransform(),
			'add_landmark'             => new AddLandmarkTransform(),
			'set_alt'                  => new SetAltTransform(),
			'set_alt_empty_decorative' => new SetAltEmptyDecorativeTransform(),
			'rewrite_link_text'        => new RewriteLinkTextTransform(),
			'associate_label'          => new AssociateLabelTransform(),
			'add_aria_label'           => new AddAriaLabelTransform(),
			'add_aria_role'            => new AddAriaRoleTransform(),
			'widget_aria_pattern'      => new WidgetAriaPatternTransform(),
			default                    => throw new \InvalidArgumentException( "Unknown transform type: {$type}" ), // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		};
	}

	/**
	 * Returns the auto-derivable payload for Bucket A transforms that need no human input.
	 * Returns null for transforms that require a human-authored value.
	 */
	public static function auto_payload( string $transform_type, string $rule_id ): ?array {
		return match ( $transform_type ) {
			'set_lang'                 => [ 'lang' => str_replace( '_', '-', get_locale() ) ],
			'inject_skiplink'          => [ 'target' => '#main', 'text' => __( 'Skip to main content', 'trailproof' ) ],
			'add_landmark'             => [ 'role' => 'main' ],
			'set_alt_empty_decorative' => [],
			'widget_aria_pattern'      => match ( $rule_id ) {
				'divi-accordion' => [ 'pattern' => 'divi-accordion' ],
				'divi-tabs'      => [ 'pattern' => 'divi-tabs' ],
				'divi-toggle'    => [ 'pattern' => 'divi-toggle' ],
				'divi-menu'      => [ 'pattern' => 'divi-menu' ],
				'divi-gallery'   => [ 'pattern' => 'divi-gallery' ],
				default          => null,
			},
			default                    => null, // Must be provided by the human
		};
	}
}
