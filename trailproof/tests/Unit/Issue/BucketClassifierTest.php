<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Issue;

use PHPUnit\Framework\TestCase;
use Trailproof\Issue\BucketClassifier;

class BucketClassifierTest extends TestCase {

    public function test_known_bucket_a_rules(): void {
        $this->assertSame('A', BucketClassifier::classify('html-has-lang'));
        $this->assertSame('A', BucketClassifier::classify('bypass'));
        $this->assertSame('A', BucketClassifier::classify('image-alt'));
        $this->assertSame('A', BucketClassifier::classify('label'));
        $this->assertSame('A', BucketClassifier::classify('divi-accordion'));
        $this->assertSame('A', BucketClassifier::classify('gutenberg-image-alt'));
        $this->assertSame('A', BucketClassifier::classify('elementor-image-alt'));
    }

    public function test_known_bucket_b_rules(): void {
        $this->assertSame('B', BucketClassifier::classify('color-contrast'));
        $this->assertSame('B', BucketClassifier::classify('heading-order'));
        $this->assertSame('B', BucketClassifier::classify('tabindex'));
        $this->assertSame('B', BucketClassifier::classify('gutenberg-button-text'));
        $this->assertSame('B', BucketClassifier::classify('elementor-carousel-aria'));
    }

    public function test_unknown_rule_falls_back_to_bucket_c(): void {
        $this->assertSame('C', BucketClassifier::classify('unknown-rule'));
        $this->assertSame('C', BucketClassifier::classify(''));
        $this->assertSame('C', BucketClassifier::classify('audio-caption'));
    }

    public function test_impact_to_severity_mapping(): void {
        $this->assertSame('critical', BucketClassifier::impact_to_severity('critical'));
        $this->assertSame('serious',  BucketClassifier::impact_to_severity('serious'));
        $this->assertSame('moderate', BucketClassifier::impact_to_severity('moderate'));
        $this->assertSame('minor',    BucketClassifier::impact_to_severity('minor'));
        $this->assertSame('moderate', BucketClassifier::impact_to_severity(''));
        $this->assertSame('moderate', BucketClassifier::impact_to_severity('unknown'));
    }

    public function test_impact_to_severity_is_case_insensitive(): void {
        $this->assertSame('critical', BucketClassifier::impact_to_severity('CRITICAL'));
        $this->assertSame('serious',  BucketClassifier::impact_to_severity('Serious'));
    }

    public function test_priority_score_respects_impact(): void {
        $critical = BucketClassifier::priority_score('image-alt', 'critical', 'A');
        $minor    = BucketClassifier::priority_score('image-alt', 'minor',    'A');
        $this->assertGreaterThan($minor, $critical);
    }

    public function test_priority_score_bucket_a_boost(): void {
        $bucket_a = BucketClassifier::priority_score('image-alt', 'moderate', 'A');
        $bucket_c = BucketClassifier::priority_score('image-alt', 'moderate', 'C');
        $this->assertGreaterThan($bucket_c, $bucket_a);
    }

    public function test_priority_score_high_exposure_boost(): void {
        $labeled   = BucketClassifier::priority_score('label', 'moderate', 'A');
        $plain     = BucketClassifier::priority_score('image-alt', 'moderate', 'A');
        $this->assertGreaterThanOrEqual($plain, $labeled);
    }

    public function test_priority_score_capped_at_100(): void {
        $score = BucketClassifier::priority_score('label', 'critical', 'A');
        $this->assertLessThanOrEqual(100, $score);
    }
}
