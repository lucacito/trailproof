import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

// ─── Design tokens ────────────────────────────────────────────────────────────

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

const DIVI_BLUE = '#004B9B'; // Divi brand blue

function scoreColor( score ) {
	if ( score === null ) return '#94A3B8';
	if ( score >= 80 ) return '#16A34A';
	if ( score >= 50 ) return '#D97706';
	return '#DC2626';
}

// ─── Score ring (SVG) ─────────────────────────────────────────────────────────

function ScoreRing( { score, size = 120 } ) {
	const radius      = ( size - 16 ) / 2;
	const circ        = 2 * Math.PI * radius;
	const fill        = score !== null ? Math.max( 0, Math.min( 100, score ) ) : 0;
	const offset      = circ - ( fill / 100 ) * circ;
	const color       = scoreColor( score );

	return (
		<div style={ { position: 'relative', width: size, height: size, flexShrink: 0 } }>
			<svg width={ size } height={ size } style={ { transform: 'rotate(-90deg)' } }>
				<circle cx={ size / 2 } cy={ size / 2 } r={ radius }
					fill="none" stroke="#E8ECF2" strokeWidth={ 8 } />
				<circle cx={ size / 2 } cy={ size / 2 } r={ radius }
					fill="none" stroke={ color } strokeWidth={ 8 }
					strokeDasharray={ circ } strokeDashoffset={ offset }
					strokeLinecap="round"
					style={ { transition: 'stroke-dashoffset 0.6s ease' } } />
			</svg>
			<div style={ {
				position:       'absolute', inset: 0,
				display:        'flex', flexDirection: 'column',
				alignItems:     'center', justifyContent: 'center',
			} }>
				<span style={ { fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 } }>
					{ score !== null ? `${ score }%` : '—' }
				</span>
				<span style={ { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } }>
					{ __( 'Score', 'trailproof' ) }
				</span>
			</div>
		</div>
	);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge( { status, supported } ) {
	if ( status === 'optimized' ) {
		return (
			<span style={ { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F0FDF4', color: '#15803D', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600 } }>
				✓ { __( 'Optimized', 'trailproof' ) }
			</span>
		);
	}
	if ( status === 'needs_review' && supported ) {
		return (
			<span style={ { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF7ED', color: '#C2410C', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600 } }>
				⚠ { __( 'Needs fix', 'trailproof' ) }
			</span>
		);
	}
	return (
		<span style={ { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F8FAFC', color: '#94A3B8', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600 } }>
			{ supported ? __( 'Not detected', 'trailproof' ) : __( 'Coming soon', 'trailproof' ) }
		</span>
	);
}

// ─── Pages list ───────────────────────────────────────────────────────────────

function PagesList( { pages } ) {
	if ( ! pages?.length ) return null;

	return (
		<div style={ { marginTop: 14 } }>
			<div style={ { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
				{ __( 'Found on', 'trailproof' ) } { pages.length } { pages.length === 1 ? __( 'page', 'trailproof' ) : __( 'pages', 'trailproof' ) }
			</div>
			<div style={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
				{ pages.map( ( page, i ) => (
					<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } }>
						<span style={ { color: '#CBD5E1', fontSize: 10 } } aria-hidden="true">↗</span>
						<a
							href={ page.url }
							target="_blank"
							rel="noopener noreferrer"
							style={ { color: DIVI_BLUE, textDecoration: 'none', fontWeight: 500 } }
						>
							{ page.title || page.url }
						</a>
					</div>
				) ) }
			</div>
		</div>
	);
}

// ─── Before / After code view ─────────────────────────────────────────────────

function BeforeAfterView( { module } ) {
	const codeStyle = {
		fontFamily:   '"SF Mono", "Fira Code", "Cascadia Code", monospace',
		fontSize:     11,
		lineHeight:   1.6,
		whiteSpace:   'pre',
		overflowX:    'auto',
		padding:      '12px 14px',
		borderRadius: 6,
		margin:       0,
	};

	return (
		<div style={ { marginTop: 16 } }>
			<div style={ { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 } }>
				{ __( 'Technical details', 'trailproof' ) }
			</div>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } }>
				<div>
					<div style={ { fontSize: 11, fontWeight: 600, color: '#DC2626', marginBottom: 4 } }>
						{ __( 'Before TrailProof', 'trailproof' ) }
					</div>
					<pre style={ { ...codeStyle, background: '#FEF2F2', color: '#7F1D1D' } }>
						{ module.before_code }
					</pre>
				</div>
				<div>
					<div style={ { fontSize: 11, fontWeight: 600, color: '#16A34A', marginBottom: 4 } }>
						{ __( 'After TrailProof', 'trailproof' ) }
					</div>
					<pre style={ { ...codeStyle, background: '#F0FDF4', color: '#14532D' } }>
						{ module.after_code }
					</pre>
				</div>
			</div>

			<div style={ { marginTop: 12, padding: '10px 12px', background: '#EFF6FF', borderRadius: 6, borderLeft: '3px solid #2563EB', fontSize: 12, color: '#1E40AF' } }>
				{ module.explanation }
			</div>

			{ module.aria_attrs?.length > 0 && (
				<div style={ { marginTop: 10 } }>
					<span style={ { fontSize: 11, fontWeight: 600, color: '#64748B' } }>{ __( 'Attributes added:', 'trailproof' ) } </span>
					{ module.aria_attrs.map( ( attr, i ) => (
						<code key={ i } style={ { background: '#F1F5F9', color: '#475569', borderRadius: 4, padding: '1px 5px', fontSize: 11, marginRight: 4 } }>
							{ attr }
						</code>
					) ) }
				</div>
			) }
		</div>
	);
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard( { module, onFix, fixing } ) {
	const [ expanded, setExpanded ] = useState( false );
	const canExpand  = module.detected || module.supported;
	const canFix     = module.detected && module.supported && module.status === 'needs_review';

	return (
		<div style={ {
			...card,
			overflow: 'hidden',
			opacity:  module.status === 'not_detected' && ! module.supported ? 0.55 : 1,
		} }>
			<div style={ { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' } }>
				{/* Clickable expand area */}
				<button
					onClick={ () => canExpand && setExpanded( e => ! e ) }
					style={ {
						display:    'flex',
						alignItems: 'center',
						gap:        12,
						flex:       1,
						background: 'none',
						border:     'none',
						cursor:     canExpand ? 'pointer' : 'default',
						textAlign:  'left',
						padding:    0,
					} }
				>
					<div style={ { flex: 1 } }>
						<div style={ { fontSize: 13, fontWeight: 600, color: '#1A2742', marginBottom: 4 } }>
							{ module.label }
						</div>
						<div style={ { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }>
							<StatusBadge status={ module.status } supported={ module.supported } />
							{ module.detected && module.page_count > 0 && (
								<span style={ { fontSize: 11, color: '#94A3B8' } }>
									{ module.page_count } { module.page_count === 1 ? __( 'page', 'trailproof' ) : __( 'pages', 'trailproof' ) }
								</span>
							) }
						</div>
					</div>
					{ canExpand && (
						<span style={ { fontSize: 14, color: '#94A3B8', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 } } aria-hidden="true">
							▾
						</span>
					) }
				</button>

				{/* Fix button — outside the expand button */}
				{ canFix && (
					<button
						onClick={ onFix }
						disabled={ fixing }
						style={ {
							background:   fixing ? '#E8ECF2' : '#1A2742',
							color:        fixing ? '#94A3B8' : '#fff',
							border:       'none',
							borderRadius: 6,
							padding:      '6px 14px',
							fontSize:     11,
							fontWeight:   600,
							cursor:       fixing ? 'wait' : 'pointer',
							flexShrink:   0,
							transition:   'background 0.15s',
						} }
					>
						{ fixing ? __( 'Fixing…', 'trailproof' ) : __( 'Fix all →', 'trailproof' ) }
					</button>
				) }
				{ module.status === 'optimized' && (
					<span style={ { fontSize: 11, color: '#16A34A', fontWeight: 600, flexShrink: 0 } }>
						✓ { __( 'Applied', 'trailproof' ) }
					</span>
				) }
			</div>

			{ expanded && (
				<div style={ { padding: '0 16px 16px', borderTop: '1px solid #F1F5F9' } }>
					{ module.enhancements?.length > 0 && (
						<div style={ { marginTop: 12 } }>
							<div style={ { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
								{ __( 'Enhancements applied', 'trailproof' ) }
							</div>
							<div style={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
								{ module.enhancements.map( ( e, i ) => (
									<div key={ i } style={ { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#475569' } }>
										<span style={ { color: module.status === 'optimized' ? '#16A34A' : '#94A3B8', fontWeight: 700, flexShrink: 0, fontSize: 11 } } aria-hidden="true">✓</span>
										{ e }
									</div>
								) ) }
							</div>
						</div>
					) }

					<PagesList pages={ module.pages } />
					<BeforeAfterView module={ module } />
				</div>
			) }
		</div>
	);
}

// ─── History section ──────────────────────────────────────────────────────────

function HistorySection( { history } ) {
	if ( ! history?.length ) {
		return (
			<div style={ { padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
				{ __( 'No Divi improvements recorded yet.', 'trailproof' ) }
			</div>
		);
	}

	const grouped = history.reduce( ( acc, entry ) => {
		const date = entry.date ? new Date( entry.date ).toLocaleDateString( undefined, { month: 'long', day: 'numeric', year: 'numeric' } ) : __( 'Unknown date', 'trailproof' );
		if ( ! acc[ date ] ) acc[ date ] = [];
		acc[ date ].push( entry );
		return acc;
	}, {} );

	return (
		<div style={ { display: 'flex', flexDirection: 'column', gap: 0 } }>
			{ Object.entries( grouped ).map( ( [ date, entries ] ) => (
				<div key={ date } style={ { paddingBottom: 12 } }>
					<div style={ { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }>
						{ date }
					</div>
					{ entries.map( ( entry, i ) => (
						<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: 12 } }>
							<span style={ { color: '#16A34A', fontWeight: 700, fontSize: 11 } } aria-hidden="true">✓</span>
							<span style={ { color: '#1A2742', fontWeight: 500 } }>{ entry.module }</span>
							<span style={ { color: '#94A3B8' } }>{ entry.action }</span>
							{ entry.url && (
								<span style={ { color: '#CBD5E1', fontSize: 10, marginLeft: 'auto' } }>
									{ new URL( entry.url, window.location.origin ).pathname }
								</span>
							) }
						</div>
					) ) }
				</div>
			) ) }
		</div>
	);
}

// ─── HTML report generator ────────────────────────────────────────────────────

function buildHtmlReport( report ) {
	const scoreColor = report.score >= 80 ? '#16A34A' : report.score >= 50 ? '#D97706' : '#DC2626';

	const moduleRows = report.modules.map( m => {
		const statusLabel = m.status === 'optimized' ? '✓ Optimized'
			: m.status === 'needs_review'             ? '⚠ Needs attention'
			: '— Not detected';
		const statusColor = m.status === 'optimized' ? '#16A34A'
			: m.status === 'needs_review'             ? '#D97706'
			: '#94A3B8';
		const enhancements = ( m.enhancements ?? [] ).map( e => `<li>${ e }</li>` ).join( '' );
		return `<tr>
			<td style="font-weight:600">${ m.label }</td>
			<td style="color:${ statusColor };font-weight:600;white-space:nowrap">${ statusLabel }</td>
			<td><ul style="margin:0;padding-left:16px">${ enhancements }</ul></td>
		</tr>`;
	} ).join( '' );

	const generatedDate = new Date( report.generated_at ).toLocaleDateString( undefined, {
		year: 'numeric', month: 'long', day: 'numeric',
	} );

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Divi Accessibility Report — ${ report.site_name }</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1A2742; background: #F8FAFC; }
  .page { max-width: 820px; margin: 40px auto; padding: 0 24px 60px; }
  .header { background: #004B9B; color: #fff; border-radius: 10px; padding: 32px 36px; margin-bottom: 28px; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .header .meta { font-size: 13px; opacity: 0.75; }
  .stats { display: flex; gap: 14px; margin-bottom: 28px; }
  .stat { flex: 1; background: #fff; border: 1px solid #E8ECF2; border-radius: 8px; padding: 18px 16px; text-align: center; }
  .stat-val { font-size: 32px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat-lbl { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
  .score-block { background: #fff; border: 1px solid #E8ECF2; border-radius: 8px; padding: 18px 24px; text-align: center; min-width: 120px; }
  .score-num { font-size: 48px; font-weight: 700; line-height: 1; color: ${ scoreColor }; }
  .score-lbl { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .section-title { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #E8ECF2; border-radius: 8px; overflow: hidden; margin-bottom: 28px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; background: #F8FAFC; border-bottom: 1px solid #E8ECF2; padding: 10px 14px; }
  td { padding: 12px 14px; border-bottom: 1px solid #F1F5F9; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  td li { margin-bottom: 3px; color: #475569; }
  .footer { text-align: center; font-size: 11px; color: #94A3B8; padding-top: 20px; border-top: 1px solid #E8ECF2; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Divi Accessibility Report</h1>
    <div class="meta">${ report.site_name } &middot; Generated ${ generatedDate } &middot; Divi ${ report.divi_version ?? 'detected' }</div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-val">${ report.modules_analyzed }</div>
      <div class="stat-lbl">Modules analyzed</div>
    </div>
    <div class="stat">
      <div class="stat-val" style="color:#16A34A">${ report.automatic_enhancements }</div>
      <div class="stat-lbl">Optimized</div>
    </div>
    <div class="stat">
      <div class="stat-val" style="color:${ ( report.manual_recommendations ?? 0 ) > 0 ? '#D97706' : '#16A34A' }">${ report.manual_recommendations ?? 0 }</div>
      <div class="stat-lbl">Needs attention</div>
    </div>
    <div class="score-block">
      <div class="score-num">${ report.score ?? '—' }%</div>
      <div class="score-lbl">Score</div>
    </div>
  </div>

  <div class="section-title">Module status</div>
  <table>
    <thead>
      <tr>
        <th>Module</th>
        <th>Status</th>
        <th>Enhancements</th>
      </tr>
    </thead>
    <tbody>${ moduleRows }</tbody>
  </table>

  <div class="footer">
    Generated by <strong>TrailProof</strong> &middot; <a href="${ report.site_url }">${ report.site_url }</a>
  </div>
</div>
</body>
</html>`;
}

// ─── Report section ───────────────────────────────────────────────────────────

function ReportSection( { data, generating, onGenerate } ) {
	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 } }>
				{ __( 'Download Accessibility Report', 'trailproof' ) }
			</div>

			{ data && (
				<div style={ { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 } }>
					{ [
						{ label: __( 'Modules analyzed',        'trailproof' ), value: data.modules_analyzed     },
						{ label: __( 'Divi score',              'trailproof' ), value: data.score != null ? `${ data.score }%` : '—' },
						{ label: __( 'Automatic enhancements',  'trailproof' ), value: data.modules_optimized    },
						{ label: __( 'Manual recommendations',  'trailproof' ), value: data.modules_needs_review },
					].map( ( stat, i ) => (
						<div key={ i } style={ { textAlign: 'center', padding: '12px 8px', background: '#F8FAFC', borderRadius: 6 } }>
							<div style={ { fontSize: 22, fontWeight: 700, color: '#1A2742', lineHeight: 1 } }>{ stat.value ?? '—' }</div>
							<div style={ { fontSize: 10, color: '#94A3B8', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' } }>{ stat.label }</div>
						</div>
					) ) }
				</div>
			) }

			<div style={ { fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.6 } }>
				{ __( 'Downloads a formatted HTML report of Divi accessibility improvements — ready to share with clients.', 'trailproof' ) }
			</div>

			<button
				className="button button-primary"
				style={ { fontSize: 12 } }
				onClick={ onGenerate }
				disabled={ generating }
			>
				{ generating ? __( 'Generating…', 'trailproof' ) : __( 'Download HTML Report →', 'trailproof' ) }
			</button>
		</div>
	);
}

// ─── Client-facing summary card ───────────────────────────────────────────────

function ClientSummaryCard( { data } ) {
	if ( ! data?.divi_active ) return null;

	const improvements = [
		{ label: __( 'Website navigation',      'trailproof' ), active: data.modules?.some( m => m.key === 'menu'      && m.status === 'optimized' ) },
		{ label: __( 'Interactive components',  'trailproof' ), active: data.modules?.some( m => [ 'accordion', 'tabs', 'toggle' ].includes( m.key ) && m.status === 'optimized' ) },
		{ label: __( 'Keyboard accessibility',  'trailproof' ), active: data.modules_optimized > 0 },
		{ label: __( 'Screen reader support',   'trailproof' ), active: data.modules_optimized > 0 },
	];

	const activeCount = improvements.filter( i => i.active ).length;
	if ( activeCount === 0 ) return null;

	return (
		<div style={ { ...card, padding: '20px 24px', borderLeft: `4px solid ${ DIVI_BLUE }` } }>
			<div style={ { fontSize: 10, fontWeight: 700, color: DIVI_BLUE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 } }>
				{ __( 'Client Summary', 'trailproof' ) }
			</div>
			<div style={ { fontSize: 13, fontWeight: 600, color: '#1A2742', marginBottom: 12 } }>
				{ __( 'Divi Accessibility Improvements', 'trailproof' ) }
			</div>
			<p style={ { fontSize: 12, color: '#64748B', margin: '0 0 12px', lineHeight: 1.6 } }>
				{ __( 'TrailProof improved:', 'trailproof' ) }
			</p>
			<div style={ { display: 'flex', flexDirection: 'column', gap: 6 } }>
				{ improvements.filter( i => i.active ).map( ( item, i ) => (
					<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1A2742' } }>
						<span style={ { color: '#16A34A', fontWeight: 700, fontSize: 11 } } aria-hidden="true">✓</span>
						{ item.label }
					</div>
				) ) }
			</div>
			<div style={ { marginTop: 12, fontSize: 11, color: '#94A3B8', fontStyle: 'italic' } }>
				{ __( 'Technical details are available in the full report.', 'trailproof' ) }
			</div>
		</div>
	);
}

// ─── Not detected state ───────────────────────────────────────────────────────

function DiviNotDetected() {
	return (
		<div style={ { maxWidth: 560 } }>
			<div style={ { ...card, padding: '32px 36px' } }>
				<div style={ { fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 14 } }>
					{ __( 'Divi not detected on this site', 'trailproof' ) }
				</div>
				<h2 style={ { margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Divi 5 Accessibility Enhancements', 'trailproof' ) }
				</h2>
				<p style={ { color: '#475569', fontSize: 13, marginBottom: 24, lineHeight: 1.7 } }>
					{ __( 'When Divi is active, TrailProof automatically improves the accessibility of Accordion, Tabs, Toggle, Menu, and Gallery modules — no configuration required.', 'trailproof' ) }
				</p>

				<div style={ { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 } }>
					{ [
						__( 'Accordion — accessible expanded/collapsed states',     'trailproof' ),
						__( 'Tabs — proper tab roles and keyboard navigation',       'trailproof' ),
						__( 'Toggle — screen reader status announcements',           'trailproof' ),
						__( 'Menu — sub-menu keyboard and focus handling',           'trailproof' ),
						__( 'Gallery — list semantics for screen readers',           'trailproof' ),
					].map( ( item, i ) => (
						<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' } }>
							<span style={ { color: '#CBD5E1', fontWeight: 700, fontSize: 11 } } aria-hidden="true">○</span>
							{ item }
						</div>
					) ) }
				</div>

				<div style={ { padding: '12px 14px', background: '#F8FAFC', borderRadius: 6, fontSize: 12, color: '#64748B', lineHeight: 1.6 } }>
					{ __( 'Install the Divi theme or Divi Builder plugin and TrailProof will automatically enable Divi-specific accessibility enhancements.', 'trailproof' ) }
				</div>
			</div>
		</div>
	);
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar( { tabs, active, onChange } ) {
	return (
		<div style={ { display: 'flex', gap: 0, borderBottom: '2px solid #E8ECF2', marginBottom: 24 } }>
			{ tabs.map( ( { id, label } ) => (
				<button
					key={ id }
					onClick={ () => onChange( id ) }
					aria-selected={ active === id }
					style={ {
						padding:       '10px 18px',
						background:    'none',
						border:        'none',
						borderBottom:  `2px solid ${ active === id ? DIVI_BLUE : 'transparent' }`,
						marginBottom:  -2,
						color:         active === id ? DIVI_BLUE : '#64748B',
						fontWeight:    active === id ? 700 : 400,
						fontSize:      13,
						cursor:        'pointer',
					} }
				>
					{ label }
				</button>
			) ) }
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiviEnhancements() {
	const [ data, setData ]             = useState( null );
	const [ loading, setLoading ]       = useState( true );
	const [ error, setError ]           = useState( null );
	const [ tab, setTab ]               = useState( 'modules' );
	const [ refreshing, setRefreshing ] = useState( false );
	const [ generating, setGenerating ] = useState( false );
	const [ fixing, setFixing ]         = useState( {} ); // { moduleKey: bool }
	const [ fixMsg, setFixMsg ]         = useState( null ); // { type: 'ok'|'err', text }

	const fetchData = useCallback( () => {
		setLoading( true );
		apiFetch( { path: '/trailproof/v1/divi/analysis' } )
			.then( setData )
			.catch( err => setError( err.message ?? __( 'Failed to load.', 'trailproof' ) ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchData(); }, [ fetchData ] );

	function handleRefresh() {
		setRefreshing( true );
		apiFetch( { path: '/trailproof/v1/divi/analysis/refresh', method: 'POST' } )
			.then( setData )
			.catch( () => {} )
			.finally( () => setRefreshing( false ) );
	}

	async function handleFixModule( moduleKey ) {
		setFixing( prev => ( { ...prev, [ moduleKey ]: true } ) );
		setFixMsg( null );
		try {
			const ruleId = `divi-${ moduleKey }`;
			const issues = await apiFetch( {
				path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( ruleId ) }&status=open&per_page=200`,
			} );

			if ( ! issues?.length ) {
				setFixMsg( { type: 'err', text: __( 'No open issues found for this module. Run a scan first.', 'trailproof' ) } );
				return;
			}

			for ( const issue of issues ) {
				await apiFetch( {
					path:   `/trailproof/v1/issues/${ issue.id }/decide`,
					method: 'POST',
					data:   { action: 'apply', transform_type: 'widget_aria_pattern', payload: {} },
				} );
			}

			setFixMsg( { type: 'ok', text: `${ issues.length } ${ __( 'fix(es) applied. Changes are reversible from the Fix Issues screen.', 'trailproof' ) }` } );

			// Refresh analysis so status flips to optimized
			setRefreshing( true );
			apiFetch( { path: '/trailproof/v1/divi/analysis/refresh', method: 'POST' } )
				.then( setData )
				.catch( () => {} )
				.finally( () => setRefreshing( false ) );
		} catch ( err ) {
			setFixMsg( { type: 'err', text: err?.message ?? __( 'Fix failed.', 'trailproof' ) } );
		} finally {
			setFixing( prev => ( { ...prev, [ moduleKey ]: false } ) );
		}
	}

	function handleGenerateReport() {
		setGenerating( true );
		apiFetch( { path: '/trailproof/v1/divi/report' } )
			.then( report => {
				const html = buildHtmlReport( report );
				const blob = new Blob( [ html ], { type: 'text/html' } );
				const url  = URL.createObjectURL( blob );
				const a    = document.createElement( 'a' );
				a.href     = url;
				a.download = `divi-accessibility-report-${ new Date().toISOString().slice( 0, 10 ) }.html`;
				a.click();
				URL.revokeObjectURL( url );
			} )
			.catch( () => {} )
			.finally( () => setGenerating( false ) );
	}

	if ( loading ) {
		return (
			<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
				{ __( 'Loading Divi analysis…', 'trailproof' ) }
			</div>
		);
	}

	if ( error ) {
		return <p style={ { color: '#DC2626' } }>{ error }</p>;
	}

	if ( ! data?.divi_active ) {
		return <DiviNotDetected />;
	}

	const detectedModules = data.modules?.filter( m => m.detected ) ?? [];

	const TABS = [
		{ id: 'modules',  label: __( 'Module Compatibility',  'trailproof' ) },
		{ id: 'history',  label: __( 'Improvements History',  'trailproof' ) },
		{ id: 'report',   label: __( 'Report',                'trailproof' ) },
		{ id: 'client',   label: __( 'Client Summary',        'trailproof' ) },
	];

	return (
		<div>

			{/* ── Header row ─────────────────────────────────────────────────── */}
			<div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 } }>
				<div>
					<div style={ { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } }>
						<div style={ { fontSize: 11, fontWeight: 700, color: DIVI_BLUE, textTransform: 'uppercase', letterSpacing: '0.1em' } }>
							{ __( 'Builder Intelligence', 'trailproof' ) }
						</div>
						<span style={ { background: '#EFF6FF', color: DIVI_BLUE, borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 } }>
							<span style={ { width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' } } aria-hidden="true" />
							{ __( 'Divi detected', 'trailproof' ) }
							{ data.divi_version && ` v${ data.divi_version }` }
						</span>
					</div>
					<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
						{ __( 'Divi 5 Accessibility Enhancements', 'trailproof' ) }
					</h2>
					<p style={ { margin: '5px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.5 } }>
						{ __( 'TrailProof detected Divi modules and improved their accessibility.', 'trailproof' ) }
					</p>
				</div>
				<button
					className="button button-secondary"
					style={ { fontSize: 11, flexShrink: 0, marginTop: 4 } }
					onClick={ handleRefresh }
					disabled={ refreshing }
				>
					{ refreshing ? __( 'Refreshing…', 'trailproof' ) : __( '↺ Refresh analysis', 'trailproof' ) }
				</button>
			</div>

			{/* ── Stat cards + score ─────────────────────────────────────────── */}
			<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, marginBottom: 28, alignItems: 'stretch' } }>
				{ [
					{ label: __( 'Modules analyzed',  'trailproof' ), value: data.modules_analyzed,     sub: __( 'Divi modules detected on site',     'trailproof' ) },
					{ label: __( 'Optimized',         'trailproof' ), value: data.modules_optimized,    sub: __( 'Automatically improved by TrailProof', 'trailproof' ), color: '#16A34A' },
					{ label: __( 'Needs fix',         'trailproof' ), value: data.modules_needs_review, sub: __( 'Require attention',                  'trailproof' ), color: data.modules_needs_review > 0 ? '#D97706' : '#16A34A' },
				].map( ( stat, i ) => (
					<div key={ i } style={ { ...card, padding: '18px 20px' } }>
						<div style={ { fontSize: 28, fontWeight: 700, color: stat.color ?? '#1A2742', lineHeight: 1, marginBottom: 4 } }>
							{ stat.value ?? '—' }
						</div>
						<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', marginBottom: 2 } }>{ stat.label }</div>
						<div style={ { fontSize: 11, color: '#94A3B8' } }>{ stat.sub }</div>
					</div>
				) ) }

				{/* Score ring card */}
				<div style={ { ...card, padding: '18px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 } }>
					<ScoreRing score={ data.score } size={ 100 } />
					<div style={ { fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 1.4 } }>
						{ data.modules_analyzed } { __( 'modules analyzed', 'trailproof' ) }<br />
						{ data.modules_optimized } { __( 'automatically optimized', 'trailproof' ) }
					</div>
				</div>
			</div>

			{/* ── Fix feedback banner ────────────────────────────────────────── */}
			{ fixMsg && (
				<div style={ {
					marginBottom: 16,
					padding:      '10px 14px',
					borderRadius: 6,
					fontSize:     12,
					background:   fixMsg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
					color:        fixMsg.type === 'ok' ? '#15803D' : '#DC2626',
					border:       `1px solid ${ fixMsg.type === 'ok' ? '#BBF7D0' : '#FECACA' }`,
					display:      'flex',
					alignItems:   'center',
					justifyContent: 'space-between',
					gap:          12,
				} }>
					{ fixMsg.text }
					<button onClick={ () => setFixMsg( null ) } style={ { background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1, flexShrink: 0 } }>
						×
					</button>
				</div>
			) }

			{/* ── Tab content ────────────────────────────────────────────────── */}
			<TabBar tabs={ TABS } active={ tab } onChange={ setTab } />

			{ tab === 'modules' && (
				<div>
					<div style={ { fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 14 } }>
						{ __( 'Click a module to see what TrailProof improved. Use "Fix all →" to apply fixes without leaving this page.', 'trailproof' ) }
					</div>

					{ detectedModules.length > 0 && (
						<>
							<div style={ { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
								{ __( 'Detected on your site', 'trailproof' ) }
							</div>
							<div style={ { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 } }>
								{ detectedModules.map( m => (
									<ModuleCard
										key={ m.key }
										module={ m }
										onFix={ () => handleFixModule( m.key ) }
										fixing={ !! fixing[ m.key ] }
									/>
								) ) }
							</div>
						</>
					) }

					{ data.modules?.filter( m => ! m.detected ).length > 0 && (
						<>
							<div style={ { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }>
								{ __( 'Available enhancements', 'trailproof' ) }
							</div>
							<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
								{ data.modules.filter( m => ! m.detected ).map( m => (
									<ModuleCard
										key={ m.key }
										module={ m }
										onFix={ () => handleFixModule( m.key ) }
										fixing={ !! fixing[ m.key ] }
									/>
								) ) }
							</div>
						</>
					) }

					{ data.modules?.length === 0 && (
						<div style={ { textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 } }>
							{ __( 'No Divi modules detected yet. Publish pages using Divi modules to see them here.', 'trailproof' ) }
						</div>
					) }
				</div>
			) }

			{ tab === 'history' && (
				<div style={ { ...card, padding: '20px 24px' } }>
					<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 } }>
						{ __( 'Divi Improvements History', 'trailproof' ) }
					</div>
					<HistorySection history={ data.history } />
				</div>
			) }

			{ tab === 'report' && (
				<ReportSection
					data={ data }
					generating={ generating }
					onGenerate={ handleGenerateReport }
				/>
			) }

			{ tab === 'client' && (
				<div>
					<p style={ { fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.6 } }>
						{ __( 'A non-technical summary of Divi improvements — ready to share with clients.', 'trailproof' ) }
					</p>
					<ClientSummaryCard data={ data } />
					{ ! data.modules_optimized && (
						<p style={ { fontSize: 13, color: '#94A3B8', marginTop: 16 } }>
							{ __( 'Apply Divi module fixes to populate the client summary.', 'trailproof' ) }
						</p>
					) }
				</div>
			) }

		</div>
	);
}
