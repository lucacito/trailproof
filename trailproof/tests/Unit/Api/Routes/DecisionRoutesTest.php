<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Api\Routes;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Trailproof\Api\Routes\DecisionRoutes;
use Trailproof\Repository\CorrectionRepository;
use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;
use WP_REST_Request;
use WP_REST_Response;

class DecisionRoutesTest extends TestCase {

    private IssueRepository&MockObject       $issue_repo;
    private CorrectionRepository&MockObject  $correction_repo;
    private DecisionLogRepository&MockObject $log_repo;
    private DecisionRoutes                   $routes;

    protected function setUp(): void {
        $this->issue_repo      = $this->createMock(IssueRepository::class);
        $this->correction_repo = $this->createMock(CorrectionRepository::class);
        $this->log_repo        = $this->createMock(DecisionLogRepository::class);
        $this->routes          = new DecisionRoutes($this->issue_repo, $this->correction_repo, $this->log_repo);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makeRequest(int $id, array $json_params): WP_REST_Request {
        $req = new WP_REST_Request();
        $req->set_param('id', (string) $id);
        $req->set_json_params($json_params);
        return $req;
    }

    private function issueRow(array $overrides = []): array {
        return array_merge([
            'id'          => 1,
            'fingerprint' => 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            'rule_id'     => 'html-has-lang',
            'selector'    => 'html',
            'url'         => 'https://example.com/',
            'post_id'     => 0,
            'status'      => 'open',
        ], $overrides);
    }

    // ── apply — Bucket A (auto-payload) ───────────────────────────────────────

    public function test_apply_bucket_a_creates_correction_with_auto_payload(): void {
        $issue = $this->issueRow(['rule_id' => 'html-has-lang', 'selector' => 'html']);
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->correction_repo->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data): bool {
                return $data['transform_type'] === 'set_lang'
                    && isset($data['payload']['lang'])
                    && $data['payload']['lang'] !== '';
            }))
            ->willReturn(42);
        $this->issue_repo->expects($this->once())->method('set_status')->with(1, 'fixed');
        $this->log_repo->expects($this->once())->method('log');

        $req      = $this->makeRequest(1, ['action' => 'apply', 'transform_type' => 'set_lang', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(201, $response->get_status());
        $data = $response->get_data();
        $this->assertTrue($data['ok']);
        $this->assertSame('fixed', $data['new_status']);
        $this->assertSame(42, $data['correction_id']);
    }

    public function test_apply_bucket_a_bypass_creates_skiplink_correction(): void {
        $issue = $this->issueRow(['rule_id' => 'bypass', 'selector' => 'body']);
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->correction_repo->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data): bool {
                return $data['transform_type'] === 'inject_skiplink'
                    && ($data['payload']['target'] ?? '') === '#main';
            }))
            ->willReturn(7);
        $this->issue_repo->method('set_status');
        $this->log_repo->method('log');

        $req      = $this->makeRequest(1, ['action' => 'apply', 'transform_type' => 'inject_skiplink', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(201, $response->get_status());
    }

    public function test_apply_divi_accordion_uses_widget_pattern_payload(): void {
        $issue = $this->issueRow(['rule_id' => 'divi-accordion', 'selector' => '.et_pb_accordion']);
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->correction_repo->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data): bool {
                return $data['transform_type'] === 'widget_aria_pattern'
                    && ($data['payload']['pattern'] ?? '') === 'divi-accordion';
            }))
            ->willReturn(3);
        $this->issue_repo->method('set_status');
        $this->log_repo->method('log');

        $req      = $this->makeRequest(1, ['action' => 'apply', 'transform_type' => 'widget_aria_pattern', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(201, $response->get_status());
    }

    // ── apply — Bucket B (human payload required) ─────────────────────────────

    public function test_apply_bucket_b_uses_provided_payload(): void {
        $issue = $this->issueRow(['rule_id' => 'color-contrast', 'selector' => 'p.hero-text']);
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->correction_repo->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data): bool {
                return $data['transform_type'] === 'add_aria_label'
                    && ($data['payload']['fg'] ?? '') === '#333333';
            }))
            ->willReturn(10);
        $this->issue_repo->method('set_status');
        $this->log_repo->method('log');

        $req = $this->makeRequest(1, [
            'action'         => 'apply',
            'transform_type' => 'add_aria_label',
            'payload'        => ['fg' => '#333333', 'bg' => '#ffffff'],
        ]);
        $response = $this->routes->decide($req);

        $this->assertSame(201, $response->get_status());
    }

    // ── na ────────────────────────────────────────────────────────────────────

    public function test_na_marks_issue_not_applicable(): void {
        $issue = $this->issueRow();
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->issue_repo->expects($this->once())->method('set_status')->with(1, 'na');
        $this->correction_repo->expects($this->never())->method('create');
        $this->log_repo->expects($this->once())->method('log')
            ->with($this->stringContains('na'), $this->anything(), $this->anything(), $this->anything(), $this->anything());

        $req      = $this->makeRequest(1, ['action' => 'na']);
        $response = $this->routes->decide($req);

        $this->assertSame(200, $response->get_status());
        $this->assertSame('na', $response->get_data()['new_status']);
    }

    // ── defer ─────────────────────────────────────────────────────────────────

    public function test_defer_marks_issue_deferred(): void {
        $issue = $this->issueRow();
        $this->issue_repo->method('get_by_id')->willReturn($issue);
        $this->issue_repo->expects($this->once())->method('set_status')->with(1, 'deferred');
        $this->correction_repo->expects($this->never())->method('create');

        $req      = $this->makeRequest(1, ['action' => 'defer']);
        $response = $this->routes->decide($req);

        $this->assertSame(200, $response->get_status());
        $this->assertSame('deferred', $response->get_data()['new_status']);
    }

    // ── error cases ───────────────────────────────────────────────────────────

    public function test_returns_404_when_issue_not_found(): void {
        $this->issue_repo->method('get_by_id')->willReturn(null);

        $req      = $this->makeRequest(999, ['action' => 'apply', 'transform_type' => 'set_lang', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(404, $response->get_status());
    }

    public function test_returns_400_for_invalid_action(): void {
        $issue = $this->issueRow();
        $this->issue_repo->method('get_by_id')->willReturn($issue);

        $req      = $this->makeRequest(1, ['action' => 'delete_everything']);
        $response = $this->routes->decide($req);

        $this->assertSame(400, $response->get_status());
        $this->assertStringContainsString('action', $response->get_data()['error']);
    }

    public function test_returns_400_when_transform_type_missing_on_apply(): void {
        $issue = $this->issueRow();
        $this->issue_repo->method('get_by_id')->willReturn($issue);

        $req      = $this->makeRequest(1, ['action' => 'apply', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(400, $response->get_status());
        $this->assertStringContainsString('transform_type', $response->get_data()['error']);
    }

    public function test_returns_400_for_invalid_transform_type(): void {
        $issue = $this->issueRow();
        $this->issue_repo->method('get_by_id')->willReturn($issue);

        $req      = $this->makeRequest(1, ['action' => 'apply', 'transform_type' => 'not_real', 'payload' => []]);
        $response = $this->routes->decide($req);

        $this->assertSame(400, $response->get_status());
        $this->assertStringContainsString('transform_type', $response->get_data()['error']);
    }
}
