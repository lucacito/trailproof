<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\WidgetAriaPatternTransform;

class WidgetAriaPatternTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    // ── divi-accordion ───────────────────────────────────────────────────────

    public function test_accordion_adds_aria_attributes(): void {
        $html = '
        <html><body>
        <div class="et_pb_accordion">
            <div class="et_pb_accordion_item">
                <h3 class="et_pb_toggle_title">Panel 1</h3>
                <div class="et_pb_toggle_content">Content 1</div>
            </div>
        </div>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-accordion']);

        $this->assertTrue($changed);
        $xpath  = new \DOMXPath($dom);
        $titles = $xpath->query('//*[contains(@class,"et_pb_toggle_title")]');
        $this->assertSame('button', $titles->item(0)->getAttribute('role'));
        $this->assertNotEmpty($titles->item(0)->getAttribute('aria-expanded'));
        $this->assertNotEmpty($titles->item(0)->getAttribute('aria-controls'));
    }

    public function test_accordion_idempotent_second_pass(): void {
        $html = '
        <html><body>
        <div class="et_pb_accordion">
            <div class="et_pb_accordion_item">
                <h3 class="et_pb_toggle_title" aria-expanded="false">Panel 1</h3>
                <div class="et_pb_toggle_content" role="region">Content 1</div>
            </div>
        </div>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-accordion']);

        $this->assertFalse($changed);
    }

    public function test_accordion_returns_false_when_no_container(): void {
        $dom     = $this->dom('<html><body><p>No accordion here</p></body></html>');
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-accordion']);
        $this->assertFalse($changed);
    }

    // ── divi-gallery ─────────────────────────────────────────────────────────

    public function test_gallery_adds_list_roles(): void {
        $html = '
        <html><body>
        <div class="et_pb_gallery_grid">
            <div class="et_pb_gallery_item"><img src="a.jpg"></div>
            <div class="et_pb_gallery_item"><img src="b.jpg"></div>
        </div>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-gallery']);

        $this->assertTrue($changed);
        $xpath = new \DOMXPath($dom);
        $grid  = $xpath->query('//*[contains(@class,"et_pb_gallery_grid")]')->item(0);
        $this->assertSame('list', $grid->getAttribute('role'));

        $items = $xpath->query('//*[contains(@class,"et_pb_gallery_item")]');
        foreach ($items as $item) {
            $this->assertSame('listitem', $item->getAttribute('role'));
        }
    }

    public function test_gallery_idempotent_second_pass(): void {
        $html = '
        <html><body>
        <div class="et_pb_gallery_grid" role="list">
            <div class="et_pb_gallery_item" role="listitem"><img src="a.jpg"></div>
        </div>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-gallery']);
        $this->assertFalse($changed);
    }

    // ── divi-toggle ──────────────────────────────────────────────────────────

    public function test_toggle_adds_aria_attributes(): void {
        $html = '
        <html><body>
        <div class="et_pb_toggle">
            <h3 class="et_pb_toggle_title">Toggle Title</h3>
            <div class="et_pb_toggle_content">Toggle Content</div>
        </div>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-toggle']);

        $this->assertTrue($changed);
        $xpath = new \DOMXPath($dom);
        $title = $xpath->query('//*[contains(@class,"et_pb_toggle_title")]')->item(0);
        $this->assertSame('button', $title->getAttribute('role'));
        $this->assertSame('false', $title->getAttribute('aria-expanded'));
    }

    // ── divi-menu ────────────────────────────────────────────────────────────

    public function test_menu_adds_aria_haspopup(): void {
        $html = '
        <html><body>
        <nav class="et_pb_menu">
            <ul><li class="menu-item-has-children"><a href="#">Products</a>
                <ul><li><a href="/p1">P1</a></li></ul>
            </li></ul>
        </nav>
        </body></html>';

        $dom     = $this->dom($html);
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'divi-menu']);

        $this->assertTrue($changed);
        $xpath = new \DOMXPath($dom);
        $link  = $xpath->query(
            '//nav[contains(@class,"et_pb_menu")]//li[contains(@class,"menu-item-has-children")]/a'
        )->item(0);
        $this->assertSame('true', $link->getAttribute('aria-haspopup'));
        $this->assertSame('false', $link->getAttribute('aria-expanded'));
    }

    // ── unknown pattern ───────────────────────────────────────────────────────

    public function test_returns_false_for_unknown_pattern(): void {
        $dom     = $this->dom('<html><body></body></html>');
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, ['pattern' => 'unknown-widget']);
        $this->assertFalse($changed);
    }

    public function test_returns_false_when_pattern_missing(): void {
        $dom     = $this->dom('<html><body></body></html>');
        $changed = (new WidgetAriaPatternTransform())->apply($dom, null, []);
        $this->assertFalse($changed);
    }
}
