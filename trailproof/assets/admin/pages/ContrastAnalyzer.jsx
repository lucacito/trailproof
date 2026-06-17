import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { Modal } from '@wordpress/components';
import { contrastRatio, nearestCompliantShade, passesAA, formatRatio } from '../utils/contrast';

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractText( html ) {
	if ( ! html ) return null;
	try {
		const div = document.createElement( 'div' );
		div.innerHTML = html;
		const text = div.textContent?.trim();
		return text ? text.slice( 0, 30 ) : null;
	} catch ( e ) {
		return null;
	}
}

function elementTypeLabel( html ) {
	const match = html?.match( /^<(\w+)[\s>]/i );
	const tag   = match?.[1]?.toLowerCase();
	const labels = { a: 'Link', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p: 'Paragraph', span: 'Span', div: 'Div', button: 'Button', label: 'Label', li: 'List item', td: 'Table cell', th: 'Table header' };
	return tag ? ( labels[tag] ?? tag.toUpperCase() ) : null;
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function Swatch( { fg, bg, label, ratio, passes, text } ) {
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
				wordBreak:    'break-word',
			} }>
				{ text || __( 'Aa', 'trailproof' ) }
			</div>
			{ fg && (
				<div style={ { fontSize: 10, color: '#64748B', display: 'flex', gap: 6, flexWrap: 'wrap' } }>
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

// ─── Page group ───────────────────────────────────────────────────────────────

function PageGroup( { url, post_title, issues, onFixApplied } ) {
	const [ open, setOpen ] = useState( true );
	const failCount = issues.filter( i => i.status !== 'fixed' && i.status !== 'na' ).length;

	return (
		<div style={ { border: '1px solid #E8ECF2', borderRadius: 8, overflow: 'hidden' } }>
			<button
				onClick={ () => setOpen( o => ! o ) }
				style={ {
					width:          '100%',
					display:        'flex',
					alignItems:     'center',
					justifyContent: 'space-between',
					padding:        '12px 16px',
					background:     open ? '#F8FAFC' : '#fff',
					border:         'none',
					cursor:         'pointer',
					textAlign:      'left',
					gap:            12,
				} }
			>
				<div style={ { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } }>
					<span style={ { fontSize: 12, color: '#94A3B8' } } aria-hidden="true">📄</span>
					<span style={ { fontSize: 13, fontWeight: 600, color: '#1A2742', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
						{ post_title || url }
					</span>
					<span style={ { fontSize: 11, fontWeight: 700, background: failCount > 0 ? '#FEF2F2' : '#F0FDF4', color: failCount > 0 ? '#B91C1C' : '#15803D', borderRadius: 99, padding: '1px 7px', flexShrink: 0 } }>
						{ issues.length } { issues.length === 1 ? __( 'issue', 'trailproof' ) : __( 'issues', 'trailproof' ) }
					</span>
				</div>
				<span style={ { fontSize: 11, color: '#64748B', flexShrink: 0 } }>
					{ open ? '▲' : '▼' }
				</span>
			</button>

			{ open && (
				<div style={ { display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid #E8ECF2' } }>
					{ issues.map( issue => (
						<ContrastIssueCard key={ issue.fingerprint || issue.id } issue={ issue } inGroup onFixApplied={ onFixApplied } />
					) ) }
				</div>
			) }
		</div>
	);
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function ContrastIssueCard( { issue, inGroup = false, onFixApplied } ) {
	const [ expanded,    setExpanded ]    = useState( false );
	const [ confirming,  setConfirming ]  = useState( false );
	const [ applying,    setApplying ]    = useState( false );
	const [ reverting,   setReverting ]   = useState( false );

	const fg           = issue.fg_color;
	const bg           = issue.bg_color || null;
	const isFixed      = issue.status === 'fixed' || issue.status === 'na';
	const isIncomplete = !! issue.incomplete;
	const elementText  = extractText( issue.html_snippet );
	const elemLabel    = elementTypeLabel( issue.html_snippet );

	async function applyFix() {
		setApplying( true );
		setConfirming( false );
		try {
			await apiFetch( {
				path:   '/trailproof/v1/corrections',
				method: 'POST',
				data:   {
					fingerprint:    issue.fingerprint,
					issue_id:       issue.id,
					post_id:        0,  // 0 → stored as NULL → global (all pages)
					url:            '',
					selector:       issue.selector,
					transform_type: 'set_text_color',
					payload:        { selector: issue.selector, color: suggested },
					original:       { color: fg },
					note:           'Color contrast fix — applied from Trailproof Color Contrast Analyzer',
				},
			} );
			onFixApplied?.();
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[Trailproof] Failed to apply fix:', err );
		} finally {
			setApplying( false );
		}
	}

	async function revertFix() {
		if ( ! issue.correction_id ) return;
		setReverting( true );
		try {
			await apiFetch( {
				path:   `/trailproof/v1/corrections/${ issue.correction_id }`,
				method: 'PATCH',
				data:   { enabled: false },
			} );
			onFixApplied?.();
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[Trailproof] Failed to revert fix:', err );
		} finally {
			setReverting( false );
		}
	}

	// Only compute a ratio when we have both fg and bg — never fake one against white.
	const ratio     = ( fg && bg ) ? contrastRatio( fg, bg ) : ( issue.ratio ?? null );
	const suggested = ( fg && bg && ! isIncomplete ) ? nearestCompliantShade( fg, bg ) : null;
	const sugRatio  = suggested ? contrastRatio( suggested, bg ) : null;
	const passes    = ratio !== null && passesAA( ratio );

	const badgeStyle = ( bgColor, color ) => ( {
		fontSize:      10,
		fontWeight:    700,
		background:    bgColor,
		color,
		borderRadius:  99,
		padding:       '2px 8px',
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
	} );

	const cardStyle = inGroup
		? { background: '#fff', borderLeft: `4px solid ${ isFixed ? '#22C55E' : isIncomplete ? '#F59E0B' : passes ? '#EAB308' : '#EF4444' }`, opacity: isFixed ? 0.6 : 1 }
		: { ...card, opacity: isFixed ? 0.6 : 1, borderLeft: `4px solid ${ isFixed ? '#22C55E' : isIncomplete ? '#F59E0B' : passes ? '#EAB308' : '#EF4444' }` };

	return (
		<div style={ cardStyle }>
			<div style={ { padding: '16px 20px' } }>

				{/* Page title — only shown when the card is not inside a PageGroup */}
				{ ! inGroup && issue.post_title && (
					<div style={ { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 } }>
						<span style={ { fontSize: 10, color: '#94A3B8' } } aria-hidden="true">📄</span>
						<a
							href={ issue.url }
							target="_blank"
							rel="noopener noreferrer"
							style={ { fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none' } }
						>
							{ issue.post_title }
						</a>
					</div>
				) }

				{/* Severity badge + ratio */}
				<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } }>
					{ isFixed && (
						<span style={ badgeStyle( '#F0FDF4', '#15803D' ) }>{ __( 'Resolved', 'trailproof' ) }</span>
					) }
					{ ! isFixed && isIncomplete && (
						<span style={ badgeStyle( '#FFFBEB', '#92400E' ) }>{ __( 'Needs manual check', 'trailproof' ) }</span>
					) }
					{ ! isFixed && ! isIncomplete && (
						<span style={ badgeStyle( passes ? '#FFFBEB' : '#FEF2F2', passes ? '#A16207' : '#B91C1C' ) }>
							{ passes ? __( 'Low contrast', 'trailproof' ) : __( 'Fails AA', 'trailproof' ) }
						</span>
					) }
					{ ratio !== null && ! isIncomplete && (
						<span style={ { fontSize: 11, color: '#64748B' } }>
							{ formatRatio( ratio ) }{ __( ':1 (required: 4.5:1)', 'trailproof' ) }
						</span>
					) }
				</div>

				{/* Description */}
				<div style={ { fontSize: 13, fontWeight: 500, color: '#1A2742', lineHeight: 1.4, marginBottom: 6 } }>
					{ isIncomplete
						? __( 'Background color could not be determined (CSS gradient or background-image). Verify contrast manually.', 'trailproof' )
						: ( issue.description || __( 'Color contrast issue', 'trailproof' ) )
					}
				</div>

				{/* Element identifier: type + selector */}
				<div style={ { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' } }>
					{ elemLabel && (
						<span style={ { fontSize: 10, fontWeight: 700, background: '#F1F5F9', color: '#475569', borderRadius: 4, padding: '1px 6px' } }>
							{ elemLabel }
						</span>
					) }
					<code style={ { fontSize: 11, color: '#94A3B8' } }>
						{ issue.selector?.slice( 0, 80 ) }{ ( issue.selector?.length ?? 0 ) > 80 ? '…' : '' }
					</code>
				</div>

				{/* Color preview — only when we have both fg and bg */}
				{ fg && bg && (
					<div style={ { display: 'grid', gridTemplateColumns: suggested && ! isFixed ? '1fr auto 1fr' : '1fr', gap: 12, alignItems: 'start' } }>
						<Swatch
							fg={ fg }
							bg={ bg }
							label={ __( 'Current', 'trailproof' ) }
							ratio={ ratio }
							passes={ passes }
							text={ elementText }
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
									text={ elementText }
								/>
							</>
						) }
					</div>
				) }

				{/* Incomplete — fg-only preview when bg is unknown */}
				{ fg && ! bg && (
					<div style={ { background: '#FFFBEB', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#92400E', marginTop: 4 } }>
						{ __( 'Text color detected:', 'trailproof' ) }{ ' ' }
						<code style={ { background: '#FEF3C7', padding: '1px 5px', borderRadius: 3 } }>{ fg }</code>
						{ ' — ' }
						{ __( 'background color unknown. Open the page and inspect this element to measure contrast manually.', 'trailproof' ) }
					</div>
				) }

				{/* Impact note */}
				{ ! isFixed && ! isIncomplete && (
					<div style={ { marginTop: 12, fontSize: 12, color: '#475569', background: '#F8FAFC', borderRadius: 6, padding: '8px 12px', lineHeight: 1.5 } }>
						{ __( 'Users with low vision may struggle reading this content.', 'trailproof' ) }
					</div>
				) }

				{/* Expand/collapse for raw HTML */}
				{ issue.html_snippet && (
					<>
						<button
							className="button-link"
							onClick={ () => setExpanded( e => ! e ) }
							style={ { fontSize: 12, color: '#2563EB', marginTop: 10, display: 'block' } }
						>
							{ expanded ? __( 'Hide HTML ↑', 'trailproof' ) : __( 'Show HTML ↓', 'trailproof' ) }
						</button>
						{ expanded && (
							<pre style={ { margin: '6px 0 0', padding: '6px 8px', background: '#1A2742', color: '#e2e8f0', borderRadius: 4, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }>
								{ issue.html_snippet.slice( 0, 400 ) }
							</pre>
						) }
					</>
				) }

				{/* Fix / Revert actions — only for confirmed failures with a suggested color */}
				{ ! isIncomplete && suggested && (
					<div style={ { marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }>
						{ ! isFixed ? (
							<>
								<button
									onClick={ () => setConfirming( true ) }
									disabled={ applying }
									style={ {
										padding:      '6px 14px',
										fontSize:     12,
										fontWeight:   600,
										borderRadius: 6,
										border:       '1px solid #2563EB',
										background:   '#2563EB',
										color:        '#fff',
										cursor:       applying ? 'default' : 'pointer',
										opacity:      applying ? 0.6 : 1,
									} }
								>
									{ applying ? __( 'Applying…', 'trailproof' ) : __( 'Apply fix', 'trailproof' ) }
								</button>
								<span style={ { fontSize: 11, color: '#92400E', display: 'flex', alignItems: 'center', gap: 4 } }>
									<span aria-hidden="true">⚠</span>
									{ __( 'Changes brand color — review with your design team first.', 'trailproof' ) }
								</span>
							</>
						) : (
							<>
								<span style={ { fontSize: 12, color: '#15803D', fontWeight: 600 } }>
									✓ { __( 'Fix applied', 'trailproof' ) }
								</span>
								{ issue.correction_id && (
									<button
										onClick={ revertFix }
										disabled={ reverting }
										style={ {
											padding:      '5px 12px',
											fontSize:     11,
											fontWeight:   600,
											borderRadius: 6,
											border:       '1px solid #CBD5E1',
											background:   '#fff',
											color:        '#475569',
											cursor:       reverting ? 'default' : 'pointer',
											opacity:      reverting ? 0.6 : 1,
										} }
									>
										{ reverting ? __( 'Reverting…', 'trailproof' ) : __( 'Revert fix', 'trailproof' ) }
									</button>
								) }
							</>
						) }
					</div>
				) }

				{/* Confirmation modal */}
				{ confirming && (
					<Modal
						title={ __( 'Apply color contrast fix?', 'trailproof' ) }
						onRequestClose={ () => setConfirming( false ) }
						size="medium"
					>
						<p style={ { margin: '0 0 12px', fontSize: 13, color: '#475569', lineHeight: 1.6 } }>
							{ __( 'This will inject a CSS rule that overrides the text color on all pages where this element appears:', 'trailproof' ) }
						</p>
						<pre style={ { margin: '0 0 14px', padding: '8px 12px', background: '#1A2742', color: '#e2e8f0', borderRadius: 6, fontSize: 12, overflowX: 'auto' } }>
							{ `${ issue.selector } { color: ${ suggested } !important; }` }
						</pre>
						<div style={ { background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E', lineHeight: 1.6 } }>
							<strong>{ __( 'Before applying:', 'trailproof' ) }</strong>{ ' ' }
							{ sprintf(
								__( 'The suggested color (%s) is algorithmically derived as the nearest AA-compliant shade. It may not match your brand palette. Review with your design team before publishing to a live site. The fix can be reverted at any time.', 'trailproof' ),
								suggested
							) }
						</div>
						<div style={ { display: 'flex', gap: 8, justifyContent: 'flex-end' } }>
							<button
								onClick={ () => setConfirming( false ) }
								style={ { padding: '7px 16px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', cursor: 'pointer' } }
							>
								{ __( 'Cancel', 'trailproof' ) }
							</button>
							<button
								onClick={ applyFix }
								style={ { padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', cursor: 'pointer' } }
							>
								{ __( 'Apply fix →', 'trailproof' ) }
							</button>
						</div>
					</Modal>
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

// ─── Smart insights ───────────────────────────────────────────────────────────

function buildInsights( items ) {
	const open = items.filter( i => i.status !== 'fixed' && i.status !== 'na' );
	if ( open.length === 0 ) return null;

	// Count how many distinct pages each selector appears on
	const selectorPages = new Map();
	for ( const issue of open ) {
		if ( ! selectorPages.has( issue.selector ) ) {
			selectorPages.set( issue.selector, new Set() );
		}
		selectorPages.get( issue.selector ).add( issue.url );
	}

	const repeated = [ ...selectorPages.entries() ]
		.filter( ( [ , pages ] ) => pages.size > 1 )
		.sort( ( a, b ) => b[1].size - a[1].size );

	if ( repeated.length === 0 ) return null;

	const issuesCoveredByRepeated = repeated.reduce( ( n, [ , pages ] ) => n + pages.size, 0 );
	const topCount  = repeated[0][1].size;
	const totalOpen = open.length;

	return { repeated, issuesCoveredByRepeated, topCount, totalOpen };
}

function InsightBar( { insights } ) {
	const { repeated, issuesCoveredByRepeated, topCount, totalOpen } = insights;
	const selectorCount = repeated.length;

	let message;
	if ( selectorCount === 1 ) {
		message = sprintf(
			/* translators: 1: issue count, 2: page count */
			__( 'One element is flagged on %1$d pages — it\'s almost certainly in a shared template area (header or footer). Fix it once in your theme CSS and %2$d issues clear at once.', 'trailproof' ),
			topCount, topCount
		);
	} else {
		message = sprintf(
			/* translators: 1: selector count, 2: issue count, 3: total open */
			__( '%1$d elements each appear across multiple pages — they\'re likely in a shared header or footer. Fixing them once covers %2$d of the %3$d open issues.', 'trailproof' ),
			selectorCount, issuesCoveredByRepeated, totalOpen
		);
	}

	return (
		<div style={ {
			display:      'flex',
			gap:          10,
			alignItems:   'flex-start',
			background:   '#EFF6FF',
			border:       '1px solid #BFDBFE',
			borderRadius: 8,
			padding:      '12px 16px',
			marginBottom: 16,
			fontSize:     12,
			color:        '#1E40AF',
			lineHeight:   1.6,
		} }>
			<span style={ { flexShrink: 0, fontSize: 14 } } aria-hidden="true">💡</span>
			<div>
				<strong style={ { display: 'block', marginBottom: 2 } }>{ __( 'Tip: shared elements', 'trailproof' ) }</strong>
				{ message }
				{ repeated.length > 0 && (
					<div style={ { marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 } }>
						{ repeated.slice( 0, 3 ).map( ( [ selector ] ) => (
							<code key={ selector } style={ { background: '#DBEAFE', padding: '1px 6px', borderRadius: 4, fontSize: 10 } }>
								{ selector.slice( 0, 60 ) }{ selector.length > 60 ? '…' : '' }
							</code>
						) ) }
						{ repeated.length > 3 && (
							<span style={ { fontSize: 10, color: '#3B82F6', alignSelf: 'center' } }>
								{ __( '+ more', 'trailproof' ) }
							</span>
						) }
					</div>
				) }
			</div>
		</div>
	);
}

function groupByPage( items ) {
	const map = new Map();
	for ( const issue of items ) {
		const key = issue.url;
		if ( ! map.has( key ) ) {
			map.set( key, { url: issue.url, post_title: issue.post_title, issues: [] } );
		}
		map.get( key ).issues.push( issue );
	}
	return [ ...map.values() ];
}

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

	const items    = data?.items ?? [];
	const filtered = filter === 'all'
		? items
		: items.filter( i => i.status !== 'fixed' && i.status !== 'na' );
	const insights = buildInsights( items );

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

					{ insights && <InsightBar insights={ insights } /> }

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

					{ filtered.length === 0 ? (
						<div style={ { ...card, padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
							{ __( 'No open contrast issues. All detected issues have been addressed.', 'trailproof' ) }
						</div>
					) : (
						<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
							{ groupByPage( filtered ).map( group => (
								<PageGroup
									key={ group.url }
									url={ group.url }
									post_title={ group.post_title }
									issues={ group.issues }
									onFixApplied={ fetchData }
								/>
							) ) }
						</div>
					) }

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
