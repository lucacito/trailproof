import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import Dashboard           from '../pages/Dashboard';
import Scan                from '../pages/Scan';
import Worklist            from '../pages/Worklist';
import DecisionQueue       from '../pages/DecisionQueue';
import Checklist           from '../pages/Checklist';
import Statement           from '../pages/Statement';
import Reports             from '../pages/Reports';
import ClientPortal        from '../pages/ClientPortal';
import RemediationSettings from '../pages/RemediationSettings';
import ImpactComparison    from '../pages/ImpactComparison';
import ContrastAnalyzer    from '../pages/ContrastAnalyzer';
import ScanHistory         from '../pages/ScanHistory';
import DiviEnhancements    from '../pages/DiviEnhancements';

// ─── SVG icons ───────────────────────────────────────────────────────────────

const I = { strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconOverview   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="9" y="1" width="5" height="5" rx="1"/><rect x="1" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
const IconScan       = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>;
const IconFix        = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><path d="M8.5 1.5L2.5 8.5H7L6 13.5L12 6.5H7.5L8.5 1.5Z"/></svg>;
const IconDecisions  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><line x1="7.5" y1="1" x2="7.5" y2="14"/><path d="M2 4.5l4 3-4 3"/><path d="M13 7.5l-4 3 4 3"/></svg>;
const IconChecklist  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><polyline points="2,4 4,6 8,2"/><line x1="11" y1="4" x2="13" y2="4"/><polyline points="2,9 4,11 8,7"/><line x1="11" y1="9" x2="13" y2="9"/></svg>;
const IconStatement  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><path d="M3 1h7l4 4v9H3V1z"/><polyline points="10,1 10,5 14,5"/><line x1="5" y1="7" x2="10" y2="7"/><line x1="5" y1="10" x2="10" y2="10"/></svg>;
const IconReports    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="4" width="13" height="10" rx="1"/><polyline points="4,4 4,1 11,1 11,4"/><line x1="5" y1="9" x2="10" y2="9"/></svg>;
const IconPortal     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="7.5" cy="5" r="3"/><path d="M1 14c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/></svg>;
const IconContrast   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 1.5v12" /><path d="M7.5 1.5A6 6 0 0 1 7.5 13.5Z" fill="currentColor" stroke="none"/></svg>;
const IconCompare    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="3" width="5" height="9" rx="1"/><rect x="9" y="3" width="5" height="9" rx="1"/><line x1="7.5" y1="5" x2="7.5" y2="10"/><polyline points="6,6 7.5,5 9,6"/></svg>;
const IconHistory    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="7.5" cy="7.5" r="6"/><polyline points="7.5,4 7.5,7.5 10,9"/></svg>;
const IconSettings   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M2.9 2.9l1.4 1.4M10.7 10.7l1.4 1.4M2.9 12.1l1.4-1.4M10.7 4.3l1.4-1.4"/></svg>;
const IconDivi       = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="1" width="13" height="13" rx="2"/><path d="M4 5h7M4 7.5h5M4 10h7"/></svg>;
const IconCheck      = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#22c55e" fillOpacity=".2"/><polyline points="2.5,5 4,6.5 7.5,3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconInfo       = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="5" stroke="currentColor" strokeWidth="1.2"/><circle cx="5.5" cy="3.5" r="0.7" fill="currentColor"/><rect x="4.85" y="5" width="1.3" height="3" rx="0.65" fill="currentColor"/></svg>;

// ─── Nav definition ───────────────────────────────────────────────────────────
// section: groups items under a labelled divider ('workflow' | 'analysis' | 'tracking' | 'clients' | 'settings')

const NAV = [
	{ id: 'dashboard',           label: __( 'Overview',          'trailproof' ), Icon: IconOverview,  section: 'top',        tooltip: __( 'High-level view of your site\'s accessibility health score, scan status, and overall workflow progress.',                                                                                      'trailproof' ) },
	{ id: 'scan',                label: __( 'Scan Site',         'trailproof' ), Icon: IconScan,       section: 'workflow', step: 1, tooltip: __( 'Run an automated axe-core scan to detect WCAG violations. Results are classified into auto-fixable (A), decision-required (B), and manual-check (C) buckets.',                   'trailproof' ) },
	{ id: 'worklist',            label: __( 'Fix Issues',        'trailproof' ), Icon: IconFix,        section: 'workflow', step: 2, tooltip: __( 'Apply one-click fixes for auto-correctable Bucket A issues. Every correction is reversible — original content is never modified.',                                                'trailproof' ) },
	{ id: 'decisions',           label: __( 'Review Decisions',  'trailproof' ), Icon: IconDecisions,  section: 'workflow', step: 3, tooltip: __( 'Review Bucket B issues that require human judgment — color contrast, alt text content, link text in context. Approve or dismiss with a side-by-side before/after view.',       'trailproof' ) },
	{ id: 'checklist',           label: __( 'Manual Checks',     'trailproof' ), Icon: IconChecklist,  section: 'workflow', step: 4, tooltip: __( 'Sign off on Bucket C items that can\'t be machine-detected: keyboard operability, captions, reading order, form error messaging, and motion/autoplay.',                         'trailproof' ) },
	{ id: 'statement',           label: __( 'Statement',         'trailproof' ), Icon: IconStatement,  section: 'workflow', step: 5, tooltip: __( 'Generate a dated accessibility statement documenting your remediation scope, methods, and current conformance status.',                                                           'trailproof' ) },
	{ id: 'reports',             label: __( 'Reports',           'trailproof' ), Icon: IconReports,    section: 'workflow', step: 6, tooltip: __( 'Export an evidence bundle — audit log, applied corrections, decisions log, and accessibility statement — as a downloadable ZIP.',                                               'trailproof' ) },
	{ id: 'contrast',            label: __( 'Color Contrast',    'trailproof' ), Icon: IconContrast,   section: 'tools',    tooltip: __( 'Interactive WCAG contrast ratio checker. Test foreground and background color pairs against AA (4.5:1) and AAA (7:1) thresholds.',                                                        'trailproof' ) },
	{ id: 'impactComparison',    label: __( 'Impact Test',       'trailproof' ), Icon: IconCompare,    section: 'tools',    tooltip: __( 'Side-by-side before/after preview of applied corrections so you can verify that fixes render correctly on your live site.',                                                               'trailproof' ) },
	{ id: 'scanHistory',         label: __( 'Scan History',      'trailproof' ), Icon: IconHistory,    section: 'tools',    tooltip: __( 'Browse all past scan results, compare scores over time, and review which issues appeared or resolved between scan runs.',                                                                  'trailproof' ) },
	{ id: 'diviEnhancements',    label: __( 'Divi Editor',       'trailproof' ), Icon: IconDivi,       section: 'prevention', tooltip: __( 'Accessibility prevention layer for the Divi editor — flags WCAG problems as you build so they\'re caught before publishing.',                                                          'trailproof' ) },
	{ id: 'remediationSettings', label: __( 'Remediation',       'trailproof' ), Icon: IconSettings,   section: 'settings', tooltip: __( 'Configure auto-fix behavior, scheduled scan frequency, sitewide enhancement rules, and correction preferences.',                                                                         'trailproof' ) },
	{ id: 'clientPortal',        label: __( 'Client Portal',     'trailproof' ), Icon: IconPortal,     section: 'settings', tooltip: __( 'Generate token-gated share links so clients or stakeholders can view accessibility progress without needing a WordPress login.',                                                          'trailproof' ) },
];

const PAGES = {
	dashboard:           Dashboard,
	diviEnhancements:    DiviEnhancements,
	scan:                Scan,
	worklist:            Worklist,
	decisions:           DecisionQueue,
	checklist:           Checklist,
	statement:           Statement,
	reports:             Reports,
	clientPortal:        ClientPortal,
	remediationSettings: RemediationSettings,
	impactComparison:    ImpactComparison,
	contrast:            ContrastAnalyzer,
	scanHistory:         ScanHistory,
};

function getInitialPage() {
	const p = new URLSearchParams( window.location.search ).get( 'page' );
	return p === 'trailproof-client-portal' ? 'clientPortal' : 'dashboard';
}

// ─── Step completion from dashboard status ────────────────────────────────────

function isStepDone( id, s ) {
	if ( ! s ) return false;
	const { last_scan_at, unique_by_bucket, health_score, has_statement, has_bundle } = s;
	if ( id === 'scan'      ) return !! last_scan_at;
	if ( id === 'worklist'  ) return last_scan_at && ( unique_by_bucket?.A ?? 1 ) === 0;
	if ( id === 'decisions' ) return last_scan_at && ( unique_by_bucket?.B ?? 1 ) === 0;
	if ( id === 'checklist' ) return last_scan_at && ( health_score?.components?.c?.score ?? 0 ) === 100;
	if ( id === 'statement' ) return !! has_statement;
	if ( id === 'reports'   ) return !! has_bundle;
	return false;
}

// ─── Sidebar progress footer ──────────────────────────────────────────────────

const WORKFLOW_IDS = [ 'scan', 'worklist', 'decisions', 'checklist', 'statement', 'reports' ];

function SidebarFooter( { status } ) {
	if ( ! status?.last_scan_at ) return null;
	const done = WORKFLOW_IDS.filter( id => isStepDone( id, status ) ).length;
	const pct  = Math.round( ( done / WORKFLOW_IDS.length ) * 100 );

	return (
		<div style={ { padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' } }>
			<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 } }>
				<span>{ __( 'Workflow progress', 'trailproof' ) }</span>
				<span>{ done }/{ WORKFLOW_IDS.length }</span>
			</div>
			<div style={ { background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 4, overflow: 'hidden' } }>
				<div style={ { width: `${ pct }%`, height: '100%', background: pct === 100 ? '#22c55e' : '#5b9cf6', borderRadius: 99, transition: 'width 0.6s ease' } } />
			</div>
		</div>
	);
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const whiteLabel = !! window.trailproofData?.whiteLabel;

function NavButton( { id, label, Icon, step, active, done, navigate, tooltip } ) {
	const [ tipPos, setTipPos ] = useState( null );

	const showTip = ( e ) => {
		const r = e.currentTarget.getBoundingClientRect();
		setTipPos( { x: r.right + 10, y: r.top + r.height / 2 } );
	};
	const hideTip = () => setTipPos( null );

	return (
		<div style={ { display: 'flex', alignItems: 'stretch', width: '100%' } }>
			<button
				onClick={ () => navigate( id ) }
				aria-current={ active ? 'page' : undefined }
				style={ {
					flex:       1,
					display:    'flex',
					alignItems: 'center',
					gap:        9,
					padding:    '7px 8px 7px 12px',
					background: active ? 'rgba(255,255,255,0.1)' : 'none',
					border:     'none',
					borderLeft: `3px solid ${ active ? '#5B9CF6' : 'transparent' }`,
					color:      active ? '#fff' : 'rgba(255,255,255,0.55)',
					fontSize:   12,
					fontWeight: active ? 600 : 400,
					cursor:     'pointer',
					textAlign:  'left',
					lineHeight: 1,
					minWidth:   0,
				} }
			>
				{ step ? (
					<span style={ {
						width:          15,
						height:         15,
						borderRadius:   '50%',
						flexShrink:     0,
						background:     done ? '#22c55e' : active ? '#5B9CF6' : 'rgba(255,255,255,0.12)',
						color:          '#fff',
						fontSize:       8,
						fontWeight:     700,
						display:        'flex',
						alignItems:     'center',
						justifyContent: 'center',
					} }>
						{ done ? '✓' : step }
					</span>
				) : (
					<Icon />
				) }
				<span style={ { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>{ label }</span>
			</button>
			{ tooltip && (
				<div
					onMouseEnter={ showTip }
					onMouseLeave={ hideTip }
					onFocus={ showTip }
					onBlur={ hideTip }
					tabIndex={ 0 }
					role="button"
					aria-label={ `${ __( 'About', 'trailproof' ) } ${ label }` }
					onClick={ ( e ) => e.stopPropagation() }
					onKeyDown={ ( e ) => e.key === 'Enter' && e.stopPropagation() }
					style={ {
						display:        'flex',
						alignItems:     'center',
						justifyContent: 'center',
						width:          26,
						flexShrink:     0,
						color:          'rgba(255,255,255,0.25)',
						cursor:         'help',
						border:         'none',
						background:     'none',
						padding:        0,
						outline:        'none',
					} }
				>
					<IconInfo />
					{ tipPos && (
						<div
							role="tooltip"
							style={ {
								position:      'fixed',
								left:          tipPos.x,
								top:           tipPos.y,
								transform:     'translateY(-50%)',
								background:    '#1A2742',
								border:        '1px solid rgba(255,255,255,0.15)',
								borderRadius:  6,
								padding:       '9px 13px',
								fontSize:      11,
								lineHeight:    1.6,
								color:         'rgba(255,255,255,0.85)',
								maxWidth:      240,
								zIndex:        99999,
								boxShadow:     '0 4px 20px rgba(0,0,0,0.45)',
								pointerEvents: 'none',
							} }
						>
							{ tooltip }
						</div>
					) }
				</div>
			) }
		</div>
	);
}

function SectionLabel( { children } ) {
	return (
		<div style={ {
			padding:       '8px 15px 2px',
			fontSize:      9,
			fontWeight:    700,
			color:         'rgba(255,255,255,0.28)',
			letterSpacing: '0.1em',
			textTransform: 'uppercase',
		} }>
			{ children }
		</div>
	);
}

function NavDivider() {
	return <div style={ { height: 1, background: 'rgba(255,255,255,0.07)', margin: '5px 0' } } />;
}

function Sidebar( { page, navigate, status } ) {
	const top        = NAV.filter( n => n.section === 'top' );
	const workflow   = NAV.filter( n => n.section === 'workflow' );
	const tools      = NAV.filter( n => n.section === 'tools' );
	const prevention = NAV.filter( n => n.section === 'prevention' );
	const settings   = NAV.filter( n => n.section === 'settings' );

	const renderItems = ( items ) => items.map( ( { id, label, Icon, step, tooltip } ) => (
		<NavButton key={ id } id={ id } label={ label } Icon={ Icon } step={ step }
			active={ page === id } done={ isStepDone( id, status ) } navigate={ navigate }
			tooltip={ tooltip } />
	) );

	return (
		<aside style={ {
			width:         220,
			background:    '#1B2B4B',
			flexShrink:    0,
			display:       'flex',
			flexDirection: 'column',
			boxShadow:     '2px 0 8px rgba(0,0,0,0.15)',
			zIndex:        1,
			overflowY:     'auto',
		} }>
			{/* Brand */}
			{ ! whiteLabel && (
				<div style={ { padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 } }>
					<div style={ { fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' } }>Trailproof</div>
					<div style={ { fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' } }>Accessibility</div>
				</div>
			) }

			<nav aria-label={ __( 'Trailproof navigation', 'trailproof' ) } style={ { flex: 1, paddingTop: 4, paddingBottom: 4 } }>

				{ renderItems( top ) }

				<NavDivider />
				<SectionLabel>{ __( 'Workflow', 'trailproof' ) }</SectionLabel>
				{ renderItems( workflow ) }

				<NavDivider />
				<SectionLabel>{ __( 'Tools', 'trailproof' ) }</SectionLabel>
				{ renderItems( tools ) }

				<NavDivider />
				<SectionLabel>{ __( 'Prevention', 'trailproof' ) }</SectionLabel>
				{ renderItems( prevention ) }

				<NavDivider />
				<SectionLabel>{ __( 'Settings', 'trailproof' ) }</SectionLabel>
				{ renderItems( settings ) }

			</nav>

			<SidebarFooter status={ status } />
		</aside>
	);
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar( { page, status, navigate } ) {
	const current  = NAV.find( n => n.id === page );
	const daysSince = status?.last_scan_at
		? Math.floor( ( Date.now() - new Date( status.last_scan_at ).getTime() ) / 86400000 )
		: null;

	return (
		<div style={ {
			background:    '#fff',
			borderBottom:  '1px solid #E2E8F0',
			padding:       '0 24px',
			height:        50,
			display:       'flex',
			alignItems:    'center',
			justifyContent:'space-between',
			flexShrink:    0,
			gap:           16,
		} }>
			<h1 style={ { margin: 0, fontSize: 14, fontWeight: 600, color: '#1A2742', letterSpacing: '-0.1px' } }>
				{ current?.label ?? 'Overview' }
			</h1>

			{ status?.last_scan_at && (
				<div style={ { display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748b' } }>
					<span>
						{ __( 'Last scan:', 'trailproof' ) }{ ' ' }
						{ daysSince === 0 ? __( 'today', 'trailproof' )
						: daysSince === 1 ? __( 'yesterday', 'trailproof' )
						: `${ daysSince } ${ __( 'days ago', 'trailproof' ) }` }
					</span>
					<button
						className="button button-small"
						onClick={ () => navigate( 'scan' ) }
						style={ { fontSize: 11 } }
					>
						{ __( 'Scan again', 'trailproof' ) }
					</button>
				</div>
			) }
		</div>
	);
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
	const [ page, setPage ]             = useState( getInitialPage );
	const [ siteStatus, setSiteStatus ] = useState( null );

	const refreshStatus = useCallback( () => {
		apiFetch( { path: '/trailproof/v1/dashboard' } )
			.then( setSiteStatus )
			.catch( () => {} );
	}, [] );

	useEffect( () => { refreshStatus(); }, [ refreshStatus ] );

	const Page = PAGES[ page ] ?? Dashboard;

	return (
		<div style={ {
			display:    'flex',
			minHeight:  'calc(100vh - 32px)',
			margin:     '-10px -20px -20px',
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
			fontSize:   13,
			lineHeight: 1.5,
		} }>
			<Sidebar page={ page } navigate={ setPage } status={ siteStatus } />

			<div style={ { flex: 1, display: 'flex', flexDirection: 'column', background: '#F4F6F9', minWidth: 0, overflow: 'hidden' } }>
				<TopBar page={ page } status={ siteStatus } navigate={ setPage } />

				<div style={ { flex: 1, padding: '24px', overflowY: 'auto', overflowX: 'hidden' } }>
					<Page navigate={ setPage } siteStatus={ siteStatus } refreshStatus={ refreshStatus } />
				</div>
			</div>
		</div>
	);
}
