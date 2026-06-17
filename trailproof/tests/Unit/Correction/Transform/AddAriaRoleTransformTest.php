<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\AddAriaRoleTransform;

class AddAriaRoleTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    /** @dataProvider valid_roles */
    public function test_sets_valid_role(string $role): void {
        $dom     = $this->dom('<html><body><div id="d"></div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new AddAriaRoleTransform())->apply($dom, $div, ['role' => $role]);

        $this->assertTrue($changed);
        $this->assertSame($role, $div->getAttribute('role'));
    }

    public static function valid_roles(): array {
        return [
            ['navigation'],
            ['banner'],
            ['contentinfo'],
            ['complementary'],
            ['main'],
            ['search'],
            ['list'],
            ['listitem'],
            ['none'],
            ['presentation'],
        ];
    }

    public function test_returns_false_for_invalid_role(): void {
        $dom     = $this->dom('<html><body><div id="d"></div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new AddAriaRoleTransform())->apply($dom, $div, ['role' => 'not-a-role']);
        $this->assertFalse($changed);
    }

    public function test_returns_false_when_role_missing(): void {
        $dom     = $this->dom('<html><body><div id="d"></div></body></html>');
        $div     = $dom->getElementById('d');
        $changed = (new AddAriaRoleTransform())->apply($dom, $div, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new AddAriaRoleTransform())->apply($dom, null, ['role' => 'banner']);
        $this->assertFalse($changed);
    }
}
