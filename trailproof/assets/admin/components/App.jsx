import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import Dashboard   from '../pages/Dashboard';
import Scan        from '../pages/Scan';
import Worklist    from '../pages/Worklist';
import DecisionQueue from '../pages/DecisionQueue';
import Checklist   from '../pages/Checklist';
import Statement   from '../pages/Statement';
import Reports     from '../pages/Reports';
import ClientPortal from '../pages/ClientPortal';

// ─── SVG icons ───────────────────────────────────────────────────────────────

const I = { strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconOverview  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="9" y="1" width="5" height="5" rx="1"/><rect x="1" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
const IconScan      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>;
const IconFix       = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><path d="M8.5 1.5L2.5 8.5H7L6 13.5L12 6.5H7.5L8.5 1.5Z"/></svg>;
const IconDecisions = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><line x1="7.5" y1="1" x2="7.5" y2="14"/><path d="M2 4.5l4 3-4 3"/><path d="M13 7.5l-4 3 4 3"/></svg>;
const IconChecklist = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><polyline points="2,4 4,6 8,2"/><line x1="11" y1="4" x2="13" y2="4"/><polyline points="2,9 4,11 8,7"/><line x1="11" y1="9" x2="13" y2="9"/></svg>;
const IconStatement = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><path d="M3 1h7l4 4v9H3V1z"/><polyline points="10,1 10,5 14,5"/><line x1="5" y1="7" x2="10" y2="7"/><line x1="5" y1="10" x2="10" y2="10"/></svg>;
const IconReports   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><rect x="1" y="4" width="13" height="10" rx="1"/><polyline points="4,4 4,1 11,1 11,4"/><line x1="5" y1="9" x2="10" y2="9"/></svg>;
const IconPortal    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" {...I}><circle cx="7.5" cy="5" r="3"/><path d="M1 14c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/></svg>;
const IconCheck     = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#22c55e" fillOpacity=".2"/><polyline points="2.5,5 4,6.5 7.5,3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV = [
	{ id: 'dashboard',    label: __( 'Overview',       'trailproof' ), Icon: IconOverview  },
	{ id: 'scan',         label: __( 'Scan Site',      'trailproof' ), Icon: IconScan,      step: 1 },
	{ id: 'worklist',     label: __( 'Fix Issues',     'trailproof' ), Icon: IconFix,       step: 2 },
	{ id: 'decisions',    label: __( 'Decisions',      'trailproof' ), Icon: IconDecisions, step: 3 },
	{ id: 'checklist',    label: __( 'Checklist',      'trailproof' ), Icon: IconChecklist, step: 4 },
	{ id: 'statement',    label: __( 'Statement',      'trailproof' ), Icon: IconStatement, step: 5 },
	{ id: 'reports',      label: __( 'Reports',        'trailproof' ), Icon: IconReports,   step: 6 },
	{ id: 'clientPortal', label: __( 'Client Portal',  'trailproof' ), Icon: IconPortal    },
];

const PAGES = {
	dashboard:    Dashboard,
	scan:         Scan,
	worklist:     Worklist,
	decisions:    DecisionQueue,
	checklist:    Checklist,
	statement:    Statement,
	reports:      Reports,
	clientPortal: ClientPortal,
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

function NavButton( { id, label, Icon, step, active, done, navigate } ) {
	return (
		<button
			onClick={ () => navigate( id ) }
			aria-current={ active ? 'page' : undefined }
			style={ {
				display:    'flex',
				alignItems: 'center',
				gap:        9,
				width:      '100%',
				padding:    '8px 14px 8px 12px',
				background: active ? 'rgba(255,255,255,0.1)' : 'none',
				border:     'none',
				borderLeft: `3px solid ${ active ? '#5B9CF6' : 'transparent' }`,
				color:      active ? '#fff' : 'rgba(255,255,255,0.55)',
				fontSize:   13,
				fontWeight: active ? 600 : 400,
				cursor:     'pointer',
				textAlign:  'left',
				lineHeight: 1,
			} }
		>
			{ step ? (
				<span style={ {
					width:          16,
					height:         16,
					borderRadius:   '50%',
					flexShrink:     0,
					background:     done ? '#22c55e' : active ? '#5B9CF6' : 'rgba(255,255,255,0.12)',
					color:          '#fff',
					fontSize:       9,
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
			<span style={ { flex: 1 } }>{ label }</span>
		</button>
	);
}

function SectionLabel( { children } ) {
	return (
		<div style={ {
			padding:       '10px 15px 3px',
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
	return <div style={ { height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0' } } />;
}

function Sidebar( { page, navigate, status } ) {
	const workflow    = NAV.filter( n => n.step );
	const utilBefore  = NAV.filter( n => ! n.step && n.id !== 'clientPortal' );
	const utilAfter   = NAV.filter( n => n.id === 'clientPortal' );

	return (
		<aside style={ {
			width:         220,
			background:    '#1B2B4B',
			flexShrink:    0,
			display:       'flex',
			flexDirection: 'column',
			boxShadow:     '2px 0 8px rgba(0,0,0,0.15)',
			zIndex:        1,
		} }>
			{/* Brand */}
			{ ! whiteLabel && (
				<div style={ { padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' } }>
					<div style={ { fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' } }>Trailproof</div>
					<div style={ { fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' } }>Accessibility</div>
				</div>
			) }

			<nav aria-label={ __( 'Trailproof navigation', 'trailproof' ) } style={ { flex: 1, paddingTop: 4, paddingBottom: 4 } }>

				{/* Utility: Overview */}
				{ utilBefore.map( ( { id, label, Icon } ) => (
					<NavButton key={ id } id={ id } label={ label } Icon={ Icon }
						active={ page === id } done={ isStepDone( id, status ) } navigate={ navigate } />
				) ) }

				<NavDivider />
				<SectionLabel>{ __( 'Workflow', 'trailproof' ) }</SectionLabel>

				{/* Numbered workflow steps */}
				{ workflow.map( ( { id, label, Icon, step } ) => (
					<NavButton key={ id } id={ id } label={ label } Icon={ Icon } step={ step }
						active={ page === id } done={ isStepDone( id, status ) } navigate={ navigate } />
				) ) }

				<NavDivider />

				{/* Utility: Client Portal */}
				{ utilAfter.map( ( { id, label, Icon } ) => (
					<NavButton key={ id } id={ id } label={ label } Icon={ Icon }
						active={ page === id } done={ isStepDone( id, status ) } navigate={ navigate } />
				) ) }

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
