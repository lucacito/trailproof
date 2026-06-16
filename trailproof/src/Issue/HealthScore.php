<?php

declare(strict_types=1);

namespace Trailproof\Issue;

use Trailproof\Repository\DecisionLogRepository;
use Trailproof\Repository\IssueRepository;

/**
 * Remediation progress score (0–100).
 *
 * This is an internal progress metric, not a legal or WCAG compliance score.
 * A score of 100 means all detected items have been addressed or verified —
 * not that the site is legally compliant.
 *
 * All weights and thresholds are tunable constants in this class.
 */
class HealthScore {

    // -----------------------------------------------------------------
    // Component A — impact weights (Bucket A open issues)
    // -----------------------------------------------------------------
    const WEIGHT_CRITICAL = 10;
    const WEIGHT_SERIOUS  = 6;
    const WEIGHT_MODERATE = 3;
    const WEIGHT_MINOR    = 1;

    // -----------------------------------------------------------------
    // Overall blend
    // -----------------------------------------------------------------
    const BLEND_A = 0.50;  // Automated remediation — largest measurable surface
    const BLEND_B = 0.25;  // Decision completeness
    const BLEND_C = 0.25;  // Manual verification

    // -----------------------------------------------------------------
    // Band thresholds (score >= threshold)
    // -----------------------------------------------------------------
    const BAND_EXCELLENT   = 90;
    const BAND_STRONG      = 75;
    const BAND_IN_PROGRESS = 50;
    // < 50 → needs_work

    const TRANSIENT_KEY = 'trailproof_health_score';
    const TRANSIENT_TTL = 60; // seconds

    private const BANDS = [
        [ 'min' => 90, 'key' => 'excellent',   'label' => 'Excellent',   'color' => '#1a7f37' ],
        [ 'min' => 75, 'key' => 'strong',       'label' => 'Strong',      'color' => '#2271b1' ],
        [ 'min' => 50, 'key' => 'in_progress',  'label' => 'In progress', 'color' => '#dba617' ],
        [ 'min' => 0,  'key' => 'needs_work',   'label' => 'Needs work',  'color' => '#cf222e' ],
    ];

    public static function compute(
        IssueRepository $issue_repo,
        DecisionLogRepository $log_repo
    ): array {
        $cached = get_transient( self::TRANSIENT_KEY );
        $prev   = is_array( $cached ) ? ( $cached['score'] ?? null ) : null;

        $a_inputs = $issue_repo->get_score_inputs_a();
        $b_inputs = $issue_repo->get_score_inputs_b();
        $c_inputs = self::compute_c_inputs( $log_repo );

        $score_a = self::component_a( $a_inputs );
        $score_b = self::component_b( $b_inputs );
        $score_c = self::component_c( $c_inputs );

        $score = (int) round(
            $score_a * self::BLEND_A +
            $score_b * self::BLEND_B +
            $score_c * self::BLEND_C
        );

        $result = [
            'score'      => $score,
            'band'       => self::band_for( $score ),
            'prev_score' => $prev,
            'delta'      => $prev !== null ? $score - $prev : null,
            'components' => [
                'a' => array_merge( $a_inputs, [ 'score' => $score_a, 'label' => 'Automated', 'blend' => self::BLEND_A ] ),
                'b' => array_merge( $b_inputs, [ 'score' => $score_b, 'label' => 'Decisions',  'blend' => self::BLEND_B ] ),
                'c' => array_merge( $c_inputs, [ 'score' => $score_c, 'label' => 'Manual',     'blend' => self::BLEND_C ] ),
            ],
        ];

        set_transient( self::TRANSIENT_KEY, $result, self::TRANSIENT_TTL );

        return $result;
    }

    /** Invalidate the cached score — call after any corrective action. */
    public static function invalidate(): void {
        delete_transient( self::TRANSIENT_KEY );
    }

    public static function band_for( int $score ): array {
        foreach ( self::BANDS as $band ) {
            if ( $score >= $band['min'] ) {
                return [
                    'key'   => $band['key'],
                    'label' => $band['label'],
                    'color' => $band['color'],
                ];
            }
        }
        return [ 'key' => 'needs_work', 'label' => 'Needs work', 'color' => '#cf222e' ];
    }

    // -----------------------------------------------------------------
    // Component calculations
    // -----------------------------------------------------------------

    private static function component_a( array $inputs ): int {
        if ( $inputs['weighted_total'] === 0 ) {
            return 100;
        }
        return (int) round( ( 1 - $inputs['weighted_open'] / $inputs['weighted_total'] ) * 100 );
    }

    private static function component_b( array $inputs ): int {
        if ( $inputs['total'] === 0 ) {
            return 100;
        }
        return (int) round( $inputs['decided'] / $inputs['total'] * 100 );
    }

    private static function component_c( array $inputs ): int {
        if ( $inputs['total'] === 0 ) {
            return 100;
        }
        return (int) round( $inputs['signed_off'] / $inputs['total'] * 100 );
    }

    private static function compute_c_inputs( DecisionLogRepository $log_repo ): array {
        $all_items  = ChecklistItems::all();
        $total      = count( $all_items );
        $latest     = $log_repo->get_latest_per_fingerprint( 'checklist_' );
        $signed_off = 0;

        foreach ( array_keys( $all_items ) as $key ) {
            $fp    = 'checklist:' . $key;
            $entry = $latest[ $fp ] ?? null;
            if ( ! $entry ) {
                continue;
            }
            $suffix = substr( $entry['action'] ?? '', strlen( 'checklist_' ) );
            if ( in_array( $suffix, [ 'pass', 'fail', 'na' ], true ) ) {
                $signed_off++;
            }
        }

        return [
            'total'      => $total,
            'signed_off' => $signed_off,
        ];
    }
}
