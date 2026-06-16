import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import HealthGauge from '../components/HealthGauge';
import NextAction  from '../components/NextAction';

// ─── Design tokens ────────────────────────────────────────────────────────────

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

const SEVERITY_COLOR = {
	critical: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
	serious:  { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
	moderate: { bg: '#FEFCE8', text: '#A16207', dot: '#EAB308' },
	minor:    { bg: '#F8FAFC', text: '#475569', dot: '#94A3B8' },
};

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge( { severity } ) {
	const m = SEVERITY_COLOR[ severity ] ?? SEVERITY_COLOR.minor;
	return (
		<span style={ { display: 'inline-flex', alignItems: 'center', gap: 5, background: m.bg, color: m.text, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' } }>
			<span style={ { width: 6, height: 6, borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: 0 } } />
			{ severity }
		</span>
	);
}

// ─── Issue table ──────────────────────────────────────────────────────────────

function IssueTable( { groups, navigate, uniqueOpen } ) {
	if ( ! groups || groups.length === 0 ) {
		return (
			<div style={ { textAlign: 'center', padding: '32px 16px', color: '#16A34A' } }>
				<div style={ { fontSize: 32, marginBottom: 8 } } aria-hidden="true">✓</div>
				<div style={ { fontWeight: 600, fontSize: 14 } }>{ __( 'No open improvements', 'trailproof' ) }</div>
				<div style={ { fontSize: 12, color: '#64748B', marginTop: 4 } }>{ __( 'Run a scan to check for new issues.', 'trailproof' ) }</div>
			</div>
		);
	}

	const BUCKET_PILL = {
		A: { bg: '#F0FDF4', color: '#16A34A', label: __( 'Quick fix',  'trailproof' ) },
		B: { bg: '#FFFBEB', color: '#D97706', label: __( 'Needs input','trailproof' ) },
		C: { bg: '#F5F3FF', color: '#7C3AED', label: __( 'Manual',     'trailproof' ) },
	};

	return (
		<>
			<table style={ { width: '100%', borderCollapse: 'collapse', fontSize: 12 } }>
				<thead>
					<tr style={ { borderBottom: '2px solid #E8ECF2' } }>
						{ [ __( 'Impact', 'trailproof' ), __( 'Improvement', 'trailproof' ), __( 'Type', 'trailproof' ), __( 'Pages', 'trailproof' ) ].map( h => (
							<th key={ h } style={ { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' } }>{ h }</th>
						) ) }
					</tr>
				</thead>
				<tbody>
					{ groups.map( ( g ) => {
						const pill = BUCKET_PILL[ g.bucket ] ?? BUCKET_PILL.C;
						return (
							<tr
								key={ g.rule_id }
								style={ { borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: 'transparent' } }
								onClick={ () => navigate( g.bucket === 'B' ? 'decisions' : g.bucket === 'C' ? 'checklist' : 'worklist' ) }
								onMouseEnter={ e => e.currentTarget.style.background = '#F8FAFC' }
								onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
							>
								<td style={ { padding: '10px 12px', width: 90 } }>
									<SeverityBadge severity={ g.max_severity } />
								</td>
								<td style={ { padding: '10px 12px', color: '#1A2742', fontWeight: 500 } }>
									{ g.description || g.rule_id }
								</td>
								<td style={ { padding: '10px 12px', width: 110 } }>
									<span style={ { background: pill.bg, color: pill.color, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 } }>
										{ pill.label }
									</span>
								</td>
								<td style={ { padding: '10px 12px', color: '#64748B', width: 70 } }>
									{ g.instance_count }
								</td>
							</tr>
						);
					} ) }
				</tbody>
			</table>
			{ uniqueOpen > groups.length && (
				<div style={ { padding: '10px 12px', fontSize: 12, color: '#2563EB', borderTop: '1px solid #F1F5F9' } }>
					<button className="button-link" style={ { color: '#2563EB', fontSize: 12 } } onClick={ () => navigate( 'worklist' ) }>
						{ __( 'View all', 'trailproof' ) } { uniqueOpen } { __( 'improvements →', 'trailproof' ) }
					</button>
				</div>
			) }
		</>
	);
}

// ─── Activity feed ────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
	decision_apply:      { icon: '✓', verb: __( 'Fixed',              'trailproof' ), color: '#16A34A' },
	decision_na:         { icon: '—', verb: __( 'Marked N/A',         'trailproof' ), color: '#64748B' },
	decision_defer:      { icon: '⏸', verb: __( 'Deferred',           'trailproof' ), color: '#D97706' },
	correction_reverted: { icon: '↩', verb: __( 'Fix undone',         'trailproof' ), color: '#DC2626' },
	correction_enabled:  { icon: '⚡', verb: __( 'Fix applied',       'trailproof' ), color: '#2563EB' },
	checklist_pass:      { icon: '✓', verb: __( 'Verified',           'trailproof' ), color: '#16A34A' },
	checklist_fail:      { icon: '⚠', verb: __( 'Issue noted',        'trailproof' ), color: '#D97706' },
	checklist_na:        { icon: '—', verb: __( 'Marked N/A',         'trailproof' ), color: '#64748B' },
};

const RULE_BENEFIT = {
	'document-title':    __( 'Helps browsers and screen readers identify each page.', 'trailproof' ),
	'image-alt':         __( 'Allows screen readers to describe images to users.', 'trailproof' ),
	'label':             __( 'Ensures form fields are accessible to assistive technology.', 'trailproof' ),
	'link-name':         __( 'Makes link purpose clear to screen reader users.', 'trailproof' ),
	'color-contrast':    __( 'Improves readability for users with low vision.', 'trailproof' ),
	'html-has-lang':     __( 'Helps screen readers use the correct language for the page.', 'trailproof' ),
	'landmark-one-main': __( 'Allows keyboard users to skip to the main content area.', 'trailproof' ),
	'bypass':            __( 'Enables keyboard users to skip repetitive navigation.', 'trailproof' ),
	'heading-order':     __( 'Ensures screen readers can navigate page structure logically.', 'trailproof' ),
};

function ActivityFeed( { entries } ) {
	if ( ! entries?.length ) {
		return <p style={ { color: '#94A3B8', fontSize: 13, margin: 0 } }>{ __( 'No activity yet.', 'trailproof' ) }</p>;
	}
	return (
		<div>
			{ entries.map( ( e, i ) => {
				const cfg     = ACTION_CONFIG[ e.action ] ?? { icon: '•', verb: e.action, color: '#64748B' };
				const desc    = e.description ?? e.rule_id ?? '';
				const benefit = RULE_BENEFIT[ e.rule_id ] ?? null;
				const time    = e.ts
					? new Date( e.ts ).toLocaleString( undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } )
					: '';
				return (
					<div key={ e.id ?? i } style={ { padding: '9px 0', borderBottom: '1px solid #F1F5F9' } }>
						<div style={ { display: 'flex', alignItems: 'baseline', gap: 6 } }>
							<span style={ { fontSize: 12, color: cfg.color, fontWeight: 700, flexShrink: 0 } }>
								{ cfg.icon } { cfg.verb }
							</span>
							<span style={ { fontSize: 12, color: '#1A2742', flex: 1, lineHeight: 1.4 } }>{ desc }</span>
						</div>
						{ benefit && (
							<div style={ { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4 } }>
								{ benefit }
							</div>
						) }
						<div style={ { fontSize: 11, color: '#94A3B8', marginTop: 2 } }>{ time }</div>
					</div>
				);
			} ) }
		</div>
	);
}

// ─── Journey checklist ────────────────────────────────────────────────────────

function JourneyChecklist( { status, navigate } ) {
	if ( ! status ) return null;

	const { last_scan_at, unique_by_bucket, health_score, has_statement } = status;
	const openA   = unique_by_bucket?.A ?? 0;
	const openB   = unique_by_bucket?.B ?? 0;
	const scoreC  = health_score?.components?.c?.score ?? 0;

	const steps = [
		{
			label: __( 'Scan your website',                   'trailproof' ),
			done:  !! last_scan_at,
			tab:   'scan',
		},
		{
			label: __( 'Apply quick fixes',                   'trailproof' ),
			done:  !! last_scan_at && openA === 0,
			tab:   'worklist',
		},
		{
			label: __( 'Review decisions',                    'trailproof' ),
			done:  !! last_scan_at && openB === 0,
			tab:   'decisions',
		},
		{
			label: __( 'Complete manual checks',              'trailproof' ),
			done:  !! last_scan_at && scoreC === 100,
			tab:   'checklist',
		},
		{
			label: __( 'Generate accessibility statement',    'trailproof' ),
			done:  !! has_statement,
			tab:   'statement',
		},
	];

	const doneCount = steps.filter( s => s.done ).length;

	return (
		<div style={ { ...card, padding: '14px 16px' } }>
			<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 } }>
				{ __( 'Accessibility checklist', 'trailproof' ) }
			</div>

			<div style={ { display: 'flex', flexDirection: 'column', gap: 6 } }>
				{ steps.map( ( step, i ) => (
					<button
						key={ i }
						onClick={ () => navigate( step.tab ) }
						style={ {
							display:    'flex',
							alignItems: 'center',
							gap:        10,
							background: 'none',
							border:     'none',
							cursor:     'pointer',
							padding:    '2px 0',
							textAlign:  'left',
							width:      '100%',
						} }
					>
						<div style={ {
							width:        20,
							height:       20,
							borderRadius: '50%',
							flexShrink:   0,
							background:   step.done ? '#DCFCE7' : '#F1F5F9',
							border:       `2px solid ${ step.done ? '#16A34A' : '#CBD5E1' }`,
							display:      'flex',
							alignItems:   'center',
							justifyContent: 'center',
							fontSize:     10,
							color:        step.done ? '#16A34A' : '#CBD5E1',
							fontWeight:   700,
						} }
							aria-hidden="true"
						>
							{ step.done ? '✓' : '' }
						</div>
						<span style={ {
							fontSize:   12,
							color:      step.done ? '#94A3B8' : '#1A2742',
							fontWeight: step.done ? 400 : 500,
						} }>
							{ step.label }
						</span>
					</button>
				) ) }
			</div>

			{ doneCount < steps.length && (
				<div style={ { marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#64748B' } }>
					{ doneCount }{ __( ' of ', 'trailproof' ) }{ steps.length }{ __( ' steps completed', 'trailproof' ) }
				</div>
			) }
			{ doneCount === steps.length && (
				<div style={ { marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#16A34A', fontWeight: 600 } }>
					{ __( 'All steps completed — great work!', 'trailproof' ) }
				</div>
			) }
		</div>
	);
}

// ─── Premium upgrade card ─────────────────────────────────────────────────────

function PremiumCard() {
	const features = [
		__( 'Bulk remediation',    'trailproof' ),
		__( 'Client reports',      'trailproof' ),
		__( 'Client portal',       'trailproof' ),
		__( 'Advanced monitoring', 'trailproof' ),
	];

	return (
		<div style={ { ...card, padding: '14px 16px', background: '#F8FAFC', borderColor: '#E2E8F0' } }>
			<div style={ { fontSize: 11, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }>
				Trailproof Premium
			</div>
			<p style={ { fontSize: 12, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 } }>
				{ __( 'Unlock advanced features for growing accessibility programs.', 'trailproof' ) }
			</p>
			<div style={ { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } }>
				{ features.map( ( f, i ) => (
					<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' } }>
						<span style={ { color: '#16A34A', fontWeight: 700, fontSize: 11, flexShrink: 0 } } aria-hidden="true">✓</span>
						{ f }
					</div>
				) ) }
			</div>
			<button
				className="button button-secondary"
				style={ { fontSize: 11 } }
				onClick={ () => window.open( window.trailproofData?.upgradeUrl ?? '#', '_blank' ) }
			>
				{ __( 'Upgrade to Premium', 'trailproof' ) }
			</button>
		</div>
	);
}

// ─── First-run welcome ────────────────────────────────────────────────────────

function FirstRunWelcome( { navigate } ) {
	return (
		<div style={ { maxWidth: 620 } }>
			<div style={ { ...card, padding: '32px 36px', borderLeft: '4px solid #2563EB' } }>
				<div style={ { fontSize: 13, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 } }>
					{ __( 'Getting started', 'trailproof' ) }
				</div>
				<h2 style={ { margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Welcome to Trailproof', 'trailproof' ) }
				</h2>
				<p style={ { color: '#475569', fontSize: 14, marginBottom: 28, lineHeight: 1.7 } }>
					{ __( "Trailproof finds accessibility problems on your website and walks you through fixing them. At the end you'll have a dated record of every change — useful for clients, auditors, or compliance.", 'trailproof' ) }
				</p>

				<div style={ { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 } }>
					{ [
						{ n: 1, title: __( 'Scan your pages',        'trailproof' ), desc: __( 'Trailproof checks every page and lists what needs fixing.',                                          'trailproof' ) },
						{ n: 2, title: __( 'Apply quick fixes',      'trailproof' ), desc: __( "Many problems have a safe automatic fix. Approve them in one click — always undoable.",              'trailproof' ) },
						{ n: 3, title: __( 'Answer a few questions', 'trailproof' ), desc: __( "Some fixes need context only you have, like what an image shows.",                                   'trailproof' ) },
						{ n: 4, title: __( 'Complete a checklist',   'trailproof' ), desc: __( "A short list of things a machine can't check — like whether videos have captions.",                  'trailproof' ) },
						{ n: 5, title: __( 'Get your statement',     'trailproof' ), desc: __( "A dated document showing your remediation effort — required by most compliance frameworks.",          'trailproof' ) },
					].map( ( { n, title, desc } ) => (
						<div key={ n } style={ { display: 'flex', gap: 14, alignItems: 'flex-start' } }>
							<div style={ { width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 } }>{ n }</div>
							<div>
								<strong style={ { fontSize: 13, color: '#1A2742', display: 'block', marginBottom: 2 } }>{ title }</strong>
								<span style={ { fontSize: 13, color: '#64748B' } }>{ desc }</span>
							</div>
						</div>
					) ) }
				</div>

				<button className="button button-primary button-large" onClick={ () => navigate( 'scan' ) } style={ { fontSize: 13 } }>
					{ __( 'Scan my site now →', 'trailproof' ) }
				</button>
			</div>
		</div>
	);
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function Dashboard( { navigate, siteStatus, refreshStatus } ) {
	const [ data, setData ]       = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ]     = useState( null );

	useEffect( () => {
		apiFetch( { path: '/trailproof/v1/dashboard' } )
			.then( setData )
			.catch( err => setError( err.message ?? __( 'Failed to load.', 'trailproof' ) ) )
			.finally( () => setLoading( false ) );
	}, [] );

	if ( loading ) return (
		<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
			{ __( 'Loading…', 'trailproof' ) }
		</div>
	);
	if ( error ) return <p style={ { color: '#DC2626' } }>{ error }</p>;

	const { unique_by_bucket, unique_total, unique_addressed, unique_open, top_grouped, last_scan_at, recent_activity, health_score } = data;
	const hasScans = !! last_scan_at;
	const status   = siteStatus ?? data;

	// Build the hero headline based on open count
	const heroHeadline = ! unique_open
		? __( 'No open accessibility issues — great work!', 'trailproof' )
		: unique_open === 1
			? __( 'Your website has 1 accessibility improvement available', 'trailproof' )
			: `${ __( 'Your website has', 'trailproof' ) } ${ unique_open } ${ __( 'accessibility improvements available', 'trailproof' ) }`;

	return (
		<div style={ { maxWidth: 900 } }>
			{ ! hasScans ? (
				<FirstRunWelcome navigate={ navigate } />
			) : (
				<>
					{/* Hero heading */}
					<div style={ { marginBottom: 16 } }>
						<div style={ { fontSize: 11, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
							{ __( 'Accessibility Health Check', 'trailproof' ) }
						</div>
						<h2 style={ { margin: 0, fontSize: 18, fontWeight: 700, color: '#1A2742', lineHeight: 1.3 } }>
							{ heroHeadline }
						</h2>
					</div>

					{/* Health score gauge */}
					<HealthGauge healthScore={ health_score } />

					{/* Next action */}
					<NextAction status={ status } navigate={ navigate } />

					{/* Two-column: improvements + right sidebar */}
					<div style={ { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' } }>

						{/* Accessibility improvements table */}
						<div style={ { ...card, overflow: 'hidden' } }>
							<div style={ { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
								<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em' } }>
									{ __( 'Accessibility improvements', 'trailproof' ) }
								</div>
								{ unique_open > 0 && (
									<span style={ { fontSize: 11, background: '#FFF7ED', color: '#C2410C', borderRadius: 99, padding: '2px 8px', fontWeight: 600 } }>
										{ unique_open } { __( 'to address', 'trailproof' ) }
									</span>
								) }
							</div>
							<IssueTable groups={ top_grouped } navigate={ navigate } uniqueOpen={ unique_open } />
						</div>

						{/* Right sidebar */}
						<div style={ { display: 'flex', flexDirection: 'column', gap: 20 } }>

							{/* Journey checklist */}
							<JourneyChecklist status={ status } navigate={ navigate } />

							{/* Recent changes */}
							<div style={ { ...card, padding: '14px 16px' } }>
								<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 } }>
									{ __( 'Recent changes', 'trailproof' ) }
								</div>
								<ActivityFeed entries={ recent_activity } />
							</div>

							{/* Premium upgrade */}
							<PremiumCard />
						</div>
					</div>
				</>
			) }
		</div>
	);
}
