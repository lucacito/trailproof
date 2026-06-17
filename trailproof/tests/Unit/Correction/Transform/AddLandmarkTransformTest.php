<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\AddLandmarkTransform;

class AddLandmarkTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_adds_role_main_and_id_when_element_has_no_id(): void {
        // Use an element without an id so the transform can auto-set id="main"
        $dom     = $this->dom('<html><body><div class="wrap"></div></body></html>');
        $div     = $dom->getElementsByTagName('div')->item(0);
        $changed = (new AddLandmarkTransform())->apply($dom, $div, ['role' => 'main']);

        $this->assertTrue($changed);
        $this->assertSame('main', $div->getAttribute('role'));
        $this->assertSame('main', $div->getAttribute('id'));
    }

    public function test_adds_role_main_without_overriding_existing_id(): void {
        $dom     = $this->dom('<html><body><div id="content"></div></body></html>');
        $div     = $dom->getElementById('content');
        (new AddLandmarkTransform())->apply($dom, $div, ['role' => 'main']);

        // Existing id must be preserved
        $this->assertSame('content', $div->getAttribute('id'));
    }

    public function test_adds_non_main_role_without_injecting_id(): void {
        // Element has no existing id; complementary role should not auto-set one
        $dom     = $this->dom('<html><body><aside class="sidebar"></aside></body></html>');
        $aside   = $dom->getElementsByTagName('aside')->item(0);
        $changed = (new AddLandmarkTransform())->apply($dom, $aside, ['role' => 'complementary']);

        $this->assertTrue($changed);
        $this->assertSame('complementary', $aside->getAttribute('role'));
        $this->assertFalse($aside->hasAttribute('id'));
    }

    public function test_returns_false_when_role_missing_from_payload(): void {
        $dom     = $this->dom('<html><body><div id="d"></div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new AddLandmarkTransform())->apply($dom, $div, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new AddLandmarkTransform())->apply($dom, null, ['role' => 'main']);
        $this->assertFalse($changed);
    }
}
