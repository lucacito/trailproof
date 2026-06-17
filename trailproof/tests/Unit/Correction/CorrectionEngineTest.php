<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Correction;

use PHPUnit\Framework\TestCase;
use Trailproof\Correction\CorrectionEngine;
use Trailproof\Repository\CorrectionRepository;

/**
 * Tests CorrectionEngine::apply_corrections() — the full server-side render pipeline.
 * Uses a mocked CorrectionRepository (never called; corrections are passed directly).
 */
class CorrectionEngineTest extends TestCase {

    private CorrectionEngine $engine;

    protected function setUp(): void {
        $repo          = $this->createMock(CorrectionRepository::class);
        $this->engine  = new CorrectionEngine($repo);
    }

    private function correction(array $overrides): array {
        return array_merge([
            'transform_type' => 'set_lang',
            'selector'       => 'html',
            'payload_json'   => '{"lang":"en-US"}',
        ], $overrides);
    }

    // ── set_lang ─────────────────────────────────────────────────────────────

    public function test_set_lang_adds_lang_attribute(): void {
        $html   = '<html><head></head><body><p>Hello</p></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction(['transform_type' => 'set_lang', 'selector' => 'html', 'payload_json' => '{"lang":"en-US"}']),
        ]);

        $this->assertStringContainsString('lang="en-US"', $result);
    }

    // ── inject_skiplink ───────────────────────────────────────────────────────

    public function test_inject_skiplink_added_to_body(): void {
        $html   = '<html><head></head><body><nav>Nav</nav><main>Main</main></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'inject_skiplink',
                'selector'       => 'body',
                'payload_json'   => '{"target":"#main","text":"Skip to main content"}',
            ]),
        ]);

        $this->assertStringContainsString('Skip to main content', $result);
        $this->assertStringContainsString('#main', $result);
    }

    // ── set_alt_empty_decorative ──────────────────────────────────────────────

    public function test_set_alt_empty_decorative_sets_alt_and_role(): void {
        $html   = '<html><body><img src="bg.jpg" id="bg"></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'set_alt_empty_decorative',
                'selector'       => 'img#bg',
                'payload_json'   => '{}',
            ]),
        ]);

        $this->assertMatchesRegularExpression('/alt=""/', $result);
        $this->assertStringContainsString('role="presentation"', $result);
    }

    // ── set_alt ───────────────────────────────────────────────────────────────

    public function test_set_alt_sets_descriptive_alt(): void {
        $html   = '<html><body><img src="team.jpg" id="team"></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'set_alt',
                'selector'       => 'img#team',
                'payload_json'   => '{"alt":"The Acme engineering team in the office"}',
            ]),
        ]);

        $this->assertStringContainsString('The Acme engineering team in the office', $result);
    }

    // ── add_landmark ─────────────────────────────────────────────────────────

    public function test_add_landmark_sets_role_main(): void {
        $html   = '<html><body><div id="content"><p>Page content</p></div></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'add_landmark',
                'selector'       => 'div#content',
                'payload_json'   => '{"role":"main"}',
            ]),
        ]);

        $this->assertStringContainsString('role="main"', $result);
    }

    // ── set_title ─────────────────────────────────────────────────────────────

    public function test_set_title_replaces_page_title(): void {
        $html   = '<html><head><title>Old Title</title></head><body></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'set_title',
                'selector'       => 'html',
                'payload_json'   => '{"title":"About Us | Acme Co"}',
            ]),
        ]);

        $this->assertStringContainsString('About Us | Acme Co', $result);
        $this->assertStringNotContainsString('Old Title', $result);
    }

    // ── add_aria_label ────────────────────────────────────────────────────────

    public function test_add_aria_label_added_to_button(): void {
        $html   = '<html><body><button id="close">×</button></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'add_aria_label',
                'selector'       => 'button#close',
                'payload_json'   => '{"aria_label":"Close dialog"}',
            ]),
        ]);

        $this->assertStringContainsString('aria-label="Close dialog"', $result);
    }

    // ── rewrite_link_text ─────────────────────────────────────────────────────

    public function test_rewrite_link_text_replaces_text_link(): void {
        $html   = '<html><body><a id="more" href="/about">Read more</a></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'rewrite_link_text',
                'selector'       => 'a#more',
                'payload_json'   => '{"text":"Read more about our company"}',
            ]),
        ]);

        $this->assertStringContainsString('Read more about our company', $result);
    }

    // ── associate_label ───────────────────────────────────────────────────────

    public function test_associate_label_adds_aria_label_to_input(): void {
        $html   = '<html><body><input id="email" type="email"></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'associate_label',
                'selector'       => 'input#email',
                'payload_json'   => '{"label_text":"Email address"}',
            ]),
        ]);

        $this->assertStringContainsString('aria-label="Email address"', $result);
    }

    // ── error handling ────────────────────────────────────────────────────────

    public function test_invalid_selector_is_skipped(): void {
        $html   = '<html><body><p>Content</p></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'set_lang',
                'selector'       => '::invalid-css-selector!!',
                'payload_json'   => '{"lang":"en"}',
            ]),
        ]);

        // Should return original HTML unchanged (correction skipped)
        $this->assertStringNotContainsString('lang="en"', $result);
    }

    public function test_unknown_transform_type_is_skipped(): void {
        $html   = '<html><head></head><body><p>Content</p></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'not_a_real_transform',
                'selector'       => 'html',
                'payload_json'   => '{"lang":"en"}',
            ]),
        ]);

        $this->assertStringNotContainsString('lang="en"', $result);
    }

    public function test_returns_original_html_when_no_corrections(): void {
        $html   = '<html><body><p>Unchanged</p></body></html>';
        $result = $this->engine->apply_corrections($html, []);
        $this->assertStringContainsString('Unchanged', $result);
    }

    public function test_multiple_corrections_applied_in_order(): void {
        $html   = '<html><head><title>Old</title></head><body><img src="deco.jpg" id="d"></body></html>';
        $result = $this->engine->apply_corrections($html, [
            $this->correction([
                'transform_type' => 'set_lang',
                'selector'       => 'html',
                'payload_json'   => '{"lang":"en-AU"}',
            ]),
            $this->correction([
                'transform_type' => 'set_title',
                'selector'       => 'html',
                'payload_json'   => '{"title":"Home | Acme"}',
            ]),
            $this->correction([
                'transform_type' => 'set_alt_empty_decorative',
                'selector'       => 'img#d',
                'payload_json'   => '{}',
            ]),
        ]);

        $this->assertStringContainsString('lang="en-AU"', $result);
        $this->assertStringContainsString('Home | Acme', $result);
        $this->assertStringContainsString('role="presentation"', $result);
    }
}
