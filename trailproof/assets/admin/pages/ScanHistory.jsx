import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { getGrade } from '../components/HealthGauge';

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

// ─── Score timeline chart ─────────────────────────────────────────────────────

function ScoreTimeline( { scans } ) {
	if ( ! scans || scans.length < 2 ) return null;

	const scores = scans.map( s => s.score ?? 0 );
	const dates  = scans.map( s => s.created_at );
	const max    = 100;
	const w      = 600;
	const h      = 120;
	const pad    = 32;

	const pts = scores.map( ( s, i ) => {
		const x = pad + ( i / ( scores.length - 1 ) ) * ( w - pad * 2 );
		const y = h - pad - ( s / max ) * ( h - pad * 2 );
		return { x, y, s, date: dates[ i ] };
	} );

	const polyline = pts.map( p => `${ p.x },${ p.y }` ).join( ' ' );
	const area     = `M${ pts[0].x },${ pts[0].y } ${ pts.map( p => `L${ p.x },${ p.y }` ).join( ' ' ) } L${ pts[ pts.length - 1 ].x },${ h - pad } L${ pts[0].x },${ h - pad } Z`;

	return (
		<div style={ { overflow: 'hidden' } }>
			<svg
				viewBox={ `0 0 ${ w } ${ h }` }
				style={ { width: '100%', height: 'auto', display: 'block', maxHeight: 140 } }
				aria-label={ __( 'Accessibility score over time', 'trailproof' ) }
				role="img"
			>
				{/* Grid lines */}
				{ [ 25, 50, 75, 100 ].map( y => {
					const cy = h - pad - ( y / max ) * ( h - pad * 2 );
					return (
						<g key={ y }>
							<line x1={ pad } y1={ cy } x2={ w - pad } y2={ cy } stroke="#E2E8F0" strokeWidth="1" />
							<text x={ pad - 6 } y={ cy + 4 } fontSize="9" fill="#94A3B8" textAnchor="end">{ y }</text>
						</g>
					);
				} ) }

				{/* Area fill */}
				<path d={ area } fill="rgba(37,99,235,0.06)" />

				{/* Line */}
				<polyline
					points={ polyline }
					fill="none"
					stroke="#2563EB"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Data points + labels */}
				{ pts.map( ( p, i ) => {
					const date = p.date ? new Date( p.date ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } ) : '';
					return (
						<g key={ i }>
							<circle cx={ p.x } cy={ p.y } r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
							<text x={ p.x } y={ p.y - 10 } fontSize="9" fill="#2563EB" textAnchor="middle" fontWeight="700">
								{ p.s }
							</text>
							<text x={ p.x } y={ h - 6 } fontSize="8" fill="#94A3B8" textAnchor="middle">
								{ date }
							</text>
						</g>
					);
				} ) }
			</svg>
		</div>
	);
}

// ─── Scan row ─────────────────────────────────────────────────────────────────

function ScanRow( { scan, prev, index } ) {
	const grade    = scan.score != null ? getGrade( scan.score ) : null;
	const delta    = prev?.score != null && scan.score != null ? scan.score - prev.score : null;
	const dateStr  = scan.created_at
		? new Date( scan.created_at ).toLocaleString( undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' } )
		: '—';
	const provider = scan.provider ?? 'axe';

	return (
		<div style={ {
			display:     'grid',
			gridTemplateColumns: '40px 100px 80px 60px 80px 1fr',
			gap:          12,
			alignItems:  'center',
			padding:     '10px 0',
			borderBottom: '1px solid #F1F5F9',
			fontSize:    12,
		} }>
			<div style={ { color: '#94A3B8', textAlign: 'center' } }>{ index + 1 }</div>

			<div style={ { color: '#64748B' } }>{ dateStr.split( ',' )[0] }<br /><span style={ { fontSize: 10, color: '#94A3B8' } }>{ dateStr.split( ',' ).slice( 1 ).join( ',' ).trim() }</span></div>

			<div style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
				<div style={ {
					width:          28,
					height:         28,
					borderRadius:   '50%',
					background:     '#F8FAFC',
					border:         `2px solid ${ grade?.color ?? '#E2E8F0' }`,
					display:        'flex',
					alignItems:     'center',
					justifyContent: 'center',
					fontSize:       11,
					fontWeight:     800,
					color:          grade?.color ?? '#94A3B8',
					flexShrink:     0,
				} } aria-hidden="true">
					{ grade?.letter ?? '—' }
				</div>
				<div>
					<div style={ { fontWeight: 700, color: '#1A2742' } }>{ scan.score ?? '—' }</div>
					<div style={ { fontSize: 10, color: '#94A3B8' } }>/100</div>
				</div>
			</div>

			<div>
				{ delta !== null ? (
					<span style={ {
						fontSize:   11,
						fontWeight: 700,
						color:      delta > 0 ? '#15803D' : delta < 0 ? '#DC2626' : '#94A3B8',
						background: delta > 0 ? '#F0FDF4' : delta < 0 ? '#FEF2F2' : '#F8FAFC',
						borderRadius: 99,
						padding:    '2px 8px',
					} }>
						{ delta > 0 ? '+' : '' }{ delta }
					</span>
				) : (
					<span style={ { color: '#94A3B8', fontSize: 11 } }>—</span>
				) }
			</div>

			<div>
				<span style={ {
					fontSize:     10,
					fontWeight:   600,
					background:   '#F1F5F9',
					color:        '#475569',
					borderRadius: 4,
					padding:      '2px 6px',
					textTransform: 'uppercase',
					letterSpacing: '0.04em',
				} }>{ provider }</span>
			</div>

			<div style={ { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
				<a href={ scan.url } target="_blank" rel="noopener noreferrer" style={ { color: '#64748B', textDecoration: 'none' } }>
					{ scan.url }
				</a>
			</div>
		</div>
	);
}

// ─── Progress summary ─────────────────────────────────────────────────────────

function ProgressSummary( { scans } ) {
	if ( ! scans || scans.length < 2 ) return null;

	const first     = scans[ 0 ];
	const last      = scans[ scans.length - 1 ];
	const scoreDiff = ( last.score ?? 0 ) - ( first.score ?? 0 );
	const firstGrade = first.score != null ? getGrade( first.score ) : null;
	const lastGrade  = last.score  != null ? getGrade( last.score )  : null;
	const days = first.created_at && last.created_at
		? Math.round( ( new Date( last.created_at ) - new Date( first.created_at ) ) / 86400000 )
		: null;

	return (
		<div style={ { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 } }>
			{ [
				{ label: __( 'Scans completed', 'trailproof' ), value: scans.length, color: '#1A2742', bg: '#F8FAFC', border: '#E2E8F0' },
				{ label: __( 'Score change', 'trailproof' ), value: scoreDiff > 0 ? `+${ scoreDiff }` : scoreDiff, color: scoreDiff > 0 ? '#15803D' : scoreDiff < 0 ? '#DC2626' : '#1A2742', bg: scoreDiff > 0 ? '#F0FDF4' : '#F8FAFC', border: scoreDiff > 0 ? '#BBF7D0' : '#E2E8F0' },
				{ label: __( 'Grade progress', 'trailproof' ), value: `${ firstGrade?.letter ?? '—' } → ${ lastGrade?.letter ?? '—' }`, color: '#1A2742', bg: '#EFF6FF', border: '#BFDBFE' },
				{ label: __( 'Days tracked', 'trailproof' ), value: days ?? '—', color: '#1A2742', bg: '#F8FAFC', border: '#E2E8F0' },
			].map( ( stat, i ) => (
				<div key={ i } style={ { background: stat.bg, border: `1px solid ${ stat.border }`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' } }>
					<div style={ { fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1 } }>{ stat.value }</div>
					<div style={ { fontSize: 11, color: '#64748B', marginTop: 4 } }>{ stat.label }</div>
				</div>
			) ) }
		</div>
	);
}

// ─── Premium upsell ───────────────────────────────────────────────────────────

function PremiumUpsell() {
	const features = [
		{ icon: '📊', label: __( 'Impact comparison',    'trailproof' ), desc: __( 'Before/after audit with external tools', 'trailproof' ) },
		{ icon: '📄', label: __( 'Client reports',       'trailproof' ), desc: __( 'Branded improvement reports for clients', 'trailproof' ) },
		{ icon: '🔔', label: __( 'Scheduled monitoring', 'trailproof' ), desc: __( 'Weekly scans with regression alerts',     'trailproof' ) },
		{ icon: '🎨', label: __( 'Advanced contrast',    'trailproof' ), desc: __( 'Contrast tools with auto-suggestions',    'trailproof' ) },
		{ icon: '🏷️', label: __( 'White-label reports',  'trailproof' ), desc: __( 'Reports under your own branding',         'trailproof' ) },
	];

	return (
		<div style={ { ...card, padding: '20px 24px', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderColor: '#BFDBFE' } }>
			<div style={ { fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 } }>
				Trailproof Premium
			</div>
			<div style={ { fontSize: 14, fontWeight: 700, color: '#1A2742', marginBottom: 4 } }>
				{ __( 'For agencies and professional websites', 'trailproof' ) }
			</div>
			<p style={ { fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 } }>
				{ __( 'Unlock the full accessibility improvement workflow.', 'trailproof' ) }
			</p>
			<div style={ { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } }>
				{ features.map( ( f, i ) => (
					<div key={ i } style={ { display: 'flex', alignItems: 'flex-start', gap: 10 } }>
						<span style={ { fontSize: 15, flexShrink: 0, marginTop: 1 } } aria-hidden="true">{ f.icon }</span>
						<div>
							<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742' } }>{ f.label }</div>
							<div style={ { fontSize: 11, color: '#94A3B8' } }>{ f.desc }</div>
						</div>
					</div>
				) ) }
			</div>
			<button
				className="button button-primary"
				style={ { fontSize: 12, width: '100%' } }
				onClick={ () => window.open( window.trailproofData?.upgradeUrl ?? '#', '_blank' ) }
			>
				{ __( 'Upgrade to Premium', 'trailproof' ) }
			</button>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScanHistory() {
	const [ scans,       setScans ]       = useState( [] );
	const [ loading,     setLoading ]     = useState( true );
	const [ confirming,  setConfirming ]  = useState( false );
	const [ clearing,    setClearing ]    = useState( false );

	useEffect( () => {
		apiFetch( { path: '/trailproof/v1/scans?per_page=50' } )
			.then( s => setScans( [ ...( s ?? [] ) ].sort( ( a, b ) => new Date( a.created_at ) - new Date( b.created_at ) ) ) )
			.catch( () => {} )
			.finally( () => setLoading( false ) );
	}, [] );

	async function clearHistory() {
		setClearing( true );
		try {
			await apiFetch( { path: '/trailproof/v1/scans', method: 'DELETE' } );
			setScans( [] );
		} catch {
			// silently ignore — WP REST returns 200 on success
		} finally {
			setClearing( false );
			setConfirming( false );
		}
	}

	if ( loading ) return (
		<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
			{ __( 'Loading scan history…', 'trailproof' ) }
		</div>
	);

	return (
		<div>
			{/* Heading */}
			<div style={ { marginBottom: 24 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
					{ __( 'Tracking', 'trailproof' ) }
				</div>
				<div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 } }>
					<div>
						<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
							{ __( 'Accessibility Progress', 'trailproof' ) }
						</h2>
						<p style={ { fontSize: 13, color: '#64748B', margin: '6px 0 0', lineHeight: 1.6 } }>
							{ __( 'Score and issue trends across all scans. Use this to track improvement over time and demonstrate measurable progress.', 'trailproof' ) }
						</p>
					</div>

					{ scans.length > 0 && ! confirming && (
						<button
							className="button"
							style={ { flexShrink: 0, marginTop: 4, color: '#b32d2e', borderColor: '#b32d2e' } }
							onClick={ () => setConfirming( true ) }
						>
							{ __( 'Clear history', 'trailproof' ) }
						</button>
					) }

					{ confirming && (
						<div style={ { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } }>
							<span style={ { fontSize: 12, color: '#b32d2e', fontWeight: 600 } }>
								{ __( 'Delete all scan records? Issues and remediation data are kept.', 'trailproof' ) }
							</span>
							<div style={ { display: 'flex', gap: 6 } }>
								<button
									className="button button-primary"
									style={ { background: '#b32d2e', borderColor: '#b32d2e' } }
									disabled={ clearing }
									onClick={ clearHistory }
								>
									{ clearing ? __( 'Clearing…', 'trailproof' ) : __( 'Yes, clear', 'trailproof' ) }
								</button>
								<button
									className="button"
									disabled={ clearing }
									onClick={ () => setConfirming( false ) }
								>
									{ __( 'Cancel', 'trailproof' ) }
								</button>
							</div>
						</div>
					) }
				</div>
			</div>

			{ scans.length === 0 ? (
				<div style={ { ...card, padding: '48px', textAlign: 'center', color: '#94A3B8' } }>
					<div style={ { fontSize: 32, marginBottom: 12 } } aria-hidden="true">📈</div>
					<div style={ { fontSize: 15, fontWeight: 600, color: '#1A2742', marginBottom: 4 } }>
						{ __( 'No scan history yet', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 13 } }>
						{ __( 'Run your first scan to start tracking accessibility progress.', 'trailproof' ) }
					</div>
				</div>
			) : (
				<div style={ { display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' } }>
					<div>
						{/* Progress stats */}
						<ProgressSummary scans={ scans } />

						{/* Score chart */}
						{ scans.length >= 2 && (
							<div style={ { ...card, padding: '20px 24px', marginBottom: 20 } }>
								<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 } }>
									{ __( 'Score over time', 'trailproof' ) }
								</div>
								<ScoreTimeline scans={ scans } />
							</div>
						) }

						{/* Scan table */}
						<div style={ { ...card, overflow: 'hidden' } }>
							<div style={ { padding: '16px 20px', borderBottom: '1px solid #F1F5F9' } }>
								<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em' } }>
									{ __( 'Scan log', 'trailproof' ) }
								</div>
							</div>
							<div style={ { padding: '0 20px' } }>
								{/* Header */}
								<div style={ {
									display:     'grid',
									gridTemplateColumns: '40px 100px 80px 60px 80px 1fr',
									gap:          12,
									padding:     '8px 0',
									borderBottom: '2px solid #E8ECF2',
									fontSize:    10,
									fontWeight:  700,
									color:       '#64748B',
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
								} }>
									<div>#</div>
									<div>{ __( 'Date', 'trailproof' ) }</div>
									<div>{ __( 'Score', 'trailproof' ) }</div>
									<div>{ __( 'Change', 'trailproof' ) }</div>
									<div>{ __( 'Source', 'trailproof' ) }</div>
									<div>{ __( 'URL', 'trailproof' ) }</div>
								</div>
								{ [ ...scans ].reverse().map( ( scan, i, arr ) => (
									<ScanRow
										key={ scan.id ?? i }
										scan={ scan }
										prev={ arr[ i + 1 ] }
										index={ arr.length - 1 - i }
									/>
								) ) }
							</div>
						</div>
					</div>

					{/* Sidebar: premium */}
					<PremiumUpsell />
				</div>
			) }
		</div>
	);
}
