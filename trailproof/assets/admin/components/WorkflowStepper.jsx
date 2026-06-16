import { __ } from '@wordpress/i18n';

// Tab-to-step mapping
const TAB_STEP = {
	scan:       1,
	worklist:   2,
	decisions:  3,
	checklist:  4,
	statement:  5,
	reports:    6,
};

const STEPS = [
	{ id: 1, tab: 'scan',      icon: '🔍', short: __( 'Scan',       'trailproof' ), full: __( 'Scan pages for issues',      'trailproof' ) },
	{ id: 2, tab: 'worklist',  icon: '⚡', short: __( 'Fix Issues', 'trailproof' ), full: __( 'Apply safe automatic fixes', 'trailproof' ) },
	{ id: 3, tab: 'decisions', icon: '⚖️', short: __( 'Decisions',  'trailproof' ), full: __( 'Review judgment-call issues','trailproof' ) },
	{ id: 4, tab: 'checklist', icon: '📋', short: __( 'Checklist',  'trailproof' ), full: __( 'Manual verification checks', 'trailproof' ) },
	{ id: 5, tab: 'statement', icon: '📄', short: __( 'Statement',  'trailproof' ), full: __( 'Accessibility statement',    'trailproof' ) },
	{ id: 6, tab: 'reports',   icon: '📦', short: __( 'Reports',    'trailproof' ), full: __( 'Export evidence bundle',     'trailproof' ) },
];

function stepState( stepId, currentTab, status ) {
	if ( ! status ) return 'upcoming';

	const {
		last_scan_at,
		unique_by_bucket,
		health_score,
		has_statement,
		has_bundle,
	} = status;

	const done = {
		1: !! last_scan_at,
		2: last_scan_at && ( unique_by_bucket?.A ?? 1 ) === 0,
		3: last_scan_at && ( unique_by_bucket?.B ?? 1 ) === 0,
		4: last_scan_at && ( health_score?.components?.c?.score ?? 0 ) === 100,
		5: !! has_statement,
		6: !! has_bundle,
	};

	if ( done[ stepId ] ) return 'done';
	if ( TAB_STEP[ currentTab ] === stepId ) return 'active';
	return 'upcoming';
}

function Step( { step, state, navigate, isLast } ) {
	const isDone     = state === 'done';
	const isActive   = state === 'active';
	const isUpcoming = state === 'upcoming';

	const dotColor  = isDone ? '#1a7f37' : isActive ? '#2271b1' : '#c3c4c7';
	const textColor = isDone ? '#1a7f37' : isActive ? '#2271b1' : '#8c959f';
	const dotBg     = isDone ? '#dafbe1' : isActive ? '#e8f0fb' : '#f6f8fa';
	const dotBorder = isDone ? '#1a7f37' : isActive ? '#2271b1' : '#c3c4c7';

	return (
		<>
			<button
				onClick={ () => navigate( step.tab ) }
				aria-current={ isActive ? 'step' : undefined }
				title={ step.full }
				style={ {
					display:    'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap:        4,
					background: 'none',
					border:     'none',
					cursor:     'pointer',
					padding:    '4px 6px',
					minWidth:   64,
				} }
			>
				{/* Dot */}
				<div style={ {
					width:        28,
					height:       28,
					borderRadius: '50%',
					background:   dotBg,
					border:       `2px solid ${ dotBorder }`,
					display:      'flex',
					alignItems:   'center',
					justifyContent: 'center',
					fontSize:     12,
					fontWeight:   700,
					color:        dotColor,
				} }
					aria-hidden="true"
				>
					{ isDone ? '✓' : step.icon }
				</div>

				{/* Label */}
				<span style={ {
					fontSize:   11,
					fontWeight: isActive ? 600 : 400,
					color:      textColor,
					whiteSpace: 'nowrap',
				} }>
					{ step.short }
				</span>
			</button>

			{/* Connector line (not after last step) */}
			{ ! isLast && (
				<div
					aria-hidden="true"
					style={ {
						flex:       1,
						height:     2,
						background: isDone ? '#1a7f37' : '#e0e0e0',
						minWidth:   12,
						alignSelf:  'flex-start',
						marginTop:  13, // align with dot center
					} }
				/>
			) }
		</>
	);
}

export default function WorkflowStepper( { currentTab, navigate, status } ) {
	// Don't render on dashboard — the NextAction card already guides the user
	if ( currentTab === 'dashboard' ) return null;

	return (
		<nav
			aria-label={ __( 'Accessibility workflow', 'trailproof' ) }
			style={ {
				display:      'flex',
				alignItems:   'center',
				background:   '#f6f8fa',
				border:       '1px solid #e0e0e0',
				borderRadius: 6,
				padding:      '10px 16px',
				marginBottom: 20,
				flexWrap:     'nowrap',
				overflowX:    'auto',
			} }
		>
			{ STEPS.map( ( step, i ) => (
				<Step
					key={ step.id }
					step={ step }
					state={ stepState( step.id, currentTab, status ) }
					navigate={ navigate }
					isLast={ i === STEPS.length - 1 }
				/>
			) ) }
		</nav>
	);
}
