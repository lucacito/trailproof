<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\RewriteLinkTextTransform;

class RewriteLinkTextTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_replaces_text_content_for_text_only_link(): void {
        $dom     = $this->dom('<html><body><a id="a" href="/pricing">Click here</a></body></html>');
        $a       = $dom->getElementById('a');
        $changed = (new RewriteLinkTextTransform())->apply($dom, $a, ['text' => 'View our pricing plans']);

        $this->assertTrue($changed);
        $this->assertSame('View our pricing plans', $a->textContent);
        $this->assertFalse($a->hasAttribute('aria-label'));
    }

    public function test_adds_aria_label_when_link_has_element_children(): void {
        $dom     = $this->dom('<html><body><a id="a" href="/p"><img src="icon.png"> Read more</a></body></html>');
        $a       = $dom->getElementById('a');
        $changed = (new RewriteLinkTextTransform())->apply($dom, $a, ['text' => 'Read our accessibility statement']);

        $this->assertTrue($changed);
        $this->assertSame('Read our accessibility statement', $a->getAttribute('aria-label'));
    }

    public function test_returns_false_when_text_missing(): void {
        $dom     = $this->dom('<html><body><a id="a" href="/">Link</a></body></html>');
        $a       = $dom->getElementById('a');
        $changed = (new RewriteLinkTextTransform())->apply($dom, $a, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_non_anchor_element(): void {
        $dom     = $this->dom('<html><body><div id="d">text</div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new RewriteLinkTextTransform())->apply($dom, $div, ['text' => 'label']);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new RewriteLinkTextTransform())->apply($dom, null, ['text' => 'label']);
        $this->assertFalse($changed);
    }
}
