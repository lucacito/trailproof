import { useState, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// SVG ring gauge — animates stroke-dashoffset on mount.
// Accessible: role="img" with aria-label, band communicated by text + color + icon.
function Ring( { score, color } ) {
	const [ displayed, setDisplayed ] = useState( 0 );
	const raf = useRef( null );

	useEffect( () => {
		let start = null;
		const duration = 900;
		const animate = ( ts ) => {
			if ( ! start ) start = ts;
			const progress = Math.min( ( ts - start ) / duration, 1 );
			// ease-out cubic
			const eased = 1 - Math.pow( 1 - progress, 3 );
			setDisplayed( Math.round( eased * score ) );
			if ( progress < 1 ) {
				raf.current = requestAnimationFrame( animate );
			}
		};
		raf.current = requestAnimationFrame( animate );
		return () => raf.current && cancelAnimationFrame( raf.current );
	}, [ score ] );

	const offset = CIRCUMFERENCE - ( displayed / 100 ) * CIRCUMFERENCE;

	return (
		<svg
			width="140"
			height="140"
			viewBox="0 0 120 120"
			role="img"
			aria-label={ `${ __( 'Remediation score', 'trailproof' ) }: ${ score }` }
			style={ { display: 'block', margin: '0 auto' } }
		>
			{/* Track */}
			<circle cx="60" cy="60" r={ RADIUS } fill="none" stroke="#e0e0e0" strokeWidth="10" />
			{/* Progress */}
			<circle
				cx="60"
				cy="60"
				r={ RADIUS }
				fill="none"
				stroke={ color }
				strokeWidth="10"
				strokeLinecap="round"
				strokeDasharray={ CIRCUMFERENCE }
				strokeDashoffset={ offset }
				transform="rotate(-90 60 60)"
				style={ { transition: 'stroke-dashoffset 0.05s linear' } }
			/>
			{/* Score number */}
			<text
				x="60"
				y="56"
				textAnchor="middle"
				dominantBaseline="middle"
				fill={ color }
				fontSize="26"
				fontWeight="700"
				fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
				aria-hidden="true"
			>
				{ displayed }
			</text>
			{/* /100 label */}
			<text
				x="60"
				y="74"
				textAnchor="middle"
				dominantBaseline="middle"
				fill="#8c959f"
				fontSize="11"
				fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
				aria-hidden="true"
			>
				/ 100
			</text>
		</svg>
	);
}

function ComponentBar( { label, score, blend, color } ) {
	const [ width, setWidth ] = useState( 0 );

	useEffect( () => {
		const t = setTimeout( () => setWidth( score ), 80 );
		return () => clearTimeout( t );
	}, [ score ] );

	const pct = Math.round( blend * 100 );

	return (
		<div style={ { marginBottom: 10 } }>
			<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } }>
				<span style={ { color: '#50575e', fontWeight: 500 } }>
					{ label }
					<span style={ { color: '#8c959f', fontWeight: 400, marginLeft: 4 } }>({ pct }% weight)</span>
				</span>
				<span style={ { fontWeight: 600, color: score === 100 ? '#1a7f37' : color } }>
					{ score }%
					{ score === 100 && <span aria-label={ __( 'complete', 'trailproof' ) }> ✓</span> }
				</span>
			</div>
			<div
				style={ { background: '#e0e0e0', borderRadius: 99, height: 6, overflow: 'hidden' } }
				role="progressbar"
				aria-valuenow={ score }
				aria-valuemin="0"
				aria-valuemax="100"
				aria-label={ `${ label } ${ score }%` }
			>
				<div style={ {
					width:      `${ width }%`,
					height:     '100%',
					background: score === 100 ? '#1a7f37' : color,
					borderRadius: 99,
					transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
				} } />
			</div>
		</div>
	);
}

export default function HealthGauge( { healthScore } ) {
	if ( ! healthScore ) return null;

	const { score, band, delta, components } = healthScore;
	const { key: bandKey, label: bandLabel, color: bandColor } = band;

	const BAND_ICONS = {
		excellent:   '★',
		strong:      '↑',
		in_progress: '→',
		needs_work:  '!',
	};

	return (
		<div style={ {
			background:   '#fff',
			border:       '1px solid #e0e0e0',
			borderRadius: 8,
			padding:      '24px 28px',
			marginBottom: 24,
		} }>
			<div style={ { display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' } }>

				{/* Ring + band */}
				<div style={ { minWidth: 160, textAlign: 'center' } }>
					<Ring score={ score } color={ bandColor } />

					{/* Band label with icon (color is NOT the only indicator) */}
					<div style={ { marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 } }>
						<span
							style={ { fontWeight: 700, fontSize: 15, color: bandColor } }
							aria-label={ bandLabel }
						>
							{ BAND_ICONS[ bandKey ] } { bandLabel }
						</span>
					</div>

					{/* Delta */}
					{ delta !== null && delta !== undefined && (
						<div style={ { marginTop: 5, fontSize: 12, color: delta > 0 ? '#1a7f37' : delta < 0 ? '#cf222e' : '#646970' } }>
							{ delta > 0 ? '↑' : delta < 0 ? '↓' : '↔' }
							{ delta > 0 ? '+' : '' }{ delta } { __( 'since last scan', 'trailproof' ) }
						</div>
					) }

					<p style={ { fontSize: 11, color: '#8c959f', marginTop: 8, lineHeight: 1.4 } }>
						{ __( 'Remediation progress. Not a guarantee of legal or WCAG compliance.', 'trailproof' ) }
					</p>
				</div>

				{/* Component bars */}
				<div style={ { flex: 1, minWidth: 220 } }>
					<p style={ { fontSize: 13, fontWeight: 600, color: '#1d2327', marginTop: 0, marginBottom: 14 } }>
						{ __( 'Score breakdown', 'trailproof' ) }
					</p>
					<ComponentBar
						label={ __( 'Safe fixes applied', 'trailproof' ) }
						score={ components.a.score }
						blend={ components.a.blend }
						color={ bandColor }
					/>
					<ComponentBar
						label={ __( 'Decisions made', 'trailproof' ) }
						score={ components.b.score }
						blend={ components.b.blend }
						color={ bandColor }
					/>
					<ComponentBar
						label={ __( 'Manual checks signed off', 'trailproof' ) }
						score={ components.c.score }
						blend={ components.c.blend }
						color={ bandColor }
					/>

					{/* Explainer */}
					<details style={ { marginTop: 16 } }>
						<summary style={ {
							cursor:     'pointer',
							fontSize:   12,
							color:      '#2271b1',
							userSelect: 'none',
						} }>
							{ __( 'How is this calculated?', 'trailproof' ) }
						</summary>
						<div style={ { fontSize: 12, color: '#50575e', lineHeight: 1.6, marginTop: 8, paddingLeft: 4 } }>
							<p style={ { marginTop: 0 } }>
								{ __( 'The score blends three components. Safe fixes (50%) tracks how many auto-fixable issues are resolved, weighted by impact severity. Decisions (25%) tracks how many judgment-call issues have been reviewed. Manual checks (25%) tracks how many Bucket C checklist items have been signed off.', 'trailproof' ) }
							</p>
							<p style={ { marginBottom: 0 } }>
								{ __( 'Bands: Needs work (0–49) · In progress (50–74) · Strong (75–89) · Excellent (90–100). A score of 100 means all detected items have been addressed — not that the site is legally compliant.', 'trailproof' ) }
							</p>
						</div>
					</details>
				</div>
			</div>
		</div>
	);
}
