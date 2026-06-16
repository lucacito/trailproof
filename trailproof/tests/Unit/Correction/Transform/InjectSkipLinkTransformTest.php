<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\InjectSkipLinkTransform;

class InjectSkipLinkTransformTest extends TestCase {

    private function dom(string $body = ''): DOMDocument {
        $dom = new DOMDocument();
        @$dom->loadHTML("<html><head></head><body>{$body}</body></html>");
        return $dom;
    }

    public function test_injects_skip_link_as_first_child_of_body(): void {
        $dom   = $this->dom('<p>Content</p>');
        $body  = $dom->getElementsByTagName('body')->item(0);
        $transform = new InjectSkipLinkTransform();

        $result = $transform->apply($dom, $body, ['target' => '#main', 'text' => 'Skip to main content']);

        $this->assertTrue($result);
        $first = $body->firstChild;
        $this->assertSame('a', strtolower($first->nodeName));
        $this->assertSame('#main', $first->getAttribute('href'));
        $this->assertSame('tp-skip-link', $first->getAttribute('class'));
        $this->assertSame('Skip to main content', $first->textContent);
    }

    public function test_injects_style_into_head(): void {
        $dom  = $this->dom();
        $body = $dom->getElementsByTagName('body')->item(0);
        $transform = new InjectSkipLinkTransform();

        $transform->apply($dom, $body, ['target' => '#main', 'text' => 'Skip']);

        $head   = $dom->getElementsByTagName('head')->item(0);
        $styles = $head->getElementsByTagName('style');
        $this->assertGreaterThan(0, $styles->length);
        $this->assertStringContainsString('tp-skip-link', $styles->item(0)->textContent);
    }

    public function test_does_not_inject_when_skip_link_already_exists(): void {
        $dom  = $this->dom('<a href="#content">Skip to content</a><p>Body</p>');
        $body = $dom->getElementsByTagName('body')->item(0);
        $transform = new InjectSkipLinkTransform();

        $result = $transform->apply($dom, $body, ['target' => '#main', 'text' => 'Skip to main content']);

        $this->assertFalse($result);
    }

    public function test_returns_false_when_element_is_null(): void {
        $dom = $this->dom();
        $transform = new InjectSkipLinkTransform();

        $this->assertFalse($transform->apply($dom, null, ['target' => '#main', 'text' => 'Skip']));
    }

    public function test_returns_false_when_element_is_not_body(): void {
        $dom = $this->dom('<div id="wrap"></div>');
        $el  = $dom->getElementsByTagName('div')->item(0);
        $transform = new InjectSkipLinkTransform();

        $this->assertFalse($transform->apply($dom, $el, ['target' => '#main', 'text' => 'Skip']));
    }

    public function test_returns_false_when_target_is_explicit_empty_string(): void {
        $dom  = $this->dom();
        $body = $dom->getElementsByTagName('body')->item(0);
        $transform = new InjectSkipLinkTransform();

        $this->assertFalse($transform->apply($dom, $body, ['target' => '', 'text' => 'Skip']));
    }

    public function test_uses_default_target_when_key_absent(): void {
        $dom  = $this->dom();
        $body = $dom->getElementsByTagName('body')->item(0);
        $transform = new InjectSkipLinkTransform();

        $result = $transform->apply($dom, $body, ['text' => 'Skip to main content']);

        $this->assertTrue($result);
        $link = $body->firstChild;
        $this->assertSame('#main', $link->getAttribute('href'));
    }
}
