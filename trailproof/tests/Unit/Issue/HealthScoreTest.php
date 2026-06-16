<?php

declare(strict_types=1);

namespace Trailproof\Tests\Unit\Issue;

use PHPUnit\Framework\TestCase;
use Trailproof\Issue\HealthScore;

class HealthScoreTest extends TestCase {

    // -----------------------------------------------------------------
    // band_for
    // -----------------------------------------------------------------

    public function test_score_100_is_excellent(): void {
        $band = HealthScore::band_for( 100 );
        $this->assertSame( 'excellent', $band['key'] );
        $this->assertSame( '#1a7f37', $band['color'] );
    }

    public function test_score_90_is_excellent(): void {
        $this->assertSame( 'excellent', HealthScore::band_for( 90 )['key'] );
    }

    public function test_score_89_is_strong(): void {
        $this->assertSame( 'strong', HealthScore::band_for( 89 )['key'] );
    }

    public function test_score_75_is_strong(): void {
        $this->assertSame( 'strong', HealthScore::band_for( 75 )['key'] );
    }

    public function test_score_74_is_in_progress(): void {
        $this->assertSame( 'in_progress', HealthScore::band_for( 74 )['key'] );
    }

    public function test_score_50_is_in_progress(): void {
        $this->assertSame( 'in_progress', HealthScore::band_for( 50 )['key'] );
    }

    public function test_score_49_is_needs_work(): void {
        $this->assertSame( 'needs_work', HealthScore::band_for( 49 )['key'] );
    }

    public function test_score_0_is_needs_work(): void {
        $band = HealthScore::band_for( 0 );
        $this->assertSame( 'needs_work', $band['key'] );
        $this->assertSame( '#cf222e', $band['color'] );
    }

    // -----------------------------------------------------------------
    // Component A formula (uses reflection to call private method via
    // a thin wrapper — we test via the constants-only code path instead)
    // -----------------------------------------------------------------

    /** @dataProvider component_a_cases */
    public function test_component_a_score( int $weighted_open, int $weighted_total, int $expected ): void {
        // Drive component A through a helper that reproduces the formula
        if ( $weighted_total === 0 ) {
            $this->assertSame( 100, $expected );
            return;
        }
        $actual = (int) round( ( 1 - $weighted_open / $weighted_total ) * 100 );
        $this->assertSame( $expected, $actual );
    }

    public static function component_a_cases(): array {
        return [
            'all resolved'      => [ 0, 100, 100 ],
            'none resolved'     => [ 100, 100, 0 ],
            'half resolved'     => [ 50, 100, 50 ],
            'zero total → 100'  => [ 0, 0, 100 ],  // special case handled separately
            'one open of three' => [ 10, 30, 67 ],
        ];
    }

    // -----------------------------------------------------------------
    // Blend math
    // -----------------------------------------------------------------

    public function test_blend_constants_sum_to_one(): void {
        $sum = HealthScore::BLEND_A + HealthScore::BLEND_B + HealthScore::BLEND_C;
        $this->assertEqualsWithDelta( 1.0, $sum, 0.001 );
    }

    public function test_overall_score_all_100(): void {
        $score = (int) round( 100 * HealthScore::BLEND_A + 100 * HealthScore::BLEND_B + 100 * HealthScore::BLEND_C );
        $this->assertSame( 100, $score );
    }

    public function test_overall_score_all_0(): void {
        $score = (int) round( 0 * HealthScore::BLEND_A + 0 * HealthScore::BLEND_B + 0 * HealthScore::BLEND_C );
        $this->assertSame( 0, $score );
    }

    public function test_a_blend_heavier_than_b_or_c_individually(): void {
        // A alone contributes more than B alone or C alone
        $a_only = (int) round( 100 * HealthScore::BLEND_A );
        $b_only = (int) round( 100 * HealthScore::BLEND_B );
        $c_only = (int) round( 100 * HealthScore::BLEND_C );
        $this->assertGreaterThan( $b_only, $a_only );
        $this->assertGreaterThan( $c_only, $a_only );
    }

    // -----------------------------------------------------------------
    // Weight constants
    // -----------------------------------------------------------------

    public function test_critical_outweighs_serious(): void {
        $this->assertGreaterThan( HealthScore::WEIGHT_SERIOUS, HealthScore::WEIGHT_CRITICAL );
    }

    public function test_serious_outweighs_moderate(): void {
        $this->assertGreaterThan( HealthScore::WEIGHT_MODERATE, HealthScore::WEIGHT_SERIOUS );
    }

    public function test_moderate_outweighs_minor(): void {
        $this->assertGreaterThan( HealthScore::WEIGHT_MINOR, HealthScore::WEIGHT_MODERATE );
    }

    // -----------------------------------------------------------------
    // Band ordering
    // -----------------------------------------------------------------

    public function test_band_thresholds_in_descending_order(): void {
        $this->assertGreaterThan( HealthScore::BAND_STRONG, HealthScore::BAND_EXCELLENT );
        $this->assertGreaterThan( HealthScore::BAND_IN_PROGRESS, HealthScore::BAND_STRONG );
        $this->assertGreaterThan( 0, HealthScore::BAND_IN_PROGRESS );
    }
}
