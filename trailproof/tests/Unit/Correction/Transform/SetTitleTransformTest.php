<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\SetTitleTransform;

class SetTitleTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_replaces_existing_title(): void {
        $dom     = $this->dom('<html><head><title>Old title</title></head><body></body></html>');
        $changed = (new SetTitleTransform())->apply($dom, null, ['title' => 'About Us | Acme Co']);

        $this->assertTrue($changed);
        $this->assertSame('About Us | Acme Co', $dom->getElementsByTagName('title')->item(0)->textContent);
    }

    public function test_creates_title_element_when_absent(): void {
        $dom     = $this->dom('<html><head></head><body></body></html>');
        $changed = (new SetTitleTransform())->apply($dom, null, ['title' => 'New Page Title']);

        $this->assertTrue($changed);
        $this->assertGreaterThan(0, $dom->getElementsByTagName('title')->length);
        $this->assertSame('New Page Title', $dom->getElementsByTagName('title')->item(0)->textContent);
    }

    public function test_returns_false_when_title_missing_from_payload(): void {
        $dom     = $this->dom('<html><head><title>Old</title></head><body></body></html>');
        $changed = (new SetTitleTransform())->apply($dom, null, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_when_title_is_empty_string(): void {
        $dom     = $this->dom('<html><head><title>Old</title></head><body></body></html>');
        $changed = (new SetTitleTransform())->apply($dom, null, ['title' => '']);
        $this->assertFalse($changed);
        $this->assertSame('Old', $dom->getElementsByTagName('title')->item(0)->textContent);
    }
}
