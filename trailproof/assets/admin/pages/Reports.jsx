import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { getGrade } from '../components/HealthGauge';

// ─── Design tokens ────────────────────────────────────────────────────────────

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08)',
	border:       '1px solid #E8ECF2',
};

// ─── Scan history sparkline ───────────────────────────────────────────────────

function ScoreSparkline( { scans } ) {
	if ( ! scans || scans.length < 2 ) return null;

	const scores = scans.map( s => s.score ?? 0 );
	const max    = Math.max( ...scores, 1 );
	const w      = 200;
	const h      = 40;
	const pts    = scores.map( ( s, i ) => {
		const x = ( i / ( scores.length - 1 ) ) * w;
		const y = h - ( s / max ) * h;
		return `${ x },${ y }`;
	} );

	return (
		<svg width={ w } height={ h } viewBox={ `0 0 ${ w } ${ h }` } aria-hidden="true" style={ { display: 'block' } }>
			<polyline
				points={ pts.join( ' ' ) }
				fill="none"
				stroke="#2563EB"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{ scores.map( ( s, i ) => {
				const x = ( i / ( scores.length - 1 ) ) * w;
				const y = h - ( s / max ) * h;
				return <circle key={ i } cx={ x } cy={ y } r="3" fill="#2563EB" />;
			} ) }
		</svg>
	);
}

// ─── Scan history card ────────────────────────────────────────────────────────

function ScanHistoryCard( { scans } ) {
	if ( ! scans || scans.length === 0 ) {
		return (
			<div style={ { ...card, padding: '20px 24px' } }>
				<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }>
					{ __( 'Scan history', 'trailproof' ) }
				</div>
				<p style={ { color: '#94A3B8', fontSize: 13, margin: 0 } }>
					{ __( 'No scans yet. Run your first scan to start tracking progress.', 'trailproof' ) }
				</p>
			</div>
		);
	}

	const first = scans[ 0 ];
	const last  = scans[ scans.length - 1 ];
	const delta = ( last.score ?? 0 ) - ( first.score ?? 0 );

	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 } }>
				<div>
					<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }>
						{ __( 'Accessibility history', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 12, color: '#64748B' } }>
						{ scans.length } { __( 'scans recorded', 'trailproof' ) }
					</div>
				</div>
				{ delta !== 0 && (
					<div style={ {
						display:      'inline-flex',
						alignItems:   'center',
						gap:          4,
						background:   delta > 0 ? '#F0FDF4' : '#FEF2F2',
						color:        delta > 0 ? '#16A34A' : '#DC2626',
						borderRadius: 99,
						padding:      '3px 10px',
						fontSize:     12,
						fontWeight:   700,
					} }>
						{ delta > 0 ? '↑' : '↓' }
						{ delta > 0 ? '+' : '' }{ delta } { __( 'overall', 'trailproof' ) }
					</div>
				) }
			</div>

			<ScoreSparkline scans={ scans } />

			<div style={ { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 } }>
				{ [ ...scans ].reverse().map( ( scan, i ) => {
					const grade    = scan.score != null ? getGrade( scan.score ) : null;
					const dateStr  = scan.created_at
						? new Date( scan.created_at ).toLocaleDateString( undefined, { month: 'short', day: 'numeric', year: 'numeric' } )
						: '—';
					const prevScore = i < scans.length - 1 ? scans[ scans.length - 1 - i - 1 ]?.score : null;
					const scanDelta = prevScore != null ? ( scan.score ?? 0 ) - prevScore : null;

					return (
						<div key={ scan.id ?? i } style={ { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F1F5F9' } }>
							<div style={ { fontSize: 12, color: '#64748B', minWidth: 90 } }>{ dateStr }</div>
							<div style={ {
								width:          28,
								height:         28,
								borderRadius:   '50%',
								background:     '#F8FAFC',
								border:         '1px solid #E2E8F0',
								display:        'flex',
								alignItems:     'center',
								justifyContent: 'center',
								fontSize:       11,
								fontWeight:     800,
								color:          '#1A2742',
									flexShrink:     0,
							} }>
								{ grade?.letter ?? '—' }
							</div>
							<div style={ { fontSize: 13, fontWeight: 600, color: '#1A2742', minWidth: 40 } }>
								{ scan.score ?? '—' }
								<span style={ { fontSize: 11, fontWeight: 400, color: '#94A3B8' } }>/100</span>
							</div>
							{ scanDelta !== null && (
								<div style={ { fontSize: 11, color: scanDelta > 0 ? '#16A34A' : scanDelta < 0 ? '#DC2626' : '#94A3B8', fontWeight: 600 } }>
									{ scanDelta > 0 ? '+' : '' }{ scanDelta }
								</div>
							) }
							{ scan.issues_open != null && (
								<div style={ { fontSize: 11, color: '#94A3B8', marginLeft: 'auto' } }>
									{ scan.issues_open } { __( 'open', 'trailproof' ) }
								</div>
							) }
						</div>
					);
				} ) }
			</div>
		</div>
	);
}

// ─── Before / After improvement card ─────────────────────────────────────────

function ImprovementCard( { scans } ) {
	if ( ! scans || scans.length < 2 ) return null;

	const first = scans[ 0 ];
	const last  = scans[ scans.length - 1 ];
	const scoreDelta  = ( last.score ?? 0 ) - ( first.score ?? 0 );
	const firstGrade  = first.score != null ? getGrade( first.score ) : null;
	const lastGrade   = last.score  != null ? getGrade( last.score )  : null;
	const firstDate   = first.created_at ? new Date( first.created_at ).toLocaleDateString( undefined, { month: 'long', day: 'numeric', year: 'numeric' } ) : '—';
	const lastDate    = last.created_at  ? new Date( last.created_at  ).toLocaleDateString( undefined, { month: 'long', day: 'numeric', year: 'numeric' } ) : '—';
	const issuesDelta = ( first.issues_open ?? 0 ) - ( last.issues_open ?? 0 );

	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 } }>
				{ __( 'Accessibility improvement summary', 'trailproof' ) }
			</div>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' } }>
				{/* Before */}
				<div style={ { background: '#F8FAFC', borderRadius: 8, padding: '16px', textAlign: 'center' } }>
					<div style={ { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
						{ __( 'Before', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 10, color: '#94A3B8', marginBottom: 6 } }>{ firstDate }</div>
					<div style={ { fontSize: 36, fontWeight: 800, color: '#475569', lineHeight: 1 } }>
						{ firstGrade?.letter ?? '—' }
					</div>
					<div style={ { fontSize: 20, fontWeight: 700, color: '#64748B', marginTop: 4 } }>
						{ first.score ?? '—' }<span style={ { fontSize: 12, fontWeight: 400 } }>/100</span>
					</div>
					{ first.issues_open != null && (
						<div style={ { fontSize: 12, color: '#94A3B8', marginTop: 6 } }>
							{ first.issues_open } { __( 'issues open', 'trailproof' ) }
						</div>
					) }
				</div>

				{/* Arrow */}
				<div style={ { textAlign: 'center', fontSize: 20, color: '#CBD5E1' } } aria-hidden="true">→</div>

				{/* After */}
				<div style={ { background: '#F0FDF4', borderRadius: 8, padding: '16px', textAlign: 'center', border: '1px solid #DCFCE7' } }>
					<div style={ { fontSize: 10, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
						{ __( 'Now', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 10, color: '#94A3B8', marginBottom: 6 } }>{ lastDate }</div>
					<div style={ { fontSize: 36, fontWeight: 800, color: '#16A34A', lineHeight: 1 } }>
						{ lastGrade?.letter ?? '—' }
					</div>
					<div style={ { fontSize: 20, fontWeight: 700, color: '#16A34A', marginTop: 4 } }>
						{ last.score ?? '—' }<span style={ { fontSize: 12, fontWeight: 400 } }>/100</span>
					</div>
					{ last.issues_open != null && (
						<div style={ { fontSize: 12, color: '#16A34A', marginTop: 6 } }>
							{ last.issues_open } { __( 'issues open', 'trailproof' ) }
						</div>
					) }
				</div>
			</div>

			{/* Summary stats */}
			{ scoreDelta !== 0 && (
				<div style={ { marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' } }>
					{ scoreDelta > 0 && (
						<div style={ { textAlign: 'center', padding: '10px 20px', background: '#F0FDF4', borderRadius: 8 } }>
							<div style={ { fontSize: 20, fontWeight: 800, color: '#16A34A' } }>+{ scoreDelta }</div>
							<div style={ { fontSize: 11, color: '#475569' } }>{ __( 'score improvement', 'trailproof' ) }</div>
						</div>
					) }
					{ issuesDelta > 0 && (
						<div style={ { textAlign: 'center', padding: '10px 20px', background: '#F0FDF4', borderRadius: 8 } }>
							<div style={ { fontSize: 20, fontWeight: 800, color: '#16A34A' } }>{ issuesDelta }</div>
							<div style={ { fontSize: 11, color: '#475569' } }>{ __( 'issues resolved', 'trailproof' ) }</div>
						</div>
					) }
				</div>
			) }

			<p style={ { fontSize: 11, color: '#94A3B8', marginTop: 14, marginBottom: 0, lineHeight: 1.5 } }>
				{ __( 'This summary reflects documented remediation progress — not a certification of full WCAG conformance.', 'trailproof' ) }
			</p>
		</div>
	);
}

// ─── Evidence bundles table ───────────────────────────────────────────────────

function BundleTable( { reports, generating, onGenerate } ) {
	function downloadUrl( reportId ) {
		const base  = window.trailproofData?.restUrl ?? '/wp-json/trailproof/v1/';
		const nonce = window.trailproofData?.nonce ?? '';
		return `${ base }reports/${ reportId }/download?_wpnonce=${ nonce }`;
	}

	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<div>
					<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }>
						{ __( 'Evidence bundles', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 12, color: '#64748B', maxWidth: 480 } }>
						{ __( 'A dated ZIP containing: accessibility statement, issues CSV, decisions log CSV, and scan history. Generate at each compliance milestone.', 'trailproof' ) }
					</div>
				</div>
				<Button
					variant="primary"
					onClick={ onGenerate }
					disabled={ generating }
					style={ { flexShrink: 0 } }
				>
					{ generating ? __( 'Generating…', 'trailproof' ) : __( 'Generate bundle', 'trailproof' ) }
				</Button>
			</div>

			{ reports.length === 0 ? (
				<p style={ { color: '#94A3B8', fontSize: 13, margin: 0, fontStyle: 'italic' } }>
					{ __( 'No bundles yet. Generate your first one above.', 'trailproof' ) }
				</p>
			) : (
				<table style={ { width: '100%', borderCollapse: 'collapse', fontSize: 12 } }>
					<thead>
						<tr style={ { borderBottom: '2px solid #E8ECF2' } }>
							{ [ __( 'Generated', 'trailproof' ), __( 'Filename', 'trailproof' ), '' ].map( h => (
								<th key={ h } style={ { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' } }>{ h }</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ reports.map( ( report ) => (
							<tr key={ report.id } style={ { borderBottom: '1px solid #F1F5F9' } }>
								<td style={ { padding: '10px 12px', color: '#64748B', fontSize: 12 } }>
									{ new Date( report.generated_at ).toLocaleDateString( undefined, { month: 'short', day: 'numeric', year: 'numeric' } ) }
								</td>
								<td style={ { padding: '10px 12px' } }>
									<code style={ { fontSize: 11, color: '#475569' } }>{ report.filename }</code>
								</td>
								<td style={ { padding: '10px 12px', textAlign: 'right' } }>
									<a
										href={ downloadUrl( report.id ) }
										className="button button-small"
										download
									>
										{ __( 'Download', 'trailproof' ) }
									</a>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			<div style={ { marginTop: 16, padding: '10px 14px', background: '#F0F6FC', borderRadius: 6, fontSize: 11, color: '#1C4587', lineHeight: 1.5 } }>
				{ __( 'This bundle is a record of systematic documented remediation — not a certification of full conformance.', 'trailproof' ) }
			</div>
		</div>
	);
}

// ─── Main Reports page ────────────────────────────────────────────────────────

export default function Reports() {
	const [ reports, setReports ]   = useState( [] );
	const [ scans, setScans ]       = useState( [] );
	const [ loading, setLoading ]   = useState( true );
	const [ generating, setGen ]    = useState( false );
	const [ error, setError ]       = useState( null );
	const [ success, setSuccess ]   = useState( null );

	const fetchData = useCallback( () => {
		setLoading( true );
		Promise.all( [
			apiFetch( { path: '/trailproof/v1/reports' } ).catch( () => [] ),
			apiFetch( { path: '/trailproof/v1/scans?per_page=20' } ).catch( () => [] ),
		] ).then( ( [ r, s ] ) => {
			setReports( r );
			// Scans ordered oldest-first for history display
			setScans( [ ...( s ?? [] ) ].sort( ( a, b ) => new Date( a.created_at ) - new Date( b.created_at ) ) );
		} ).finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchData(); }, [ fetchData ] );

	async function generateBundle() {
		setGen( true );
		setError( null );
		setSuccess( null );
		try {
			const result = await apiFetch( {
				path:   '/trailproof/v1/reports',
				method: 'POST',
			} );
			setSuccess( __( 'Evidence bundle generated: ', 'trailproof' ) + result.filename );
			fetchData();
		} catch ( err ) {
			setError( err?.message || __( 'Failed to generate report.', 'trailproof' ) );
		} finally {
			setGen( false );
		}
	}

	return (
		<div>
			{ error   && <Notice status="error"   isDismissible onRemove={ () => setError( null ) }   style={ { marginBottom: 16 } }>{ error }</Notice> }
			{ success && <Notice status="success" isDismissible onRemove={ () => setSuccess( null ) } style={ { marginBottom: 16 } }>{ success }</Notice> }

			{ loading ? (
				<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
					{ __( 'Loading…', 'trailproof' ) }
				</div>
			) : (
				<div style={ { display: 'flex', flexDirection: 'column', gap: 24 } }>

					{/* Before / after improvement summary */}
					<ImprovementCard scans={ scans } />

					{/* Scan history timeline */}
					<ScanHistoryCard scans={ scans } />

					{/* Evidence bundle generation + history */}
					<BundleTable
						reports={ reports }
						generating={ generating }
						onGenerate={ generateBundle }
					/>
				</div>
			) }
		</div>
	);
}
