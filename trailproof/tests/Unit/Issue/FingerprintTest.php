<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Issue;

use PHPUnit\Framework\TestCase;
use Trailproof\Issue\Fingerprint;

class FingerprintTest extends TestCase {

    public function test_returns_64_char_hex_string(): void {
        $fp = Fingerprint::compute('img.hero', 'image-alt', 5);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $fp);
    }

    public function test_same_inputs_produce_same_fingerprint(): void {
        $a = Fingerprint::compute('img.hero', 'image-alt', 5);
        $b = Fingerprint::compute('img.hero', 'image-alt', 5);
        $this->assertSame($a, $b);
    }

    public function test_different_selectors_differ(): void {
        $a = Fingerprint::compute('img.hero',    'image-alt', 5);
        $b = Fingerprint::compute('img.banner',  'image-alt', 5);
        $this->assertNotSame($a, $b);
    }

    public function test_different_rule_ids_differ(): void {
        $a = Fingerprint::compute('img.hero', 'image-alt',     5);
        $b = Fingerprint::compute('img.hero', 'color-contrast', 5);
        $this->assertNotSame($a, $b);
    }

    public function test_different_post_ids_differ(): void {
        $a = Fingerprint::compute('img.hero', 'image-alt', 1);
        $b = Fingerprint::compute('img.hero', 'image-alt', 2);
        $this->assertNotSame($a, $b);
    }

    public function test_selector_normalised_whitespace(): void {
        $a = Fingerprint::compute('img .hero',   'image-alt', 5);
        $b = Fingerprint::compute('img  .hero',  'image-alt', 5);
        $this->assertSame($a, $b);
    }

    public function test_selector_normalised_case(): void {
        $a = Fingerprint::compute('IMG.HERO', 'image-alt', 5);
        $b = Fingerprint::compute('img.hero', 'image-alt', 5);
        $this->assertSame($a, $b);
    }

    public function test_rule_id_normalised_case(): void {
        $a = Fingerprint::compute('img.hero', 'IMAGE-ALT', 5);
        $b = Fingerprint::compute('img.hero', 'image-alt', 5);
        $this->assertSame($a, $b);
    }

    public function test_post_id_zero_falls_back_to_url(): void {
        $a = Fingerprint::compute('img.hero', 'image-alt', 0, 'https://example.com/page/');
        $b = Fingerprint::compute('img.hero', 'image-alt', 0, 'https://example.com/page');
        // Trailing slash stripped — same fingerprint
        $this->assertSame($a, $b);
    }

    public function test_post_id_zero_different_urls_differ(): void {
        $a = Fingerprint::compute('img.hero', 'image-alt', 0, 'https://example.com/page-a');
        $b = Fingerprint::compute('img.hero', 'image-alt', 0, 'https://example.com/page-b');
        $this->assertNotSame($a, $b);
    }

    public function test_post_id_takes_priority_over_url(): void {
        // Same post_id, different URLs → same fingerprint (slug may change)
        $a = Fingerprint::compute('img.hero', 'image-alt', 7, 'https://example.com/old-slug');
        $b = Fingerprint::compute('img.hero', 'image-alt', 7, 'https://example.com/new-slug');
        $this->assertSame($a, $b);
    }
}
