<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\AddAriaLabelTransform;

class AddAriaLabelTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_sets_aria_label(): void {
        $dom     = $this->dom('<html><body><button id="b">×</button></body></html>');
        $btn     = $dom->getElementById('b');
        $changed = (new AddAriaLabelTransform())->apply($dom, $btn, ['aria_label' => 'Close dialog']);

        $this->assertTrue($changed);
        $this->assertSame('Close dialog', $btn->getAttribute('aria-label'));
    }

    public function test_overwrites_existing_aria_label(): void {
        $dom     = $this->dom('<html><body><button id="b" aria-label="old">×</button></body></html>');
        $btn     = $dom->getElementById('b');
        (new AddAriaLabelTransform())->apply($dom, $btn, ['aria_label' => 'New label']);

        $this->assertSame('New label', $btn->getAttribute('aria-label'));
    }

    public function test_returns_false_when_aria_label_missing(): void {
        $dom     = $this->dom('<html><body><button id="b">×</button></body></html>');
        $btn     = $dom->getElementById('b');
        $changed = (new AddAriaLabelTransform())->apply($dom, $btn, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_empty_string_label(): void {
        $dom     = $this->dom('<html><body><button id="b">×</button></body></html>');
        $btn     = $dom->getElementById('b');
        $changed = (new AddAriaLabelTransform())->apply($dom, $btn, ['aria_label' => '']);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new AddAriaLabelTransform())->apply($dom, null, ['aria_label' => 'label']);
        $this->assertFalse($changed);
    }
}
