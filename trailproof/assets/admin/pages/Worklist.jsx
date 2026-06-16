import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SelectControl, Button, Modal, TextControl, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import StatusBadge, { groupStatus } from '../components/StatusBadge';
import DecisionScreen from '../components/DecisionScreen';
import IssueDetailPanel from '../components/IssueDetailPanel';

// ─── Quick-fix banner ─────────────────────────────────────────────────────────

function WorklistQuickFixBanner( { groups, onApplyAll, saving } ) {
	const fixable = groups.filter( g => g.bucket === 'A' && g.open_count > 0 && ! RULES_NEEDING_INPUT_CHECK[ g.rule_id ] );
	if ( fixable.length === 0 ) return null;

	const needsInputGroups = groups.filter( g => g.bucket === 'A' && g.open_count > 0 && RULES_NEEDING_INPUT_CHECK[ g.rule_id ] );

	return (
		<div style={ {
			background:   '#fff',
			border:       '1px solid #E8ECF2',
			borderLeft:   '4px solid #16A34A',
			borderRadius: 8,
			boxShadow:    '0 1px 3px rgba(0,0,0,0.08)',
			padding:      '16px 20px',
			marginBottom: 20,
		} }>
			<div style={ { display: 'flex', alignItems: 'flex-start', gap: 14 } }>
				<span style={ { fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 } } aria-hidden="true">⚡</span>
				<div style={ { flex: 1 } }>
					<div style={ { fontSize: 14, fontWeight: 700, color: '#1A2742', marginBottom: 4 } }>
						{ fixable.length }{ ' ' }
						{ fixable.length === 1
							? __( 'accessibility improvement ready to apply automatically', 'trailproof' )
							: __( 'accessibility improvements ready to apply automatically', 'trailproof' )
						}
					</div>
					<p style={ { fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 } }>
						{ __( 'TrailProof can safely apply these without changing your saved content. All changes are reversible.', 'trailproof' ) }
					</p>
					<div style={ { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 } }>
						{ fixable.map( g => (
							<div key={ g.rule_id } style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' } }>
								<span style={ { color: '#16A34A', fontWeight: 700, fontSize: 11, flexShrink: 0 } } aria-hidden="true">✓</span>
								{ g.description || g.rule_id }
								<span style={ { fontSize: 11, color: '#94A3B8' } }>({ g.open_count } { g.open_count === 1 ? __( 'instance', 'trailproof' ) : __( 'instances', 'trailproof' ) })</span>
							</div>
						) ) }
						{ needsInputGroups.length > 0 && (
							<div style={ { fontSize: 11, color: '#94A3B8', marginTop: 4 } }>
								{ needsInputGroups.length }{ ' ' }
								{ __( 'improvement(s) need your input and are listed below.', 'trailproof' ) }
							</div>
						) }
					</div>
					<div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
						<button
							className="button button-primary"
							onClick={ onApplyAll }
							disabled={ saving }
							style={ { fontSize: 12 } }
						>
							{ saving ? __( 'Applying…', 'trailproof' ) : __( 'Apply all fixes', 'trailproof' ) }
						</button>
						<span style={ { fontSize: 11, color: '#94A3B8' } }>
							{ __( 'Each fix can be undone at any time', 'trailproof' ) }
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

// Rules that need human-authored text before a Bucket A fix can be applied
// (separate const for the banner check — avoids forward-reference issue)
const RULES_NEEDING_INPUT_CHECK = {
	'link-name':   true,
	'button-name': true,
	'label':       true,
	'frame-title': true,
};

// Rules that need human-authored text before a Bucket A fix can be applied
const RULES_NEEDING_INPUT = {
	'link-name':   { transform_type: 'rewrite_link_text', field: 'text',       label: 'Accessible link name',   help: 'A clear, descriptive name for this link.' },
	'button-name': { transform_type: 'rewrite_link_text', field: 'text',       label: 'Accessible button name', help: 'A clear, descriptive name for this button.' },
	'label':       { transform_type: 'associate_label',   field: 'label_text', label: 'Label text',              help: 'The label to associate with this form field.' },
	'frame-title': { transform_type: 'add_aria_label',    field: 'aria_label', label: 'Frame title',             help: 'A meaningful title for this iframe.' },
};

const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const SEVERITY_COLORS = { critical: '#cc1818', serious: '#d63638', moderate: '#dba617', minor: '#8c959f' };

function SeverityBar( { severity } ) {
	return (
		<span style={ { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: SEVERITY_COLORS[ severity ] ?? '#8c959f' } }>
			<span style={ { width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLORS[ severity ] ?? '#8c959f', display: 'inline-block' } } />
			{ severity }
		</span>
	);
}

// ---- Group row ----

function IssueGroupRow( { group, expanded, onToggle, onApplyGroup, onDecide, onApplyModal, navigate, saving, onOpenPanel } ) {
	const status         = groupStatus( group );
	const allAddressed   = group.open_count === 0;
	const instanceLabel  = group.instance_count === 1
		? __( '1 instance', 'trailproof' )
		: `${ group.instance_count } ${ __( 'instances', 'trailproof' ) }`;

	return (
		<tr
			style={ { background: expanded ? '#f6f8fa' : undefined, cursor: 'pointer' } }
			onClick={ () => onOpenPanel( group.example_id ) }
		>
			{/* Expand toggle — stopPropagation so it doesn't also open the panel */}
			<td
				style={ { width: 28, textAlign: 'center', color: '#646970', fontSize: 12, paddingRight: 0 } }
				onClick={ ( e ) => { e.stopPropagation(); onToggle(); } }
			>
				{ expanded ? '▼' : '▶' }
			</td>

			{/* Severity */}
			<td style={ { width: 90 } }><SeverityBar severity={ group.max_severity } /></td>

			{/* Description */}
			<td style={ { fontSize: 13, fontWeight: 500 } }>
				{ group.description || group.rule_id }
				<div style={ { fontSize: 11, color: '#8c959f', marginTop: 2, fontWeight: 400 } }>
					{ instanceLabel }
					{ group.open_count > 0 && group.instance_count > 1 && (
						<span style={ { color: '#cf222e' } }>{ ` (${ group.open_count } need attention)` }</span>
					) }
				</div>
			</td>

			{/* Bucket plain-English */}
			<td style={ { width: 130 } }>
				<BucketChip bucket={ group.bucket } />
			</td>

			{/* Status */}
			<td style={ { width: 130 } }>
				<StatusBadge status={ status } bucket={ group.bucket } size="sm" />
			</td>

			{/* Primary action */}
			<td style={ { width: 140 } } onClick={ ( e ) => e.stopPropagation() }>
				<GroupAction
					group={ group }
					status={ status }
					saving={ saving }
					onApplyGroup={ onApplyGroup }
					onDecide={ onDecide }
					onApplyModal={ onApplyModal }
					navigate={ navigate }
				/>
			</td>
		</tr>
	);
}

function BucketChip( { bucket } ) {
	const meta = {
		A: { label: 'Safe to fix now',      color: '#065f46', bg: '#d1fae5' },
		B: { label: 'Need your decision',    color: '#7d4e00', bg: '#fef3c7' },
		C: { label: 'Need a human check',    color: '#3730a3', bg: '#e0e7ff' },
	}[ bucket ] ?? { label: bucket, color: '#374151', bg: '#f3f4f6' };

	return (
		<span style={ { fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color, padding: '2px 7px', borderRadius: 3 } }>
			{ meta.label }
		</span>
	);
}

function GroupAction( { group, status, saving, onApplyGroup, onDecide, onApplyModal, navigate } ) {
	if ( group.open_count === 0 ) return null;

	if ( group.bucket === 'A' ) {
		const needsInput = !! RULES_NEEDING_INPUT[ group.rule_id ];
		return (
			<Button
				variant="primary"
				isSmall
				disabled={ saving }
				onClick={ () => needsInput ? onApplyModal( group ) : onApplyGroup( group ) }
				title={ needsInput
					? 'Enter a value to apply this improvement to all open instances'
					: 'Apply this improvement to all open instances on this site. You can undo anytime.'
				}
			>
				{ __( 'Apply improvement', 'trailproof' ) }
			</Button>
		);
	}

	if ( group.bucket === 'B' ) {
		return (
			<Button variant="secondary" isSmall onClick={ () => onDecide( group ) }>
				{ __( 'Review & decide', 'trailproof' ) }
			</Button>
		);
	}

	if ( group.bucket === 'C' ) {
		return (
			<Button variant="tertiary" isSmall onClick={ () => navigate( 'checklist' ) }>
				{ __( 'Open checklist →', 'trailproof' ) }
			</Button>
		);
	}

	return null;
}

// ---- Expanded instances sub-table ----

function InstanceSubTable( { rule_id, bucket, onApply, onDecide, onApplyModal, saving, onOpenPanel } ) {
	const [ instances, setInstances ] = useState( [] );
	const [ loading, setLoading ]     = useState( true );

	useEffect( () => {
		apiFetch( { path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( rule_id ) }&per_page=100` } )
			.then( setInstances )
			.catch( () => setInstances( [] ) )
			.finally( () => setLoading( false ) );
	}, [ rule_id ] );

	if ( loading ) return (
		<tr><td colSpan={ 6 } style={ { paddingLeft: 40, color: '#646970', fontSize: 12 } }>Loading instances…</td></tr>
	);

	return instances.map( ( issue ) => (
		<tr
			key={ issue.id }
			style={ { background: '#f6f8fa', fontSize: 12, cursor: 'pointer' } }
			onClick={ () => onOpenPanel( issue.id ) }
		>
			<td></td>
			<td></td>
			<td style={ { paddingLeft: 16, color: '#50575e' } }>
				<div style={ { fontSize: 12, color: '#1d2327', marginBottom: 2 } }>
					{ urlPath( issue.url ) }
				</div>
				<div style={ { fontSize: 10, color: '#c3c4c7', fontFamily: 'monospace' } } title={ issue.selector }>
					{ issue.selector?.length > 60 ? issue.selector.slice( 0, 60 ) + '…' : issue.selector }
				</div>
			</td>
			<td></td>
			<td>
				<StatusBadge status={ issue.status } bucket={ issue.bucket } size="sm" />
			</td>
			<td onClick={ ( e ) => e.stopPropagation() }>
				<InstanceAction
					issue={ issue }
					saving={ saving }
					onApply={ onApply }
					onDecide={ onDecide }
					onApplyModal={ onApplyModal }
				/>
			</td>
		</tr>
	) );
}

function InstanceAction( { issue, saving, onApply, onDecide, onApplyModal } ) {
	if ( ! [ 'open', 'regressed' ].includes( issue.status ) ) {
		return <span style={ { fontSize: 11, color: '#8c959f' } }>{ issue.status }</span>;
	}
	if ( issue.bucket === 'A' ) {
		const needsInput = !! RULES_NEEDING_INPUT[ issue.rule_id ];
		return (
			<Button
				variant="primary" isSmall disabled={ saving }
				onClick={ () => needsInput ? onApplyModal( issue ) : onApply( issue ) }
			>
				{ __( 'Apply improvement', 'trailproof' ) }
			</Button>
		);
	}
	if ( issue.bucket === 'B' ) {
		return (
			<Button variant="secondary" isSmall onClick={ () => onDecide( issue ) }>
				{ __( 'Review', 'trailproof' ) }
			</Button>
		);
	}
	return null;
}

// ---- Main Worklist ----

function urlPath( url ) {
	try { return url ? new URL( url ).pathname : '—'; } catch { return url || '—'; }
}

const BUCKET_OPTIONS = [
	{ label: __( 'All types', 'trailproof' ),               value: '' },
	{ label: __( 'Safe to fix now (A)', 'trailproof' ),     value: 'A' },
	{ label: __( 'Need your decision (B)', 'trailproof' ),  value: 'B' },
	{ label: __( 'Need a human check (C)', 'trailproof' ),  value: 'C' },
];

const SHOW_OPTIONS = [
	{ label: __( 'Open only', 'trailproof' ),    value: 'open' },
	{ label: __( 'All including addressed', 'trailproof' ), value: 'all' },
];

export default function Worklist( { navigate } ) {
	const [ groups, setGroups ]         = useState( [] );
	const [ loading, setLoading ]       = useState( true );
	const [ bucket, setBucket ]         = useState( '' );
	const [ show, setShow ]             = useState( 'open' );
	const [ expanded, setExpanded ]     = useState( {} );     // { rule_id: bool }
	const [ decisionGroup, setDecisionGroup ] = useState( null );
	const [ decisionIssue, setDecisionIssue ] = useState( null );
	const [ applyModal, setApplyModal ] = useState( null );   // { group | issue, config }
	const [ inputValue, setInputValue ] = useState( '' );
	const [ saving, setSaving ]         = useState( false );
	const [ error, setError ]           = useState( null );
	const [ successMsg, setSuccess ]    = useState( null );
	const [ panelIssueId, setPanelIssueId ] = useState( null );

	const fetchGroups = useCallback( () => {
		setLoading( true );
		const params = new URLSearchParams();
		if ( bucket ) params.set( 'bucket', bucket );
		params.set( 'only_open', show === 'open' ? 'true' : 'false' );
		params.set( 'per_page', '100' );

		apiFetch( { path: `/trailproof/v1/issues/grouped?${ params }` } )
			.then( setGroups )
			.catch( () => setGroups( [] ) )
			.finally( () => setLoading( false ) );
	}, [ bucket, show ] );

	useEffect( () => { fetchGroups(); }, [ fetchGroups ] );

	function toggleExpand( rule_id ) {
		setExpanded( ( prev ) => ( { ...prev, [ rule_id ]: ! prev[ rule_id ] } ) );
	}

	// Mark all instances of a rule_id as fixed in local state
	function markGroupFixed( rule_id ) {
		setGroups( ( prev ) => prev.map( ( g ) =>
			g.rule_id === rule_id
				? { ...g, open_count: 0, regressed_count: 0, fixed_count: g.instance_count }
				: g
		) );
	}

	function markIssueFixed( issue_id, rule_id ) {
		setGroups( ( prev ) => prev.map( ( g ) => {
			if ( g.rule_id !== rule_id ) return g;
			return { ...g, open_count: Math.max( 0, g.open_count - 1 ), fixed_count: g.fixed_count + 1 };
		} ) );
	}

	// Apply fixes for all auto-fixable (non-input-requiring) bucket A groups in one sweep
	async function applyAllFixes() {
		const fixableGroups = groups.filter(
			g => g.bucket === 'A' && g.open_count > 0 && ! RULES_NEEDING_INPUT[ g.rule_id ]
		);
		if ( fixableGroups.length === 0 ) return;
		setSaving( true );
		setError( null );
		setSuccess( null );
		let totalFixed = 0;
		try {
			for ( const group of fixableGroups ) {
				const instances = await apiFetch( {
					path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( group.rule_id ) }&status=open&per_page=200`,
				} );
				for ( const issue of instances ) {
					await apiFetch( {
						path:   `/trailproof/v1/issues/${ issue.id }/decide`,
						method: 'POST',
						data:   { action: 'apply', transform_type: autoTransformType( group.rule_id ), payload: {} },
					} );
					totalFixed++;
				}
				markGroupFixed( group.rule_id );
			}
			setSuccess( `${ totalFixed } ${ __( 'accessibility improvements applied. All changes are reversible.', 'trailproof' ) }` );
		} catch ( err ) {
			setError( err?.message || __( 'Failed to apply some fixes.', 'trailproof' ) );
		} finally {
			setSaving( false );
		}
	}

	async function applyAutoFix( issue ) {
		setSaving( true );
		setError( null );
		try {
			await apiFetch( {
				path:   `/trailproof/v1/issues/${ issue.id }/decide`,
				method: 'POST',
				data:   { action: 'apply', transform_type: autoTransformType( issue.rule_id ), payload: {} },
			} );
			markIssueFixed( issue.id, issue.rule_id );
			setSuccess( `Fix applied to "${ issue.description || issue.rule_id }".` );
		} catch ( err ) {
			setError( err?.message || 'Failed to apply fix.' );
		} finally {
			setSaving( false );
		}
	}

	// Apply the auto-fix to all open instances of a rule_id in one go
	async function applyGroupFix( group ) {
		setSaving( true );
		setError( null );
		setSuccess( null );
		try {
			const instances = await apiFetch( {
				path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( group.rule_id ) }&status=open&per_page=200`,
			} );
			for ( const issue of instances ) {
				await apiFetch( {
					path:   `/trailproof/v1/issues/${ issue.id }/decide`,
					method: 'POST',
					data:   { action: 'apply', transform_type: autoTransformType( group.rule_id ), payload: {} },
				} );
			}
			markGroupFixed( group.rule_id );
			setSuccess( `Fix applied to all ${ instances.length } instances of "${ group.description || group.rule_id }".` );
		} catch ( err ) {
			setError( err?.message || 'Failed to apply fix.' );
		} finally {
			setSaving( false );
		}
	}

	function openApplyModal( groupOrIssue ) {
		const config = RULES_NEEDING_INPUT[ groupOrIssue.rule_id ];
		setInputValue( '' );
		setError( null );
		setApplyModal( { item: groupOrIssue, config } );
	}

	async function submitModal() {
		if ( ! applyModal || ! inputValue.trim() ) {
			setError( 'Please enter a value.' );
			return;
		}
		const { item, config } = applyModal;
		setSaving( true );
		setError( null );
		try {
			const isGroup = 'instance_count' in item;
			const payload = { [ config.field ]: inputValue.trim() };

			if ( isGroup ) {
				const instances = await apiFetch( {
					path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( item.rule_id ) }&status=open&per_page=200`,
				} );
				for ( const issue of instances ) {
					await apiFetch( {
						path:   `/trailproof/v1/issues/${ issue.id }/decide`,
						method: 'POST',
						data:   { action: 'apply', transform_type: config.transform_type, payload },
					} );
				}
				markGroupFixed( item.rule_id );
			} else {
				await apiFetch( {
					path:   `/trailproof/v1/issues/${ item.id }/decide`,
					method: 'POST',
					data:   { action: 'apply', transform_type: config.transform_type, payload },
				} );
				markIssueFixed( item.id, item.rule_id );
			}
			setSuccess( `Fix applied.` );
			setApplyModal( null );
		} catch ( err ) {
			setError( err?.message || 'Failed to apply fix.' );
		} finally {
			setSaving( false );
		}
	}

	function handleDecisionSaved( updatedIssue ) {
		markIssueFixed( updatedIssue.id, updatedIssue.rule_id );
		setDecisionIssue( null );
		setDecisionGroup( null );
	}

	// If a single-issue decision screen is open, render it full-page
	if ( decisionIssue ) {
		return (
			<div>
				<button className="button button-small" onClick={ () => setDecisionIssue( null ) } style={ { marginBottom: 12 } }>
					← Back to worklist
				</button>
				<DecisionScreen issue={ decisionIssue } onDecision={ handleDecisionSaved } onCancel={ () => setDecisionIssue( null ) } />
			</div>
		);
	}

	// If a group "decide" was clicked, show the first open issue's decision screen
	if ( decisionGroup ) {
		return <GroupDecision group={ decisionGroup } onDone={ () => { setDecisionGroup( null ); fetchGroups(); } } />;
	}

	const openCount = groups.filter( ( g ) => g.open_count > 0 ).length;

	return (
		<div>
			{ successMsg && (
				<Notice status="success" isDismissible onRemove={ () => setSuccess( null ) } style={ { marginBottom: 12 } }>
					{ successMsg }
				</Notice>
			) }
			{ error && (
				<Notice status="error" isDismissible onRemove={ () => setError( null ) } style={ { marginBottom: 12 } }>
					{ error }
				</Notice>
			) }

			{/* Quick-fix banner: shown when bucket A auto-fixable issues exist */}
			{ ! loading && (
				<WorklistQuickFixBanner
					groups={ groups }
					onApplyAll={ applyAllFixes }
					saving={ saving }
				/>
			) }

			{ ! loading && openCount === 0 && (
				<p style={ { margin: '0 0 16px', color: '#64748B', fontSize: 13 } }>
					{ __( 'Nothing open — great work! Run a scan to check for new issues.', 'trailproof' ) }
				</p>
			) }

			{ /* Filters */ }
			<div style={ { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' } }>
				<SelectControl
					label={ __( 'Fix type', 'trailproof' ) }
					value={ bucket }
					options={ BUCKET_OPTIONS }
					onChange={ setBucket }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Show', 'trailproof' ) }
					value={ show }
					options={ SHOW_OPTIONS }
					onChange={ setShow }
					__nextHasNoMarginBottom
				/>
			</div>

			{ loading ? (
				<p style={ { color: '#646970' } }>{ __( 'Loading…', 'trailproof' ) }</p>
			) : groups.length === 0 ? (
				<EmptyState show={ show } navigate={ navigate } />
			) : (
				<table className="wp-list-table widefat" style={ { tableLayout: 'auto' } }>
					<thead>
						<tr>
							<th style={ { width: 28 } }></th>
							<th style={ { width: 90 } }>{ __( 'Impact', 'trailproof' ) }</th>
							<th>{ __( 'Improvement', 'trailproof' ) }</th>
							<th style={ { width: 130 } }>{ __( 'Fix type', 'trailproof' ) }</th>
							<th style={ { width: 130 } }>{ __( 'Status', 'trailproof' ) }</th>
							<th style={ { width: 140 } }>{ __( 'Next step', 'trailproof' ) }</th>
						</tr>
					</thead>
					<tbody>
						{ groups.map( ( group ) => (
							<>
								<IssueGroupRow
									key={ group.rule_id }
									group={ group }
									expanded={ !! expanded[ group.rule_id ] }
									onToggle={ () => toggleExpand( group.rule_id ) }
									onApplyGroup={ applyGroupFix }
									onDecide={ setDecisionGroup }
									onApplyModal={ openApplyModal }
									navigate={ navigate }
									saving={ saving }
									onOpenPanel={ setPanelIssueId }
								/>
								{ expanded[ group.rule_id ] && (
									<InstanceSubTable
										key={ `${ group.rule_id }-instances` }
										rule_id={ group.rule_id }
										bucket={ group.bucket }
										onApply={ applyAutoFix }
										onDecide={ setDecisionIssue }
										onApplyModal={ openApplyModal }
										saving={ saving }
										onOpenPanel={ setPanelIssueId }
									/>
								) }
							</>
						) ) }
					</tbody>
				</table>
			) }

			{ /* Issue detail panel */ }
			{ panelIssueId && (
				<IssueDetailPanel
					issueId={ panelIssueId }
					onClose={ () => setPanelIssueId( null ) }
					onAction={ ( issue ) => {
						if ( issue.bucket === 'A' ) {
							if ( RULES_NEEDING_INPUT[ issue.rule_id ] ) {
								openApplyModal( issue );
							} else {
								applyAutoFix( issue );
							}
						} else if ( issue.bucket === 'B' ) {
							setDecisionIssue( issue );
						}
					} }
					navigate={ navigate }
				/>
			) }

			{ /* Modal for fixes that need a text value */ }
			{ applyModal && (
				<Modal
					title={ __( 'Apply improvement', 'trailproof' ) }
					onRequestClose={ () => setApplyModal( null ) }
				>
					<p style={ { fontSize: 13, color: '#50575e', marginTop: 0 } }>
						{ applyModal.item.description || applyModal.item.rule_id }
					</p>
					<TextControl
						label={ applyModal.config.label }
						value={ inputValue }
						onChange={ setInputValue }
						help={ applyModal.config.help }
						autoFocus
					/>
					{ error && <Notice status="error" isDismissible={ false }>{ error }</Notice> }
					<div style={ { display: 'flex', gap: 8, marginTop: 12 } }>
						<Button variant="primary" onClick={ submitModal } disabled={ saving }>
							{ saving ? __( 'Applying…', 'trailproof' ) : __( 'Apply improvement', 'trailproof' ) }
						</Button>
						<Button variant="secondary" onClick={ () => setApplyModal( null ) } disabled={ saving }>
							{ __( 'Cancel', 'trailproof' ) }
						</Button>
					</div>
					<p style={ { fontSize: 11, color: '#646970', marginTop: 12 } }>
						{ __( 'This improvement is applied at render time and does not change your saved content. You can undo it anytime.', 'trailproof' ) }
					</p>
				</Modal>
			) }
		</div>
	);
}

function EmptyState( { show, navigate } ) {
	if ( show === 'open' ) {
		return (
			<div style={ { padding: '2rem', textAlign: 'center', background: '#f6f8fa', border: '1px dashed #c3c4c7', borderRadius: 4 } }>
				<p style={ { fontWeight: 600, color: '#1a7f37', marginBottom: 8 } }>
					{ __( '✓ No open issues.', 'trailproof' ) }
				</p>
				<p style={ { color: '#50575e', fontSize: 13 } }>
					{ __( 'Run a scan to check whether anything has regressed.', 'trailproof' ) }
				</p>
				<button className="button" onClick={ () => navigate( 'scan' ) }>
					{ __( 'Run a scan →', 'trailproof' ) }
				</button>
			</div>
		);
	}
	return (
		<p style={ { color: '#646970' } }>
			{ __( 'No issues found. Run a scan to populate the worklist.', 'trailproof' ) }
		</p>
	);
}

/** Lightweight sequential decision flow for a full group of Bucket B issues */
function GroupDecision( { group, onDone } ) {
	const [ issues, setIssues ]   = useState( [] );
	const [ index, setIndex ]     = useState( 0 );
	const [ loading, setLoading ] = useState( true );

	useEffect( () => {
		apiFetch( { path: `/trailproof/v1/issues?rule_id=${ encodeURIComponent( group.rule_id ) }&status=open&per_page=100` } )
			.then( setIssues )
			.catch( () => setIssues( [] ) )
			.finally( () => setLoading( false ) );
	}, [ group.rule_id ] );

	if ( loading ) return <p>{ __( 'Loading…', 'trailproof' ) }</p>;
	if ( issues.length === 0 ) {
		onDone();
		return null;
	}

	const current = issues[ index ];
	const total   = issues.length;

	function handleDecision( updated ) {
		if ( index + 1 < total ) {
			setIndex( index + 1 );
		} else {
			onDone();
		}
	}

	return (
		<div>
			<div style={ { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } }>
				<button className="button button-small" onClick={ onDone }>← Back to worklist</button>
				<span style={ { fontSize: 13, color: '#646970' } }>
					{ `Deciding ${ index + 1 } of ${ total }: ${ group.description || group.rule_id }` }
				</span>
				{ current?.url && (
					<span style={ { fontSize: 12, color: '#8c959f' } }>
						{ ' — ' }
						{ ( () => { try { return new URL( current.url ).pathname; } catch { return current.url; } } )() }
					</span>
				) }
			</div>
			<DecisionScreen
				issue={ current }
				onDecision={ handleDecision }
				onCancel={ onDone }
			/>
		</div>
	);
}

function autoTransformType( ruleId ) {
	const map = {
		'html-has-lang':              'set_lang',
		'bypass':                     'inject_skiplink',
		'landmark-one-main':          'add_landmark',
		'landmark-main-is-top-level': 'add_landmark',
		'region':                     'add_landmark',
		'image-alt':                  'set_alt_empty_decorative',
		'input-image-alt':            'set_alt_empty_decorative',
		'area-alt':                   'set_alt_empty_decorative',
		'divi-accordion':             'widget_aria_pattern',
		'divi-tabs':                  'widget_aria_pattern',
		'divi-toggle':                'widget_aria_pattern',
		'divi-menu':                  'widget_aria_pattern',
		'divi-gallery':               'widget_aria_pattern',
	};
	return map[ ruleId ] || 'add_aria_label';
}
