<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\SetAltEmptyDecorativeTransform;

class SetAltEmptyDecorativeTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_sets_empty_alt_and_presentation_role(): void {
        $dom     = $this->dom('<html><body><img src="deco.png" alt="something"></body></html>');
        $img     = $dom->getElementsByTagName('img')->item(0);
        $changed = (new SetAltEmptyDecorativeTransform())->apply($dom, $img, []);

        $this->assertTrue($changed);
        $this->assertSame('', $img->getAttribute('alt'));
        $this->assertSame('presentation', $img->getAttribute('role'));
    }

    public function test_sets_empty_alt_when_no_previous_alt(): void {
        $dom     = $this->dom('<html><body><img src="icon.png"></body></html>');
        $img     = $dom->getElementsByTagName('img')->item(0);
        $changed = (new SetAltEmptyDecorativeTransform())->apply($dom, $img, []);

        $this->assertTrue($changed);
        $this->assertSame('', $img->getAttribute('alt'));
        $this->assertSame('presentation', $img->getAttribute('role'));
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new SetAltEmptyDecorativeTransform())->apply($dom, null, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_non_img_element(): void {
        $dom     = $this->dom('<html><body><div id="d"></div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new SetAltEmptyDecorativeTransform())->apply($dom, $div, []);
        $this->assertFalse($changed);
    }
}
