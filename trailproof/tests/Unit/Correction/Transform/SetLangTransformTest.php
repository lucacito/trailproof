<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\SetLangTransform;

class SetLangTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        return $dom;
    }

    public function test_sets_lang_on_html_element(): void {
        $dom  = $this->dom('<html><head></head><body></body></html>');
        $el   = $dom->getElementsByTagName('html')->item(0);
        $transform = new SetLangTransform();

        $result = $transform->apply($dom, $el, ['lang' => 'en']);

        $this->assertTrue($result);
        $this->assertSame('en', $el->getAttribute('lang'));
    }

    public function test_overwrites_existing_lang(): void {
        $dom  = $this->dom('<html lang="fr"><head></head><body></body></html>');
        $el   = $dom->getElementsByTagName('html')->item(0);
        $transform = new SetLangTransform();

        $transform->apply($dom, $el, ['lang' => 'en-US']);

        $this->assertSame('en-US', $el->getAttribute('lang'));
    }

    public function test_returns_false_when_element_is_null(): void {
        $dom = $this->dom('<html></html>');
        $transform = new SetLangTransform();

        $this->assertFalse($transform->apply($dom, null, ['lang' => 'en']));
    }

    public function test_returns_false_when_lang_missing_from_payload(): void {
        $dom  = $this->dom('<html></html>');
        $el   = $dom->getElementsByTagName('html')->item(0);
        $transform = new SetLangTransform();

        $this->assertFalse($transform->apply($dom, $el, []));
    }

    public function test_returns_false_when_lang_is_empty_string(): void {
        $dom  = $this->dom('<html></html>');
        $el   = $dom->getElementsByTagName('html')->item(0);
        $transform = new SetLangTransform();

        $this->assertFalse($transform->apply($dom, $el, ['lang' => '']));
    }
}
