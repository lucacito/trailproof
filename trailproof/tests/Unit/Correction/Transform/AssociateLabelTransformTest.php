<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction\Transform;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Trailproof\Correction\Transform\AssociateLabelTransform;

class AssociateLabelTransformTest extends TestCase {

    private function dom(string $html): DOMDocument {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        return $dom;
    }

    public function test_adds_aria_label_via_label_text(): void {
        $dom     = $this->dom('<html><body><input id="i" type="email"></body></html>');
        $input   = $dom->getElementById('i');
        $changed = (new AssociateLabelTransform())->apply($dom, $input, ['label_text' => 'Email address']);

        $this->assertTrue($changed);
        $this->assertSame('Email address', $input->getAttribute('aria-label'));
    }

    public function test_label_text_takes_priority_over_label_id(): void {
        $dom   = $this->dom('<html><body><label id="lbl">Name</label><input id="inp" type="text"></body></html>');
        $input = $dom->getElementById('inp');
        (new AssociateLabelTransform())->apply($dom, $input, ['label_text' => 'Full name', 'label_id' => 'lbl', 'input_id' => 'inp']);

        $this->assertSame('Full name', $input->getAttribute('aria-label'));
    }

    public function test_wires_existing_label_via_label_id_and_input_id(): void {
        $dom   = $this->dom('<html><body><label id="lbl">Name</label><input id="inp" type="text"></body></html>');
        $input = $dom->getElementById('inp');
        $changed = (new AssociateLabelTransform())->apply($dom, $input, ['label_id' => 'lbl', 'input_id' => 'inp-field']);

        $this->assertTrue($changed);
        $this->assertSame('inp-field', $input->getAttribute('id'));
        $label = $dom->getElementById('lbl');
        $this->assertSame('inp-field', $label->getAttribute('for'));
    }

    public function test_returns_false_when_no_payload(): void {
        $dom     = $this->dom('<html><body><input id="i" type="text"></body></html>');
        $input   = $dom->getElementById('i');
        $changed = (new AssociateLabelTransform())->apply($dom, $input, []);
        $this->assertFalse($changed);
    }

    public function test_returns_false_for_null_element(): void {
        $dom     = new DOMDocument();
        $changed = (new AssociateLabelTransform())->apply($dom, null, ['label_text' => 'Name']);
        $this->assertFalse($changed);
    }
}
