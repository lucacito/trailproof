<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\TransformFactory;
use Trailproof\Correction\TransformInterface;

class TransformFactoryTest extends TestCase {

    /** @dataProvider known_types */
    public function test_create_returns_transform_interface(string $type): void {
        $this->assertInstanceOf(TransformInterface::class, TransformFactory::create($type));
    }

    public static function known_types(): array {
        return [
            ['set_lang'],
            ['inject_skiplink'],
            ['add_landmark'],
            ['set_alt'],
            ['set_alt_empty_decorative'],
            ['rewrite_link_text'],
            ['associate_label'],
            ['add_aria_label'],
            ['add_aria_role'],
            ['widget_aria_pattern'],
        ];
    }

    public function test_create_throws_for_unknown_type(): void {
        $this->expectException(InvalidArgumentException::class);
        TransformFactory::create('not_a_real_type');
    }

    public function test_auto_payload_set_lang_returns_locale(): void {
        $payload = TransformFactory::auto_payload('set_lang', 'html-has-lang');
        $this->assertIsArray($payload);
        $this->assertArrayHasKey('lang', $payload);
        $this->assertNotEmpty($payload['lang']);
    }

    public function test_auto_payload_inject_skiplink(): void {
        $payload = TransformFactory::auto_payload('inject_skiplink', 'bypass');
        $this->assertIsArray($payload);
        $this->assertArrayHasKey('target', $payload);
        $this->assertArrayHasKey('text', $payload);
        $this->assertSame('#main', $payload['target']);
    }

    public function test_auto_payload_widget_aria_divi_patterns(): void {
        foreach (['divi-accordion', 'divi-tabs', 'divi-toggle', 'divi-menu', 'divi-gallery'] as $rule) {
            $payload = TransformFactory::auto_payload('widget_aria_pattern', $rule);
            $this->assertIsArray($payload, "Expected array for rule {$rule}");
            $this->assertSame($rule, $payload['pattern']);
        }
    }

    public function test_auto_payload_returns_null_for_human_required(): void {
        // set_alt requires a human-authored alt text
        $this->assertNull(TransformFactory::auto_payload('set_alt', 'image-alt'));
        $this->assertNull(TransformFactory::auto_payload('add_aria_label', 'link-name'));
        $this->assertNull(TransformFactory::auto_payload('rewrite_link_text', 'link-name'));
    }
}
