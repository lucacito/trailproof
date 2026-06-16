<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\SetAltTransform;

class SetAltTransformTest extends TestCase {

    private function dom_img(string $extra = ''): array {
        $dom = new DOMDocument();
        @$dom->loadHTML("<html><body><img {$extra}/></body></html>");
        $el = $dom->getElementsByTagName('img')->item(0);
        return [$dom, $el];
    }

    public function test_sets_alt_on_img(): void {
        [$dom, $el] = $this->dom_img();
        $transform = new SetAltTransform();

        $result = $transform->apply($dom, $el, ['alt' => 'A red barn in a field']);

        $this->assertTrue($result);
        $this->assertSame('A red barn in a field', $el->getAttribute('alt'));
    }

    public function test_overwrites_existing_alt(): void {
        [$dom, $el] = $this->dom_img('alt="old"');
        $transform = new SetAltTransform();

        $transform->apply($dom, $el, ['alt' => 'new']);

        $this->assertSame('new', $el->getAttribute('alt'));
    }

    public function test_accepts_empty_string_alt_for_decorative(): void {
        [$dom, $el] = $this->dom_img();
        $transform = new SetAltTransform();

        $result = $transform->apply($dom, $el, ['alt' => '']);

        $this->assertTrue($result);
        $this->assertSame('', $el->getAttribute('alt'));
    }

    public function test_returns_false_when_element_is_null(): void {
        $dom = new DOMDocument();
        $transform = new SetAltTransform();

        $this->assertFalse($transform->apply($dom, null, ['alt' => 'text']));
    }

    public function test_returns_false_when_element_is_not_img(): void {
        $dom = new DOMDocument();
        @$dom->loadHTML('<html><body><div></div></body></html>');
        $el = $dom->getElementsByTagName('div')->item(0);
        $transform = new SetAltTransform();

        $this->assertFalse($transform->apply($dom, $el, ['alt' => 'text']));
    }

    public function test_returns_false_when_alt_key_missing(): void {
        [$dom, $el] = $this->dom_img();
        $transform = new SetAltTransform();

        $this->assertFalse($transform->apply($dom, $el, []));
    }
}
