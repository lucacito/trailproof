import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { contrastRatio, nearestCompliantShade, passesAA, formatRatio } from '../utils/contrast';

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

// ─── Color swatch ─────────────────────────────────────────────────────────────

function Swatch( { fg, bg, label, ratio, passes } ) {
	const safeRatio = typeof ratio === 'number' && isFinite( ratio ) ? ratio : null;

	return (
		<div style={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
			{ label && (
				<div style={ { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' } }>
					{ label }
				</div>
			) }
			<div style={ {
				background:   bg || '#ffffff',
				border:       '1px solid #E2E8F0',
				borderRadius: 6,
				padding:      '10px 14px',
				fontSize:     14,
				fontWeight:   700,
				color:        fg || '#000000',
				lineHeight:   1.4,
			} }>
				{ __( 'Aa', 'trailproof' ) }
				<div style={ { fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 2 } }>Sample text</div>
			</div>
			{ fg && (
				<div style={ { fontSize: 10, color: '#64748B', display: 'flex', gap: 6 } }>
					<code style={ { background: '#F1F5F9', padding: '1px 4px', borderRadius: 3 } }>{ fg }</code>
					{ __( 'on', 'trailproof' ) }
					<code style={ { background: '#F1F5F9', padding: '1px 4px', borderRadius: 3 } }>{ bg || '#fff' }</code>
				</div>
			) }
			{ safeRatio !== null && (
				<div style={ {
					display:    'inline-flex',
					alignItems: 'center',
					gap:        5,
					fontSize:   11,
					fontWeight: 700,
					color:      passes ? '#15803D' : '#B91C1C',
				} }>
					{ passes ? '✓' : '✗' } { formatRatio( safeRatio ) }
				</div>
			) }
		</div>
	);
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function ContrastIssueCard( { issue } ) {
	const [ expanded, setExpanded ] = useState( false );
	const fg = issue.fg_color;
	const bg = issue.bg_color || '#ffffff';

	const ratio     = fg ? contrastRatio( fg, bg ) : ( issue.ratio ?? null );
	const suggested = fg ? nearestCompliantShade( fg, bg ) : null;
	const sugRatio  = suggested ? contrastRatio( suggested, bg ) : null;
	const passes    = ratio !== null && passesAA( ratio );
	const isFixed   = issue.status === 'fixed' || issue.status === 'na';

	return (
		<div style={ {
			...card,
			opacity:    isFixed ? 0.6 : 1,
			borderLeft: `4px solid ${ isFixed ? '#22C55E' : passes ? '#EAB308' : '#EF4444' }`,
		} }>
			<div style={ { padding: '16px 20px' } }>
				{/* Header */}
				<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 } }>
					<div style={ { flex: 1 } }>
						<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } }>
							<span style={ {
								fontSize:     10,
								fontWeight:   700,
								background:   isFixed ? '#F0FDF4' : passes ? '#FFFBEB' : '#FEF2F2',
								color:        isFixed ? '#15803D' : passes ? '#A16207' : '#B91C1C',
								borderRadius: 99,
								padding:      '2px 8px',
								textTransform: 'uppercase',
								letterSpacing: '0.06em',
							} }>
								{ isFixed ? __( 'Resolved', 'trailproof' ) : passes ? __( 'Low contrast', 'trailproof' ) : __( 'Fails AA', 'trailproof' ) }
							</span>
							{ ratio !== null && (
								<span style={ { fontSize: 11, color: '#64748B' } }>
									{ formatRatio( ratio ) } { __( '(required: 4.5:1)', 'trailproof' ) }
								</span>
							) }
						</div>
						<div style={ { fontSize: 13, fontWeight: 500, color: '#1A2742', lineHeight: 1.4 } }>
							{ issue.description || __( 'Color contrast issue', 'trailproof' ) }
						</div>
						<div style={ { fontSize: 11, color: '#94A3B8', marginTop: 3, fontFamily: 'monospace' } }>
							{ issue.selector?.slice( 0, 80 ) }{ ( issue.selector?.length ?? 0 ) > 80 ? '…' : '' }
						</div>
					</div>
				</div>

				{/* Color preview */}
				{ fg && (
					<div style={ { display: 'grid', gridTemplateColumns: suggested && ! isFixed ? '1fr auto 1fr' : '1fr', gap: 12, alignItems: 'start' } }>
						<Swatch
							fg={ fg }
							bg={ bg }
							label={ __( 'Current', 'trailproof' ) }
							ratio={ ratio }
							passes={ passes }
						/>
						{ suggested && ! isFixed && (
							<>
								<div style={ { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 24 } }>
									<span style={ { color: '#94A3B8', fontSize: 16 } } aria-hidden="true">→</span>
								</div>
								<Swatch
									fg={ suggested }
									bg={ bg }
									label={ __( 'Suggested fix', 'trailproof' ) }
									ratio={ sugRatio }
									passes={ sugRatio !== null ? passesAA( sugRatio ) : false }
								/>
							</>
						) }
					</div>
				) }

				{/* Impact */}
				{ ! isFixed && (
					<div style={ { marginTop: 12, fontSize: 12, color: '#475569', background: '#F8FAFC', borderRadius: 6, padding: '8px 12px', lineHeight: 1.5 } }>
						{ __( 'Users with low vision may struggle reading this content.', 'trailproof' ) }
					</div>
				) }

				{/* Expand/collapse for details */}
				{ ( issue.html_snippet || issue.url ) && (
					<>
						<button
							className="button-link"
							onClick={ () => setExpanded( e => ! e ) }
							style={ { fontSize: 12, color: '#2563EB', marginTop: 10, display: 'block' } }
						>
							{ expanded ? __( 'Hide details ↑', 'trailproof' ) : __( 'Show details ↓', 'trailproof' ) }
						</button>
						{ expanded && (
							<div style={ { marginTop: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, fontSize: 12, color: '#475569' } }>
								{ issue.url && (
									<div style={ { marginBottom: 6 } }>
										<strong>{ __( 'Page:', 'trailproof' ) }</strong>{ ' ' }
										<a href={ issue.url } target="_blank" rel="noopener noreferrer" style={ { color: '#2563EB' } }>
											{ issue.url }
										</a>
									</div>
								) }
								{ issue.html_snippet && (
									<div>
										<strong>{ __( 'Element:', 'trailproof' ) }</strong>
										<pre style={ { margin: '4px 0 0', padding: '6px 8px', background: '#1A2742', color: '#e2e8f0', borderRadius: 4, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }>
											{ issue.html_snippet.slice( 0, 400 ) }
										</pre>
									</div>
								) }
								{ suggested && (
									<div style={ { marginTop: 10, padding: '8px 10px', background: '#EFF6FF', borderRadius: 4, color: '#1E40AF' } }>
										<strong>{ __( 'Recommendation:', 'trailproof' ) }</strong>{ ' ' }
										{ __( 'Change text color from', 'trailproof' ) }{ ' ' }
										<code>{ fg }</code>{ ' ' }
										{ __( 'to', 'trailproof' ) }{ ' ' }
										<code>{ suggested }</code>
										{ ' — ' }
										{ __( 'apply this in your theme CSS or Divi Design Settings.', 'trailproof' ) }
									</div>
								) }
							</div>
						) }
					</>
				) }
			</div>
		</div>
	);
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar( { total, passed } ) {
	const needsAttention = total;
	const totalElements  = passed + needsAttention;
	const passPct        = totalElements > 0 ? Math.round( ( passed / totalElements ) * 100 ) : 0;

	return (
		<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 } }>
			{ [
				{ label: __( 'Passed', 'trailproof' ), value: passed, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
				{ label: __( 'Needs attention', 'trailproof' ), value: needsAttention, color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
				{ label: __( 'Pass rate', 'trailproof' ), value: `${ passPct }%`, color: '#1A2742', bg: '#F8FAFC', border: '#E2E8F0' },
			].map( ( stat, i ) => (
				<div key={ i } style={ {
					background:   stat.bg,
					border:       `1px solid ${ stat.border }`,
					borderRadius: 8,
					padding:      '16px 20px',
					textAlign:    'center',
				} }>
					<div style={ { fontSize: 32, fontWeight: 800, color: stat.color, lineHeight: 1 } }>
						{ stat.value }
					</div>
					<div style={ { fontSize: 12, color: '#64748B', marginTop: 4 } }>{ stat.label }</div>
				</div>
			) ) }
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContrastAnalyzer() {
	const [ data,    setData ]    = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ filter,  setFilter ]  = useState( 'open' );

	const fetchData = useCallback( () => {
		apiFetch( { path: '/trailproof/v1/contrast' } )
			.then( setData )
			.catch( () => {} )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchData(); }, [ fetchData ] );

	if ( loading ) return (
		<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
			{ __( 'Loading contrast data…', 'trailproof' ) }
		</div>
	);

	const items = data?.items ?? [];
	const filtered = filter === 'all'
		? items
		: items.filter( i => i.status !== 'fixed' && i.status !== 'na' );

	return (
		<div style={ { maxWidth: 780 } }>

			{/* Heading */}
			<div style={ { marginBottom: 24 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
					{ __( 'Analysis', 'trailproof' ) }
				</div>
				<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Color Contrast Review', 'trailproof' ) }
				</h2>
				<p style={ { fontSize: 13, color: '#64748B', margin: '6px 0 0', lineHeight: 1.6 } }>
					{ __( 'WCAG 2.1 requires a contrast ratio of at least 4.5:1 for normal text (AA standard). Review each issue and apply the suggested color adjustment in your theme.', 'trailproof' ) }
				</p>
			</div>

			{ items.length === 0 ? (
				<div style={ { ...card, padding: '48px', textAlign: 'center', color: '#94A3B8' } }>
					<div style={ { fontSize: 32, marginBottom: 12 } } aria-hidden="true">🎨</div>
					<div style={ { fontSize: 15, fontWeight: 600, color: '#1A2742', marginBottom: 4 } }>
						{ __( 'No contrast issues found', 'trailproof' ) }
					</div>
					<div style={ { fontSize: 13 } }>
						{ __( 'Run a scan first to detect color contrast issues.', 'trailproof' ) }
					</div>
				</div>
			) : (
				<>
					<StatsBar total={ items.filter( i => i.status !== 'fixed' && i.status !== 'na' ).length } passed={ data?.passed ?? 0 } />

					{/* Filter */}
					<div style={ { display: 'flex', gap: 8, marginBottom: 16 } }>
						{ [
							{ key: 'open', label: __( 'Needs attention', 'trailproof' ) },
							{ key: 'all',  label: __( 'All issues',       'trailproof' ) },
						].map( ( f ) => (
							<button
								key={ f.key }
								onClick={ () => setFilter( f.key ) }
								style={ {
									padding:      '5px 14px',
									fontSize:     12,
									fontWeight:   600,
									borderRadius: 99,
									border:       `1px solid ${ filter === f.key ? '#2563EB' : '#E2E8F0' }`,
									background:   filter === f.key ? '#EFF6FF' : '#fff',
									color:        filter === f.key ? '#1D4ED8' : '#64748B',
									cursor:       'pointer',
								} }
							>
								{ f.label }
							</button>
						) ) }
					</div>

					<div style={ { display: 'flex', flexDirection: 'column', gap: 12 } }>
						{ filtered.length === 0 ? (
							<div style={ { ...card, padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
								{ __( 'No open contrast issues. All detected issues have been addressed.', 'trailproof' ) }
							</div>
						) : (
							filtered.map( issue => (
								<ContrastIssueCard key={ issue.fingerprint || issue.id } issue={ issue } />
							) )
						) }
					</div>

					{/* WCAG info */}
					<div style={ { ...card, padding: '16px 20px', marginTop: 20 } }>
						<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', marginBottom: 8 } }>
							{ __( 'WCAG Color Contrast Standards', 'trailproof' ) }
						</div>
						<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, color: '#64748B' } }>
							<div>
								<strong>AA (minimum):</strong>{ ' ' }
								{ __( '4.5:1 normal text, 3:1 large text (18pt+ or 14pt bold)', 'trailproof' ) }
							</div>
							<div>
								<strong>AAA (enhanced):</strong>{ ' ' }
								{ __( '7:1 normal text, 4.5:1 large text', 'trailproof' ) }
							</div>
						</div>
						<div style={ { marginTop: 8, fontSize: 11, color: '#94A3B8' } }>
							{ __( 'Suggestions shown are the nearest compliant shade. Always review color changes with your design team before applying to live themes.', 'trailproof' ) }
						</div>
					</div>
				</>
			) }
		</div>
	);
}
